/**
 * すべてのサンプル・ダミーデータ削除スクリプト
 * データベース内のすべてのサンプルデータを削除します
 * 
 * 使用方法:
 * npm run cleanup:all-sample-data
 * 
 * 警告: このスクリプトは以下のデータを削除します:
 * - サンプル候補者（slugまたはnameに"sample"、"test"、"サンプル"、"テスト"、"ダミー"が含まれる）
 * - サンプル候補者に関連するすべてのイベント（Cascade削除）
 * - サンプル候補者に関連するすべてのリクエスト
 * - サンプル施設データ（sourceに"サンプル"が含まれる）
 * - サンプル他党イベント（nameに"サンプル"や"テスト"が含まれる）
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("すべてのサンプル・ダミーデータの削除を開始します...\n");

  // 1. サンプル候補者を検索
  const sampleCandidates = await prisma.candidate.findMany({
    where: {
      OR: [
        { slug: { contains: "sample", mode: "insensitive" } },
        { slug: { contains: "test", mode: "insensitive" } },
        { slug: { contains: "サンプル" } },
        { slug: { contains: "テスト" } },
        { slug: { contains: "ダミー" } },
        { name: { contains: "サンプル" } },
        { name: { contains: "テスト" } },
        { name: { contains: "ダミー" } },
        { name: { contains: "sample", mode: "insensitive" } },
        { name: { contains: "test", mode: "insensitive" } },
      ],
    },
    include: {
      events: true,
      requests: true,
    },
  });

  console.log(`削除対象の候補者: ${sampleCandidates.length}件`);
  if (sampleCandidates.length > 0) {
    sampleCandidates.forEach((c) => {
      console.log(`  - ${c.name} (${c.slug}): イベント${c.events.length}件、リクエスト${c.requests.length}件`);
    });
  }

  // 2. サンプル施設データを検索
  const sampleFacilities = await prisma.facility.findMany({
    where: {
      OR: [
        { source: { contains: "サンプル" } },
        { source: { contains: "サンプルデータ" } },
        { source: { contains: "sample", mode: "insensitive" } },
        { source: { contains: "test", mode: "insensitive" } },
      ],
    },
  });

  console.log(`\n削除対象の施設: ${sampleFacilities.length}件`);

  // 3. サンプル他党イベントを検索
  const sampleRivalEvents = await prisma.rivalEvent.findMany({
    where: {
      OR: [
        { name: { contains: "サンプル" } },
        { name: { contains: "テスト" } },
        { name: { contains: "ダミー" } },
        { name: { contains: "sample", mode: "insensitive" } },
        { name: { contains: "test", mode: "insensitive" } },
      ],
    },
  });

  console.log(`削除対象の他党イベント: ${sampleRivalEvents.length}件`);
  if (sampleRivalEvents.length > 0) {
    sampleRivalEvents.forEach((e) => {
      console.log(`  - ${e.name}`);
    });
  }

  // 削除対象がない場合は終了
  if (
    sampleCandidates.length === 0 &&
    sampleFacilities.length === 0 &&
    sampleRivalEvents.length === 0
  ) {
    console.log("\n削除対象のサンプルデータはありません。");
    return;
  }

  // 削除実行
  console.log("\n削除を実行します...\n");

  // サンプル候補者を削除（関連するイベントとリクエストはCascadeで自動削除）
  if (sampleCandidates.length > 0) {
    const candidateIds = sampleCandidates.map((c) => c.id);
    const deletedCandidates = await prisma.candidate.deleteMany({
      where: {
        id: { in: candidateIds },
      },
    });
    console.log(`✓ ${deletedCandidates.count}件のサンプル候補者を削除しました（関連イベント・リクエストも自動削除）`);
  }

  // サンプル施設データを削除
  if (sampleFacilities.length > 0) {
    const deletedFacilities = await prisma.facility.deleteMany({
      where: {
        OR: [
          { source: { contains: "サンプル" } },
          { source: { contains: "サンプルデータ" } },
          { source: { contains: "sample", mode: "insensitive" } },
          { source: { contains: "test", mode: "insensitive" } },
        ],
      },
    });
    console.log(`✓ ${deletedFacilities.count}件のサンプル施設データを削除しました`);
  }

  // サンプル他党イベントを削除
  if (sampleRivalEvents.length > 0) {
    const deletedRivalEvents = await prisma.rivalEvent.deleteMany({
      where: {
        OR: [
          { name: { contains: "サンプル" } },
          { name: { contains: "テスト" } },
          { name: { contains: "ダミー" } },
          { name: { contains: "sample", mode: "insensitive" } },
          { name: { contains: "test", mode: "insensitive" } },
        ],
      },
    });
    console.log(`✓ ${deletedRivalEvents.count}件のサンプル他党イベントを削除しました`);
  }

  console.log("\nすべてのサンプル・ダミーデータの削除が完了しました！");
}

main()
  .catch((e) => {
    console.error("エラーが発生しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

