import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const facilities = await prisma.facility.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  console.log(`\nデータベース内の施設データ: ${facilities.length}件\n`);

  const byCategory = facilities.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("カテゴリ別の件数:");
  for (const [category, count] of Object.entries(byCategory)) {
    console.log(`  - ${category}: ${count}件`);
  }

  console.log("\n最新の5件:");
  facilities.slice(0, 5).forEach((f) => {
    console.log(`  - ${f.name || "(名前なし)"} (${f.category}) - ${f.lat}, ${f.lng} - ${f.source}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

