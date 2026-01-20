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
  const candidate1 = await prisma.candidate.upsert({
    where: { slug: "sample-candidate-1" },
    update: {},
    create: {
      slug: "sample-candidate-1",
      name: "サンプル候補者1",
      region: "東京都",
    },
  });

  console.log("サンプル候補者を作成しました:", candidate1.name);

  // サンプルイベントの作成
  const event1 = await prisma.speechEvent.create({
    data: {
      candidateId: candidate1.id,
      status: "PLANNED",
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 明日
      endAt: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 明日+2時間
      locationText: "東京駅前",
      lat: 35.6812,
      lng: 139.7671,
    },
  });

  console.log("サンプルイベントを作成しました:", event1.locationText);

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
