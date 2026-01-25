import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { generateMoveHints } from "@/lib/move-hint";

// リクエスト一覧取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";
  const groupByEvent = searchParams.get("groupByEvent") === "true";

  try {
    const requests = await prisma.publicRequest.findMany({
      where: {
        ...(candidateId && { candidateId }),
        ...(status && { status }),
        // eventIdがあるリクエストのみ（REPORT_START, REPORT_END, REPORT_MOVE, REPORT_TIME_CHANGE）
        ...(groupByEvent && {
          eventId: { not: null },
          type: {
            in: ["REPORT_START", "REPORT_END", "REPORT_MOVE", "REPORT_TIME_CHANGE"],
          },
        }),
      },
      include: {
        candidate: true,
      },
      orderBy: {
        [sort]: order,
      },
      take: 1000,
    });

    // eventIdでグループ化する場合
    if (groupByEvent) {
      // eventIdでグループ化
      const groupedByEvent = new Map<string, typeof requests>();
      for (const req of requests) {
        if (req.eventId) {
          if (!groupedByEvent.has(req.eventId)) {
            groupedByEvent.set(req.eventId, []);
          }
          groupedByEvent.get(req.eventId)!.push(req);
        }
      }

      // PublicReportも取得（演説中・演説終了の報告）
      // 候補者フィルターがある場合、その候補者のイベントのみを取得
      let eventFilter: any = {};
      if (candidateId) {
        eventFilter.candidateId = candidateId;
      }

      // すべてのイベント（候補者フィルター適用）を取得してPublicReportを含める
      const eventsWithReports = await prisma.speechEvent.findMany({
        where: {
          ...eventFilter,
        },
        include: {
          candidate: true,
          reports: {
            where: {
              kind: {
                in: ["start", "end", "move"], // "check"は除外
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 100, // 最新100件まで
          },
        },
      });

      // PublicReportをPublicRequest形式に変換
      // statusフィルターが指定されている場合、APPROVEDのPublicReportは除外
      const reportRequests: typeof requests = [];
      eventsWithReports.forEach((event) => {
        event.reports.forEach((report) => {
          // kind: "start" -> type: "REPORT_START"
          // kind: "end" -> type: "REPORT_END"
          // kind: "move" -> type: "REPORT_MOVE"
          let requestType = "";
          if (report.kind === "start") requestType = "REPORT_START";
          else if (report.kind === "end") requestType = "REPORT_END";
          else if (report.kind === "move") requestType = "REPORT_MOVE";
          else return; // "check"はスキップ

          // statusフィルターが指定されている場合、フィルターに一致するもののみを含める
          // PublicReportは常にAPPROVEDなので、status=PENDINGやstatus=REJECTEDの場合は除外
          // statusが空文字列（すべて）の場合は含める
          if (status && status !== "" && status !== "APPROVED") {
            return;
          }

          // PublicRequest形式に変換
          reportRequests.push({
            id: `report_${report.id}`,
            type: requestType,
            status: "APPROVED", // PublicReportは既に処理済み
            candidateId: event.candidateId,
            candidate: event.candidate,
            eventId: event.id,
            rivalEventId: null,
            payload: JSON.stringify({
              lat: report.lat,
              lng: report.lng,
            }),
            dedupeKey: null,
            createdAt: report.createdAt,
            reviewedAt: null,
            reviewedByUserId: null,
          } as typeof requests[0]);
        });
      });

      // すべてのリクエストを統合
      const allRequests = [...requests, ...reportRequests];

      // eventIdで再グループ化
      const allGroupedByEvent = new Map<string, typeof allRequests>();
      for (const req of allRequests) {
        if (req.eventId) {
          if (!allGroupedByEvent.has(req.eventId)) {
            allGroupedByEvent.set(req.eventId, []);
          }
          allGroupedByEvent.get(req.eventId)!.push(req);
        }
      }

      // すべてのイベントIDを取得
      const allEventIdsSet = new Set<string>();
      allRequests.forEach((req) => {
        if (req.eventId) allEventIdsSet.add(req.eventId);
      });
      eventsWithReports.forEach((event) => {
        if (event.reports.length > 0) {
          allEventIdsSet.add(event.id);
        }
      });

      // イベント情報を取得
      const events = await prisma.speechEvent.findMany({
        where: {
          ...eventFilter,
          ...(allEventIdsSet.size > 0 && { id: { in: Array.from(allEventIdsSet) } }),
        },
        include: {
          candidate: true,
        },
      });

      // イベントごとにリクエストをまとめる
      const result = events.map((event) => {
        const eventRequests = allGroupedByEvent.get(event.id) || [];
        // リクエストタイプごとにグループ化
        const requestsByType = {
          REPORT_START: eventRequests.filter((r) => r.type === "REPORT_START"),
          REPORT_END: eventRequests.filter((r) => r.type === "REPORT_END"),
          REPORT_MOVE: eventRequests.filter((r) => r.type === "REPORT_MOVE"),
          REPORT_TIME_CHANGE: eventRequests.filter((r) => r.type === "REPORT_TIME_CHANGE"),
        };

        return {
          event: {
            id: event.id,
            locationText: event.locationText,
            startAt: event.startAt,
            endAt: event.endAt,
            status: event.status,
            candidate: event.candidate,
          },
          requests: eventRequests,
          requestsByType,
        };
      });

      return NextResponse.json(result);
    }

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 一括承認・却下
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // リクエストを更新
    const updateResult = await prisma.publicRequest.updateMany({
      where: {
        id: { in: ids },
        status: "PENDING",
      },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    });

    // 更新された件数を確認
    if (updateResult.count === 0) {
      // 更新された件数が0の場合、既に処理済みまたは存在しないリクエストの可能性
      // リクエストの現在の状態を確認
      const existingRequests = await prisma.publicRequest.findMany({
        where: {
          id: { in: ids },
        },
        select: {
          id: true,
          status: true,
        },
      });

      const notFoundIds = ids.filter(
        (id) => !existingRequests.some((r) => r.id === id)
      );
      const alreadyProcessedIds = existingRequests
        .filter((r) => r.status !== "PENDING")
        .map((r) => r.id);

      if (notFoundIds.length > 0 || alreadyProcessedIds.length > 0) {
        return NextResponse.json(
          {
            error: "一部のリクエストは処理できませんでした",
            details: {
              notFound: notFoundIds,
              alreadyProcessed: alreadyProcessedIds,
              updatedCount: updateResult.count,
            },
          },
          { status: 400 }
        );
      }
    }

    // 承認されたリクエストを処理
    if (action === "approve") {
      const approvedRequests = await prisma.publicRequest.findMany({
        where: {
          id: { in: ids },
          status: "APPROVED",
        },
      });

      for (const req of approvedRequests) {
        // CREATE_EVENTの場合、新しい演説予定を作成
        if (req.type === "CREATE_EVENT" && req.candidateId) {
          const payload = JSON.parse(req.payload);
          await prisma.speechEvent.create({
            data: {
              candidateId: req.candidateId,
              status: "PLANNED",
              startAt: payload.startAt ? new Date(payload.startAt) : null,
              endAt: payload.endAt ? new Date(payload.endAt) : null,
              timeUnknown: payload.timeUnknown || false,
              locationText: payload.locationText,
              lat: payload.lat,
              lng: payload.lng,
            },
          });
        }

        // REPORT_STARTの場合、ステータスをLIVEに更新
        if (req.type === "REPORT_START" && req.eventId) {
          await prisma.speechEvent.update({
            where: { id: req.eventId },
            data: { status: "LIVE" },
          });
        }

        // REPORT_ENDの場合、ステータスをENDEDに更新
        if (req.type === "REPORT_END" && req.eventId) {
          await prisma.speechEvent.update({
            where: { id: req.eventId },
            data: { status: "ENDED" },
          });
        }

        // REPORT_MOVEの場合、場所を更新
        if (req.type === "REPORT_MOVE" && req.eventId) {
          const payload = JSON.parse(req.payload);
          const event = await prisma.speechEvent.findUnique({
            where: { id: req.eventId },
          });

          if (event) {
            // 変更履歴を記録
            await prisma.eventHistory.create({
              data: {
                eventId: req.eventId,
                fromLat: event.lat,
                fromLng: event.lng,
                fromText: event.locationText,
                fromStartAt: event.startAt,
                fromEndAt: event.endAt,
                toLat: payload.newLat,
                toLng: payload.newLng,
                toText: event.locationText, // 場所テキストは変更しない（管理画面で手動更新）
                toStartAt: event.startAt,
                toEndAt: event.endAt,
                reason: "場所変更報告の承認",
                changedByUserId: session.user.id,
              },
            });

            // 場所を更新
            await prisma.speechEvent.update({
              where: { id: req.eventId },
              data: {
                lat: payload.newLat,
                lng: payload.newLng,
              },
            });

            // MoveHintを生成
            await generateMoveHints(req.eventId);
          }
        }

        // REPORT_TIME_CHANGEの場合、時間を更新
        if (req.type === "REPORT_TIME_CHANGE" && req.eventId) {
          const payload = JSON.parse(req.payload);
          const event = await prisma.speechEvent.findUnique({
            where: { id: req.eventId },
          });

          if (event) {
            // 変更履歴を記録
            await prisma.eventHistory.create({
              data: {
                eventId: req.eventId,
                fromLat: event.lat,
                fromLng: event.lng,
                fromText: event.locationText,
                fromStartAt: event.startAt,
                fromEndAt: event.endAt,
                toLat: event.lat,
                toLng: event.lng,
                toText: event.locationText,
                toStartAt: payload.newStartAt ? new Date(payload.newStartAt) : null,
                toEndAt: payload.newEndAt ? new Date(payload.newEndAt) : null,
                reason: "時間変更報告の承認",
                changedByUserId: session.user.id,
              },
            });

            // 時間を更新
            await prisma.speechEvent.update({
              where: { id: req.eventId },
              data: {
                startAt: payload.newStartAt ? new Date(payload.newStartAt) : null,
                endAt: payload.newEndAt ? new Date(payload.newEndAt) : null,
                timeUnknown: !payload.newStartAt && !payload.newEndAt,
              },
            });
          }
        }
      }
    }

    // 同じdedupeKeyを持つ他のリクエストを重複としてマーク
    if (action === "approve") {
      const approvedRequests = await prisma.publicRequest.findMany({
        where: {
          id: { in: ids },
          status: "APPROVED",
          dedupeKey: { not: null },
        },
        select: { dedupeKey: true },
      });

      const dedupeKeys = approvedRequests
        .map((r) => r.dedupeKey)
        .filter((key): key is string => key !== null);

      if (dedupeKeys.length > 0) {
        await prisma.publicRequest.updateMany({
          where: {
            dedupeKey: { in: dedupeKeys },
            id: { notIn: ids },
            status: "PENDING",
          },
          data: {
            status: "DUPLICATE",
            reviewedAt: new Date(),
            reviewedByUserId: session.user.id,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
    });
  } catch (error) {
    console.error("Error processing requests:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: "リクエストの処理中にエラーが発生しました", details: errorMessage },
      { status: 500 }
    );
  }
}
