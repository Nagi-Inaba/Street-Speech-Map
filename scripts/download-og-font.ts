/**
 * OGP地図の吹き出し用に Noto Sans JP を lib/fonts にダウンロードするスクリプト。
 * 初回または prebuild 前に実行: npx tsx scripts/download-og-font.ts
 */
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const FONT_DIR = join(process.cwd(), "lib", "fonts");
// @napi-rs/canvas は TTF/OTF を registerFromPath で受け付ける
const OTF_URL =
  "https://cdn.jsdelivr.net/npm/typeface-notosans-jp@1.0.1/NotoSansJP-Regular.otf";

async function main() {
  const otfPath = join(FONT_DIR, "NotoSansJP-Regular.otf");
  if (existsSync(otfPath)) {
    console.log("[OGPフォント] 既に存在します:", otfPath);
    return;
  }

  try {
    await mkdir(FONT_DIR, { recursive: true });
    const res = await fetch(OTF_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${OTF_URL}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(otfPath, buffer);
    console.log("[OGPフォント] ダウンロード完了:", otfPath);
  } catch (e) {
    console.error("[OGPフォント] ダウンロードに失敗しました:", e);
    console.log("[OGPフォント] Google Fonts から Noto Sans JP を手動でダウンロードし、lib/fonts/NotoSansJP-Regular.otf に配置してください。");
  }
}

main();
