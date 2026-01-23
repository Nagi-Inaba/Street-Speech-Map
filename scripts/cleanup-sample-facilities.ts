/**
 * サンプル施設データ削除スクリプト
 * データベース内のサンプル施設データを削除します
 * 
 * 使用方法:
 * npm run cleanup:sample-facilities
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("サンプル施設データの削除を開始します...");

  // sourceに「サンプル」または「サンプルデータ」が含まれる施設を検索
  const sampleFacilities = await prisma.facility.findMany({
    where: {
      OR: [
        { source: { contains: "サンプル" } },
        { source: { contains: "サンプルデータ" } },
      ],
    },
  });

  console.log(`\n削除対象の施設: ${sampleFacilities.length}件`);

  if (sampleFacilities.length === 0) {
    console.log("削除対象の施設データはありません。");
    return;
  }

  // カテゴリ別の件数を表示
  const byCategory = sampleFacilities.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\nカテゴリ別の件数:");
  for (const [category, count] of Object.entries(byCategory)) {
    console.log(`  - ${category}: ${count}件`);
  }

  // 削除実行
  const result = await prisma.facility.deleteMany({
    where: {
      OR: [
        { source: { contains: "サンプル" } },
        { source: { contains: "サンプルデータ" } },
      ],
    },
  });

  console.log(`\n${result.count}件のサンプル施設データを削除しました。`);
}

main()
  .catch((e) => {
    console.error("エラーが発生しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

