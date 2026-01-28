/**
 * OGP画像を事前生成するスクリプト
 * すべてのイベント、候補者、トップページ、エリアページのOGP画像を生成
 */

import { prisma } from "../lib/db";
import {
  generateEventOgImage,
  generateCandidateOgImage,
  generateHomeOgImage,
  generateAreaOgImage,
} from "../lib/og-image-generator";

async function main() {
  console.log("OGP画像の事前生成を開始します...");

  try {
    // トップページのOGP画像を生成
    console.log("トップページのOGP画像を生成中...");
    await generateHomeOgImage();
    console.log("✓ トップページのOGP画像を生成しました");

    // エリアページのOGP画像を生成
    console.log("エリアページのOGP画像を生成中...");
    await generateAreaOgImage();
    console.log("✓ エリアページのOGP画像を生成しました");

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
        console.log(`✓ ${candidate.name}のOGP画像を生成しました`);
      } catch (error) {
        console.error(`✗ ${candidate.name}のOGP画像生成に失敗:`, error);
      }
    }

    // すべてのイベントを取得
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
        console.log(`✓ イベント ${event.id} のOGP画像を生成しました`);
      } catch (error) {
        console.error(`✗ イベント ${event.id} のOGP画像生成に失敗:`, error);
      }
    }

    console.log("\nすべてのOGP画像の生成が完了しました！");
  } catch (error) {
    console.error("OGP画像生成中にエラーが発生しました:", error);
    console.error("エラーが発生しましたが、ビルドは続行します。");
    // ビルド時にエラーが発生してもビルドを続行できるように、exit code 0を返す
    process.exit(0);
  } finally {
    await prisma.$disconnect();
  }
}

main();
