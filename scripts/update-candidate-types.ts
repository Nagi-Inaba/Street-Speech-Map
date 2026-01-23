/**
 * 既存の候補者データにtypeとprefectureを設定するスクリプト
 * 既存データを更新してから、スキーマのtypeを必須に変更してください
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("既存の候補者データを更新します...");

  // 既存の候補者を取得（typeが空文字列またはnullのもの）
  const allCandidates = await prisma.candidate.findMany();
  const candidates = allCandidates.filter((c) => !c.type || c.type === "");

  console.log(`更新対象: ${candidates.length}件`);

  for (const candidate of candidates) {
    // 既存のregionフィールドから都道府県を推測
    // regionが都道府県名を含む場合は小選挙区と判断
    const prefectureMatch = candidate.region?.match(/(都|道|府|県)/);
    
    if (prefectureMatch) {
      // 都道府県が含まれている場合は小選挙区と判断
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          type: "SINGLE",
          prefecture: candidate.region,
        },
      });
      console.log(`✓ ${candidate.name}: 小選挙区 (${candidate.region})`);
    } else {
      // それ以外は比例と判断（デフォルト）
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: {
          type: "PROPORTIONAL",
        },
      });
      console.log(`✓ ${candidate.name}: 比例`);
    }
  }

  console.log("\n更新が完了しました！");
  console.log("次に、prisma/schema.prismaのtypeフィールドを必須（String? → String）に変更してください。");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

