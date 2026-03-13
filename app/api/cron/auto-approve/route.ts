import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const MAX_BATCH_SIZE = 500;

function hasValidCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (process.env.NODE_ENV === "development") {
    if (!cronSecret) return true;
    return authHeader === `Bearer ${cronSecret}`;
  }

  // Production is fail-closed to prevent public abuse.
  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET is not set in production. Rejecting request.");
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * 自動承認バッチ処理
 *
 * NOTE: このCronは現在 REPORT_START / REPORT_END タイプの PublicRequest を対象としている。
 * しかし、実際の開始/終了報告は /api/public/reports (PublicReport テーブル) に直接書き込まれるため、
 * このルートは現状では処理対象レコードが発生しない（レガシー/将来用途）。
 * 将来的に PublicRequest 経由の報告フローを復活させる場合に備えて残している。
 */
export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // REPORT_START/REPORT_END の PENDING のみを対象にし、1回あたりの処理量を制限
    const pendingRequests = await prisma.publicRequest.findMany({
      where: {
        type: { in: ["REPORT_START", "REPORT_END"] },
        status: "PENDING",
        eventId: { not: null },
      },
      select: {
        id: true,
        eventId: true,
        type: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: MAX_BATCH_SIZE,
    });

    if (pendingRequests.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        approved: 0,
        errors: 0,
      });
    }

    const eventIds = Array.from(
      new Set(
        pendingRequests
          .map((req) => req.eventId)
          .filter((eventId): eventId is string => Boolean(eventId))
      )
    );

    // N+1回避: 報告件数は eventId/kind 単位で一括集計
    const groupedReports = await prisma.publicReport.groupBy({
      by: ["eventId", "kind"],
      where: {
        eventId: { in: eventIds },
        kind: { in: ["start", "end"] },
      },
      _count: {
        _all: true,
      },
    });

    const reportCountMap = new Map<string, number>();
    for (const row of groupedReports) {
      reportCountMap.set(`${row.eventId}:${row.kind}`, row._count._all);
    }

    const approvalRules = new Map<
      string,
      { canStart: boolean; canEnd: boolean; startCount: number; endCount: number }
    >();
    for (const eventId of eventIds) {
      const startCount = reportCountMap.get(`${eventId}:start`) ?? 0;
      const endCount = reportCountMap.get(`${eventId}:end`) ?? 0;
      approvalRules.set(eventId, {
        canStart: startCount >= 2,
        canEnd: endCount >= 2,
        startCount,
        endCount,
      });
    }

    const approvableCandidates = pendingRequests.filter((req) => {
      if (!req.eventId) return false;
      const rule = approvalRules.get(req.eventId);
      if (!rule) return false;
      return req.type === "REPORT_START" ? rule.canStart : rule.canEnd;
    });

    if (approvableCandidates.length === 0) {
      return NextResponse.json({
        success: true,
        processed: pendingRequests.length,
        approved: 0,
        errors: 0,
        batchLimit: MAX_BATCH_SIZE,
      });
    }

    const approvableEventIds = Array.from(
      new Set(
        approvableCandidates
          .map((req) => req.eventId)
          .filter((eventId): eventId is string => Boolean(eventId))
      )
    );

    const eventActions = new Map<string, { approveStart: boolean; approveEnd: boolean }>();
    for (const req of approvableCandidates) {
      if (!req.eventId) continue;
      const current = eventActions.get(req.eventId) ?? { approveStart: false, approveEnd: false };
      if (req.type === "REPORT_START") current.approveStart = true;
      if (req.type === "REPORT_END") current.approveEnd = true;
      eventActions.set(req.eventId, current);
    }

    const events = await prisma.speechEvent.findMany({
      where: { id: { in: approvableEventIds } },
      select: {
        id: true,
        status: true,
        lat: true,
        lng: true,
        locationText: true,
        startAt: true,
        endAt: true,
      },
    });

    const eventMap = new Map(events.map((event) => [event.id, event]));
    const now = new Date();
    let errorCount = 0;

    const approvedRequestIds: string[] = [];
    const historyRows: Array<{
      eventId: string;
      fromLat: number;
      fromLng: number;
      fromText: string;
      fromStartAt: Date | null;
      fromEndAt: Date | null;
      toLat: number;
      toLng: number;
      toText: string;
      toStartAt: Date | null;
      toEndAt: Date | null;
      reason: string;
    }> = [];
    const statusUpdates: Array<{ id: string; status: string }> = [];

    for (const req of approvableCandidates) {
      if (!req.eventId || !eventMap.has(req.eventId)) {
        console.error(`[Cron] Event not found: ${req.eventId}`);
        errorCount++;
        continue;
      }
      approvedRequestIds.push(req.id);
    }

    for (const eventId of approvableEventIds) {
      const event = eventMap.get(eventId);
      const rule = approvalRules.get(eventId);
      const action = eventActions.get(eventId);
      if (!event || !rule || !action) continue;

      let nextStatus = event.status;

      if (action.approveStart && rule.canStart && nextStatus === "PLANNED") {
        historyRows.push({
          eventId,
          fromLat: event.lat,
          fromLng: event.lng,
          fromText: event.locationText,
          fromStartAt: event.startAt,
          fromEndAt: event.endAt,
          toLat: event.lat,
          toLng: event.lng,
          toText: event.locationText,
          toStartAt: event.startAt,
          toEndAt: event.endAt,
          reason: `自動承認: ${rule.startCount}件の開始報告により`,
        });
        nextStatus = "LIVE";
      }

      if (action.approveEnd && rule.canEnd && (nextStatus === "PLANNED" || nextStatus === "LIVE")) {
        historyRows.push({
          eventId,
          fromLat: event.lat,
          fromLng: event.lng,
          fromText: event.locationText,
          fromStartAt: event.startAt,
          fromEndAt: event.endAt,
          toLat: event.lat,
          toLng: event.lng,
          toText: event.locationText,
          toStartAt: event.startAt,
          toEndAt: event.endAt,
          reason: `自動承認: ${rule.endCount}件の終了報告により`,
        });
        nextStatus = "ENDED";
      }

      if (nextStatus !== event.status) {
        statusUpdates.push({ id: eventId, status: nextStatus });
      }
    }

    if (approvedRequestIds.length > 0) {
      await prisma.$transaction([
        ...(historyRows.length > 0 ? [prisma.eventHistory.createMany({ data: historyRows })] : []),
        ...statusUpdates.map((update) =>
          prisma.speechEvent.update({
            where: { id: update.id },
            data: { status: update.status },
          })
        ),
        prisma.publicRequest.updateMany({
          where: { id: { in: approvedRequestIds } },
          data: {
            status: "APPROVED",
            reviewedAt: now,
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      processed: pendingRequests.length,
      approved: approvedRequestIds.length,
      errors: errorCount,
      batchLimit: MAX_BATCH_SIZE,
    });
  } catch (error) {
    console.error("[Cron] Error in auto-approve:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
