import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function hasValidCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (process.env.NODE_ENV === "development") {
    if (!cronSecret) return true;
    return authHeader === `Bearer ${cronSecret}`;
  }

  // Production is fail-closed to prevent public abuse.
  if (!cronSecret) {
    console.error(
      "[Cron] CRON_SECRET is not set in production. Rejecting request."
    );
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * 自動終了バッチ処理
 *
 * 予定終了時刻から15分経過した PLANNED/LIVE イベントを自動的に ENDED にする。
 * Vercel Cron で毎分実行されることを想定。
 *
 * ロジック:
 * - endAt が設定されている & endAt + 15分 < 現在時刻 → ENDED
 * - timeUnknown の場合はスキップ（手動で終了する必要あり）
 */
export async function GET(request: NextRequest) {
  if (!hasValidCronAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // 15分前の時刻を計算（endAt がこの時刻より前のイベントが対象）
    const cutoffTime = new Date(now.getTime() - 15 * 60 * 1000);

    // 終了時刻から15分経過した PLANNED/LIVE のイベントを取得
    const expiredEvents = await prisma.speechEvent.findMany({
      where: {
        status: { in: ["PLANNED", "LIVE"] },
        endAt: {
          not: null,
          lte: cutoffTime,
        },
        timeUnknown: false,
      },
      select: {
        id: true,
        status: true,
        lat: true,
        lng: true,
        locationText: true,
        startAt: true,
        endAt: true,
      },
      take: 200, // バッチサイズ制限
    });

    if (expiredEvents.length === 0) {
      return NextResponse.json({
        success: true,
        ended: 0,
        message: "No events to auto-end",
      });
    }

    // 一括でトランザクション処理
    const historyRows = expiredEvents.map((event) => ({
      eventId: event.id,
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
      reason: `自動終了: 予定終了時刻から15分経過`,
    }));

    await prisma.$transaction([
      // 履歴レコードを一括作成
      prisma.eventHistory.createMany({ data: historyRows }),
      // ステータスを一括更新
      prisma.speechEvent.updateMany({
        where: {
          id: { in: expiredEvents.map((e) => e.id) },
        },
        data: {
          status: "ENDED",
        },
      }),
    ]);

    console.log(
      `[Cron/auto-end] Ended ${expiredEvents.length} events: ${expiredEvents.map((e) => e.id).join(", ")}`
    );

    return NextResponse.json({
      success: true,
      ended: expiredEvents.length,
      eventIds: expiredEvents.map((e) => e.id),
    });
  } catch (error) {
    console.error("[Cron/auto-end] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
