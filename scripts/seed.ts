/**
 * 開発用シードスクリプト
 * 初期データを投入します
 */

// .env から DATABASE_URL などを読み込む
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("シードデータの投入を開始します...");

  // 管理者ユーザーの作成
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "管理者",
      role: "SiteAdmin",
    },
  });

  console.log("管理者ユーザーを作成しました:", adminUser.email);

  console.log("シードデータの投入が完了しました！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
