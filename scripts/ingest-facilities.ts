/**
 * 施設データ取り込みスクリプト
 * 国土数値情報等の公的データを取り込みます
 * 
 * 実装予定:
 * - 学校データの取り込み
 * - 医療機関データの取り込み
 * - GeoJSON/GML形式の変換
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("施設データの取り込みを開始します...");
  console.log("注意: このスクリプトは実装中です。");
  console.log("実際のデータソース（国土数値情報等）からデータを取得し、");
  console.log("GeoJSON形式に変換してからDBに保存する必要があります。");
  
  // TODO: 実装
  // 1. データソースからGeoJSONを取得
  // 2. 施設データをパース
  // 3. PrismaでDBに保存
  
  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
