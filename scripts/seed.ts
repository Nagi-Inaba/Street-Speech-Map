/**
 * 開発用シードスクリプト
 * 初期データを投入します
 */

// .env から DATABASE_URL などを読み込む
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("シードデータの投入を開始します...");

  // 既存データのクリア（開発環境のみ）
  if (process.env.NODE_ENV === "development") {
    console.log("既存データをクリアしています...");
    await prisma.speechEvent.deleteMany({});
    await prisma.candidate.deleteMany({});
    await prisma.user.deleteMany({});
  }

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

  // サンプル候補者の作成
  const candidates = [
    {
      slug: "yamada-taro",
      name: "山田太郎",
      region: "東京都",
      imageUrl: null,
    },
    {
      slug: "suzuki-hanako",
      name: "鈴木花子",
      region: "神奈川県",
      imageUrl: null,
    },
    {
      slug: "tanaka-ichiro",
      name: "田中一郎",
      region: "埼玉県",
      imageUrl: null,
    },
  ];

  const createdCandidates = [];
  for (const candidateData of candidates) {
    const candidate = await prisma.candidate.upsert({
      where: { slug: candidateData.slug },
      update: {},
      create: candidateData,
    });
    createdCandidates.push(candidate);
    console.log("サンプル候補者を作成しました:", candidate.name);
  }

  // イベントは管理画面から追加してください
  // （Prismaクライアントの型の問題を回避するため）

  console.log("シードデータの投入が完了しました！");
  console.log("\n候補者データ:");
  for (const candidate of createdCandidates) {
    console.log(`  - ${candidate.name} (${candidate.slug})`);
  }
  console.log("\n管理画面からイベントを追加できます: http://localhost:3000/admin/events/new");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
