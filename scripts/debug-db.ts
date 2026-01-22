/**
 * データベースの状態を確認するデバッグスクリプト
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== データベース状態の確認 ===\n");

  try {
    // 候補者の確認
    console.log("1. 候補者データ:");
    const candidates = await prisma.candidate.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        region: true,
      },
    });
    console.log(`   候補者数: ${candidates.length}`);
    candidates.forEach((c) => {
      console.log(`   - ${c.name} (slug: ${c.slug})`);
    });

    // イベントの確認
    console.log("\n2. イベントデータ:");
    const events = await prisma.speechEvent.findMany({
      select: {
        id: true,
        candidateId: true,
        status: true,
        locationText: true,
      },
      take: 10,
    });
    console.log(`   イベント数: ${events.length}`);
    events.forEach((e) => {
      console.log(`   - ${e.locationText} (status: ${e.status}, type: ${typeof e.status})`);
    });

    // SpeechEventテーブルのスキーマ確認
    console.log("\n3. SpeechEventテーブルの構造確認:");
    const sampleEvent = await prisma.speechEvent.findFirst();
    if (sampleEvent) {
      console.log("   サンプルイベント:", {
        id: sampleEvent.id,
        status: sampleEvent.status,
        statusType: typeof sampleEvent.status,
        allFields: Object.keys(sampleEvent),
      });
    } else {
      console.log("   イベントデータがありません");
    }

    // 特定の候補者でfindUniqueをテスト
    if (candidates.length > 0) {
      const testSlug = candidates[0].slug;
      console.log(`\n4. findUniqueテスト (slug: ${testSlug}):`);
      
      try {
        // eventsを含めない場合
        const candidateWithoutEvents = await prisma.candidate.findUnique({
          where: { slug: testSlug },
        });
        console.log("   ✅ eventsを含めない場合: 成功");
        
        // eventsを含める場合
        const candidateWithEvents = await prisma.candidate.findUnique({
          where: { slug: testSlug },
          include: {
            events: {
              take: 1,
            },
          },
        });
        console.log("   ✅ eventsを含める場合: 成功");
        console.log(`   events数: ${candidateWithEvents?.events.length || 0}`);
      } catch (error) {
        console.error("   ❌ エラー発生:", error);
        if (error instanceof Error) {
          console.error("   メッセージ:", error.message);
          console.error("   スタック:", error.stack);
        }
      }
    }
  } catch (error) {
    console.error("エラー:", error);
    if (error instanceof Error) {
      console.error("メッセージ:", error.message);
      console.error("スタック:", error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

