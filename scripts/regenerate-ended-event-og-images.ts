/**
 * 終了した演説(ENDED)のOGP画像だけを文字ベースに再生成し、Blob容量を減らすスクリプト
 * ターミナルから: npm run regenerate:ended-og
 * 要: .env に DATABASE_URL と BLOB_READ_WRITE_TOKEN
 */

import { prisma } from "../lib/db";
import { generateEventOgImage } from "../lib/og-image-generator";
import { hasBlobToken } from "../lib/og-blob";

async function main() {
  if (!hasBlobToken()) {
    console.warn("BLOB_READ_WRITE_TOKEN が未設定です。Blobには保存されません（ローカルファイルのみ）。");
  }

  const events = await prisma.speechEvent.findMany({
    where: { status: "ENDED" },
    include: { candidate: true },
  });

  if (events.length === 0) {
    console.log("終了(ENDED)の演説は0件でした。");
    await prisma.$disconnect();
    return;
  }

  console.log(`終了した演説 ${events.length} 件のOGP画像を文字ベースに再生成します...`);

  let ok = 0;
  for (const event of events) {
    try {
      await generateEventOgImage(event);
      ok += 1;
      console.log(`  ✓ ${event.candidate.name} / ${event.locationText} (${event.id})`);
    } catch (error) {
      console.error(`  ✗ ${event.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`\n完了: ${ok}/${events.length} 件を再生成しました。`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
