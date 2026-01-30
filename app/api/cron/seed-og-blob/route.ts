import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasBlobToken } from "@/lib/og-blob";
import {
  generateEventOgImage,
  generateCandidateOgImage,
  generateHomeOgImage,
  generateAreaOgImage,
} from "@/lib/og-image-generator";

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
 * 初回Blob初期化用: 全OGP画像を新規作成してBlobに上書き保存する
 * 通常運用では不要。イベントの作成・更新・削除時に該当OGPだけ自動で再生成される。
 * 初回Blob導入時や一括差し替えなど、特別なときのみ手動で1回呼ぶ（CRON_SECRET必須）。
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
    console.log("[seed-og-blob] 全OGP画像をBlobに上書き保存します...");

    let home = false;
    let area = false;
    const candidates: Array<{ slug: string; success: boolean }> = [];
    const events: Array<{ id: string; success: boolean }> = [];

    try {
      await generateHomeOgImage();
      home = true;
      console.log("[seed-og-blob] ✓ home");
    } catch (e) {
      console.error("[seed-og-blob] ✗ home:", e);
    }

    try {
      await generateAreaOgImage();
      area = true;
      console.log("[seed-og-blob] ✓ area");
    } catch (e) {
      console.error("[seed-og-blob] ✗ area:", e);
    }

    const candidateList = await prisma.candidate.findMany({
      include: {
        events: {
          where: { status: { in: ["PLANNED", "LIVE"] } },
          orderBy: [{ status: "asc" }, { startAt: "asc" }],
        },
      },
    });

    for (const c of candidateList) {
      try {
        await generateCandidateOgImage(c);
        candidates.push({ slug: c.slug, success: true });
      } catch (e) {
        console.error("[seed-og-blob] ✗ candidate", c.slug, e);
        candidates.push({ slug: c.slug, success: false });
      }
    }

    const eventList = await prisma.speechEvent.findMany({
      include: { candidate: true },
      where: { status: { in: ["PLANNED", "LIVE"] } },
    });

    for (const e of eventList) {
      try {
        await generateEventOgImage(e);
        events.push({ id: e.id, success: true });
      } catch (err) {
        console.error("[seed-og-blob] ✗ event", e.id, err);
        events.push({ id: e.id, success: false });
      }
    }

    const ok = (home ? 1 : 0) + (area ? 1 : 0) + candidates.filter((c) => c.success).length + events.filter((e) => e.success).length;
    const total = 2 + candidates.length + events.length;
    console.log("[seed-og-blob] 完了:", ok, "/", total);

    return NextResponse.json({
      success: true,
      message: `OGP Blob seed done (${ok}/${total})`,
      home,
      area,
      candidates: candidates.length,
      candidatesOk: candidates.filter((c) => c.success).length,
      events: events.length,
      eventsOk: events.filter((e) => e.success).length,
    });
  } catch (error) {
    console.error("[seed-og-blob] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
