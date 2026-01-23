/**
 * 施設データ取り込みスクリプト
 * 国土数値情報等の公的データを取り込みます
 * 
 * 使用方法:
 * 1. CSVファイルから読み込む場合:
 *    npm run ingest:facilities -- --file path/to/facilities.csv --category school
 * 
 * 2. GeoJSONファイルから読み込む場合:
 *    npm run ingest:facilities -- --geojson path/to/facilities.geojson --category school
 * 
 * CSV形式:
 * name,lat,lng
 * 学校名1,35.6812,139.7671
 * 学校名2,35.6586,139.7454
 * 
 * GeoJSON形式:
 * {
 *   "type": "FeatureCollection",
 *   "features": [
 *     {
 *       "type": "Feature",
 *       "geometry": {
 *         "type": "Point",
 *         "coordinates": [139.7671, 35.6812]
 *       },
 *       "properties": {
 *         "name": "学校名"
 *       }
 *     }
 *   ]
 * }
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface FacilityData {
  name?: string;
  lat: number;
  lng: number;
}

interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    name?: string;
    [key: string]: any;
  };
}

interface GeoJSON {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

/**
 * CSVファイルから施設データを読み込む
 */
function parseCSV(filePath: string): FacilityData[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((line) => line.trim());
  const facilities: FacilityData[] = [];

  // ヘッダー行をスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) {
      console.warn(`Invalid CSV line ${i + 1} (needs at least 3 columns: name,lat,lng): ${line}`);
      continue;
    }

    const name = parts[0] || undefined;
    const lat = parseFloat(parts[1]);
    const lng = parseFloat(parts[2]);

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`Invalid coordinates in line ${i + 1}: ${line}`);
      continue;
    }

    facilities.push({ name, lat, lng });
  }

  return facilities;
}

/**
 * GeoJSONファイルから施設データを読み込む
 */
function parseGeoJSON(filePath: string): FacilityData[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const geojson: GeoJSON = JSON.parse(content);

  if (geojson.type !== "FeatureCollection") {
    throw new Error("Invalid GeoJSON: must be FeatureCollection");
  }

  const facilities: FacilityData[] = [];

  for (const feature of geojson.features) {
    if (feature.geometry.type !== "Point") {
      console.warn(`Skipping non-point feature: ${feature.geometry.type}`);
      continue;
    }

    const [lng, lat] = feature.geometry.coordinates;
    const name = feature.properties.name || feature.properties.NAME || feature.properties.名称 || undefined;

    if (isNaN(lat) || isNaN(lng)) {
      console.warn(`Invalid coordinates in feature:`, feature);
      continue;
    }

    facilities.push({ name, lat, lng });
  }

  return facilities;
}

/**
 * 施設データをDBに保存
 */
async function saveFacilities(
  facilities: FacilityData[],
  category: string,
  source: string
): Promise<void> {
  console.log(`\n${facilities.length}件の施設データを保存します...`);

  let saved = 0;
  let skipped = 0;

  for (const facility of facilities) {
    try {
      // 重複チェック（同じ位置・同じカテゴリの施設が既に存在するか）
      const existing = await prisma.facility.findFirst({
        where: {
          category,
          lat: facility.lat,
          lng: facility.lng,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.facility.create({
        data: {
          category,
          name: facility.name || null,
          lat: facility.lat,
          lng: facility.lng,
          source,
        },
      });

      saved++;
    } catch (error) {
      console.error(`Error saving facility:`, facility, error);
    }
  }

  console.log(`\n保存完了:`);
  console.log(`  - 新規保存: ${saved}件`);
  console.log(`  - スキップ（重複）: ${skipped}件`);
}

async function main() {
  const args = process.argv.slice(2);
  let filePath: string | null = null;
  let geojsonPath: string | null = null;
  let category: string | null = null;
  let source: string = "manual";

  // 引数の解析
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) {
      filePath = args[i + 1];
      i++;
    } else if (args[i] === "--geojson" && args[i + 1]) {
      geojsonPath = args[i + 1];
      i++;
    } else if (args[i] === "--category" && args[i + 1]) {
      category = args[i + 1];
      i++;
    } else if (args[i] === "--source" && args[i + 1]) {
      source = args[i + 1];
      i++;
    }
  }

  if (!category) {
    console.error("エラー: --category オプションが必要です");
    console.error("例: npm run ingest:facilities -- --file data.csv --category school");
    process.exit(1);
  }

  if (!filePath && !geojsonPath) {
    console.error("エラー: --file または --geojson オプションが必要です");
    console.error("例: npm run ingest:facilities -- --file data.csv --category school");
    process.exit(1);
  }

  if (filePath && geojsonPath) {
    console.error("エラー: --file と --geojson は同時に指定できません");
    process.exit(1);
  }

  console.log("施設データの取り込みを開始します...");
  console.log(`カテゴリ: ${category}`);
  console.log(`ソース: ${source}`);

  let facilities: FacilityData[] = [];

  try {
    if (filePath) {
      const fullPath = path.resolve(filePath);
      console.log(`CSVファイルを読み込みます: ${fullPath}`);
      facilities = parseCSV(fullPath);
    } else if (geojsonPath) {
      const fullPath = path.resolve(geojsonPath);
      console.log(`GeoJSONファイルを読み込みます: ${fullPath}`);
      facilities = parseGeoJSON(fullPath);
    }

    console.log(`\n読み込み完了: ${facilities.length}件の施設データ`);

    if (facilities.length === 0) {
      console.warn("警告: 施設データが0件です");
      return;
    }

    await saveFacilities(facilities, category, source);
  } catch (error) {
    console.error("エラーが発生しました:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
