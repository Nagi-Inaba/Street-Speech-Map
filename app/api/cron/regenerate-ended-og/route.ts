import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasBlobToken } from "@/lib/og-blob";
import { generateEventOgImage } from "@/lib/og-image-generator";

function isAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV === "development") {
    const authHeader = request.headers.get("authorization");
    return authHeader === `Bearer ${process.env.CRON_SECRET || "dev-secret"}`;
  }
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }
  console.warn("[Cron] CRON_SECRET is not set. This is insecure in production.");
  return true;
}

/**
 * 1時間ごとのCron用: 終了(ENDED)の演説OGPだけを文字ベースに差し替え、Blob容量を節約する
 * デプロイ時は何もしない。Vercel Cronで毎時呼ばれる（vercel.json の crons で設定）
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasBlobToken()) {
    return NextResponse.json(
      { success: true, message: "Blob not configured, skip", skipped: true },
      { status: 200 }
    );
  }

  try {
    const events = await prisma.speechEvent.findMany({
      where: { status: "ENDED" },
      include: { candidate: true },
    });

    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No ENDED events",
        total: 0,
        ok: 0,
      });
    }

    let successCount = 0;
    for (const event of events) {
      try {
        await generateEventOgImage(event);
        successCount += 1;
      } catch (err) {
        console.error("[regenerate-ended-og] event", event.id, err);
      }
    }

    console.log("[regenerate-ended-og] done:", successCount, "/", events.length);
    return NextResponse.json({
      success: true,
      message: `ENDED OGP regenerated (${successCount}/${events.length})`,
      total: events.length,
      ok: successCount,
    });
  } catch (error) {
    console.error("[regenerate-ended-og] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
