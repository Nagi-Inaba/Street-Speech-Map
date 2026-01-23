/**
 * すべての候補者と予定を削除するスクリプト
 * データベース内のすべての候補者とその関連データを削除します
 * 
 * 警告: このスクリプトは以下のデータを削除します:
 * - すべての候補者
 * - すべての演説イベント（候補者に関連するもの、Cascade削除）
 * - すべてのイベント履歴（EventHistory）
 * - すべての移動ヒント（MoveHint）
 * - すべての公開レポート（PublicReport）
 * - 候補者に関連するすべての公開リクエスト（PublicRequest）
 * 
 * 使用方法:
 * npm run cleanup:all-candidates-and-events
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("すべての候補者と予定の削除を開始します...\n");

  // 削除前のデータ数を確認
  const candidateCount = await prisma.candidate.count();
  const eventCount = await prisma.speechEvent.count();
  const requestCount = await prisma.publicRequest.count({
    where: {
      candidateId: { not: null },
    },
  });

  console.log("削除前のデータ数:");
  console.log(`  - 候補者: ${candidateCount}件`);
  console.log(`  - 演説イベント: ${eventCount}件`);
  console.log(`  - 候補者関連リクエスト: ${requestCount}件\n`);

  if (candidateCount === 0) {
    console.log("削除対象の候補者データはありません。");
    return;
  }

  // 候補者を削除（関連するイベント、履歴、ヒント、レポート、リクエストはCascadeまたはSetNullで自動処理）
  console.log("削除を実行します...\n");

  const deletedCandidates = await prisma.candidate.deleteMany({});

  console.log(`✓ ${deletedCandidates.count}件の候補者を削除しました`);
  console.log(`  （関連するイベント、履歴、ヒント、レポートも自動削除されました）\n`);

  // 削除後の確認
  const remainingCandidates = await prisma.candidate.count();
  const remainingEvents = await prisma.speechEvent.count();

  console.log("削除後のデータ数:");
  console.log(`  - 候補者: ${remainingCandidates}件`);
  console.log(`  - 演説イベント: ${remainingEvents}件`);

  console.log("\nすべての候補者と予定の削除が完了しました！");
}

main()
  .catch((e) => {
    console.error("エラーが発生しました:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

