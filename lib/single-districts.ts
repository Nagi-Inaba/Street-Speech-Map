/**
 * 小選挙区データの管理
 * CSVファイルから読み込む機能を提供
 */

import { SingleDistrict } from "./constants";

/**
 * CSVファイルから小選挙区データを読み込む
 * クライアントサイドで使用する場合は、fetchで読み込む
 */
export async function loadSingleDistrictsFromCSV(): Promise<Record<string, SingleDistrict[]>> {
  try {
    const response = await fetch("/data/single_districts.csv");
    if (!response.ok) {
      console.warn("小選挙区CSVファイルが見つかりません。デフォルトデータを使用します。");
      return {};
    }
    const csvText = await response.text();
    return parseSingleDistrictsCSV(csvText);
  } catch (error) {
    console.warn("小選挙区CSVファイルの読み込みに失敗しました。デフォルトデータを使用します。", error);
    return {};
  }
}

/**
 * CSVテキストをパースして小選挙区データに変換
 */
function parseSingleDistrictsCSV(csvText: string): Record<string, SingleDistrict[]> {
  const lines = csvText.split("\n").filter((line) => line.trim());
  const districts: Record<string, SingleDistrict[]> = {};

  // ヘッダー行をスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [prefecture, districtNumberStr, districtName] = line.split(",").map((p) => p.trim());

    if (!prefecture || !districtNumberStr || !districtName) continue;

    const districtNumber = parseInt(districtNumberStr, 10);
    if (isNaN(districtNumber)) continue;

    if (!districts[prefecture]) {
      districts[prefecture] = [];
    }

    districts[prefecture].push({
      prefecture,
      districtNumber,
      districtName,
    });
  }

  // 都道府県ごとにソート
  for (const prefecture in districts) {
    districts[prefecture].sort((a, b) => a.districtNumber - b.districtNumber);
  }

  return districts;
}
