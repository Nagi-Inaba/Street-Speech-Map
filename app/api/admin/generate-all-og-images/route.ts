import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import {
  generateEventOgImage,
  generateCandidateOgImage,
  generateHomeOgImage,
  generateAreaOgImage,
} from "@/lib/og-image-generator";

/**
 * すべてのOGP画像を強制的に再生成し、Blobに上書き保存するAPI
 * 初回デプロイ後やBlob初期化時に1回呼び出し（home / area / 全候補者 / 全イベント）
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("全OGP画像の強制生成を開始します...");

    const results = {
      home: false,
      area: false,
      candidates: [] as Array<{ slug: string; success: boolean; error?: string }>,
      events: [] as Array<{ id: string; success: boolean; error?: string }>,
    };

    // トップページのOGP画像を生成
    try {
      await generateHomeOgImage();
      results.home = true;
      console.log("✓ トップページのOGP画像を生成しました");
    } catch (error) {
      console.error("✗ トップページのOGP画像生成に失敗:", error);
      results.home = false;
    }

    // エリアページのOGP画像を生成
    try {
      await generateAreaOgImage();
      results.area = true;
      console.log("✓ エリアページのOGP画像を生成しました");
    } catch (error) {
      console.error("✗ エリアページのOGP画像生成に失敗:", error);
      results.area = false;
    }

    // すべての候補者を取得
    const candidates = await prisma.candidate.findMany({
      include: {
        events: {
          where: {
            status: {
              in: ["PLANNED", "LIVE"],
            },
          },
          orderBy: [
            { status: "asc" },
            { startAt: "asc" },
          ],
        },
      },
    });

    // 各候補者のOGP画像を生成
    console.log(`${candidates.length}件の候補者のOGP画像を生成中...`);
    for (const candidate of candidates) {
      try {
        await generateCandidateOgImage(candidate);
        results.candidates.push({ slug: candidate.slug, success: true });
        console.log(`✓ ${candidate.name}のOGP画像を生成しました`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.candidates.push({ slug: candidate.slug, success: false, error: errorMessage });
        console.error(`✗ ${candidate.name}のOGP画像生成に失敗:`, error);
      }
    }

    // すべてのイベントを取得（PLANNEDとLIVEのみ）
    const events = await prisma.speechEvent.findMany({
      include: {
        candidate: true,
      },
      where: {
        status: {
          in: ["PLANNED", "LIVE"],
        },
      },
    });

    // 各イベントのOGP画像を生成
    console.log(`${events.length}件のイベントのOGP画像を生成中...`);
    for (const event of events) {
      try {
        await generateEventOgImage(event);
        results.events.push({ id: event.id, success: true });
        console.log(`✓ イベント ${event.id} のOGP画像を生成しました`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.events.push({ id: event.id, success: false, error: errorMessage });
        console.error(`✗ イベント ${event.id} のOGP画像生成に失敗:`, error);
      }
    }

    const successCount =
      (results.home ? 1 : 0) +
      (results.area ? 1 : 0) +
      results.candidates.filter((c) => c.success).length +
      results.events.filter((e) => e.success).length;
    const totalCount = 2 + candidates.length + events.length;

    console.log(`\n全OGP画像の生成が完了しました！ (${successCount}/${totalCount}件成功)`);

    return NextResponse.json({
      success: true,
      message: `OGP画像の生成が完了しました (${successCount}/${totalCount}件成功)`,
      results,
    });
  } catch (error) {
    console.error("OGP画像生成中にエラーが発生しました:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
