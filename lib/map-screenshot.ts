/**
 * 地図スクリーンショット生成ユーティリティ
 * Canvas APIを使ってOpenStreetMapのタイル画像を取得・合成
 */

import { appendFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

/** 吹き出し用日本語フォント（登録に成功した場合のみ使用） */
const POPUP_FONT_FAMILY = "Noto Sans JP";

const DEBUG_LOG_PATH = join(process.cwd(), ".cursor", "debug.log");

async function debugLog(location: string, message: string, data: any, hypothesisId: string) {
  const logEntry = {
    timestamp: Date.now(),
    location,
    message,
    data,
    sessionId: "debug-session",
    runId: "run1",
    hypothesisId,
  };
  try {
    await appendFile(DEBUG_LOG_PATH, JSON.stringify(logEntry) + "\n");
  } catch (error) {
    // ログファイルの書き込みに失敗しても処理は続行
  }
}

/**
 * 緯度経度からタイル座標を計算
 */
function latLngToTile(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

/**
 * タイル座標から緯度経度を計算（タイルの左上角）
 */
function tileToLatLng(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  const lat = (latRad * 180) / Math.PI;
  return { lat, lng };
}

/** 1x1 白ピクセルのPNG（タイル取得失敗時のフォールバック） */
const FALLBACK_TILE_BASE64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

/** PNGのマジックバイト（先頭8バイト） */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isValidPngBuffer(buffer: Buffer): boolean {
  if (buffer.length < 8) return false;
  return PNG_SIGNATURE.equals(buffer.subarray(0, 8));
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function shouldRetryHttpStatus(status: number): boolean {
  // 一時的な過負荷/ゲートウェイ系のみ
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * OpenStreetMapのタイル画像を取得
 * レスポンスがPNGでない場合（404 HTML等）はフォールバックを返す
 */
async function getTileImage(x: number, y: number, z: number): Promise<string> {
  const servers = ["a", "b", "c"];
  const server = servers[Math.floor(Math.random() * servers.length)];
  const url = `https://${server}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

  // 最大2回リトライ（合計最大3試行）
  const maxRetries = 2;
  let lastErrorMessage = "";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const msg = `HTTP ${response.status}`;
        lastErrorMessage = msg;
        if (attempt < maxRetries && shouldRetryHttpStatus(response.status)) {
          await sleep(attempt === 0 ? 250 : 800);
          continue;
        }
        throw new Error(msg);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("image/png")) {
        // たまにHTML等が返ることがある（=Unsupported image typeの原因）。ここはリトライ対象。
        lastErrorMessage = `Invalid Content-Type: ${contentType}`;
        if (attempt < maxRetries) {
          await sleep(attempt === 0 ? 250 : 800);
          continue;
        }
        throw new Error(lastErrorMessage);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (!isValidPngBuffer(buffer)) {
        lastErrorMessage = "Not a valid PNG buffer";
        if (attempt < maxRetries) {
          await sleep(attempt === 0 ? 250 : 800);
          continue;
        }
        throw new Error(lastErrorMessage);
      }

      return `data:image/png;base64,${buffer.toString("base64")}`;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      lastErrorMessage = errorMsg;
      // ネットワーク等の例外はリトライ対象（最後のattempt以外）
      if (attempt < maxRetries) {
        await sleep(attempt === 0 ? 250 : 800);
        continue;
      }
    }
  }

  console.warn(
    `[地図生成] タイル ${z}/${x}/${y} 取得失敗（最大リトライ後）、フォールバック使用:`,
    lastErrorMessage
  );
  return FALLBACK_TILE_BASE64;
}

/**
 * 地図画像を生成（Base64エンコードされたPNG）
 * @param center 中心座標 [緯度, 経度]
 * @param zoom ズームレベル
 * @param width 画像幅
 * @param height 画像高さ
 * @param markers マーカーの配列
 */
export async function generateMapScreenshot(
  center: [number, number],
  zoom: number,
  width: number = 800,
  height: number = 600,
  markers?: Array<{
    position: [number, number];
    color?: string;
    popup?: {
      candidateName?: string;
      locationText?: string;
      timeText?: string;
    };
  }>
): Promise<{ dataUrl: string; loadedTiles: number; failedTiles: number }> {
  // @napi-rs/canvasを使用（Vercel対応）
  // 注意: この実装はNode.js環境でのみ動作します
  console.log(`[地図生成] 開始: center=[${center[0]}, ${center[1]}], zoom=${zoom}, size=${width}x${height}`);
  
  // #region agent log
  await debugLog('lib/map-screenshot.ts:66', 'generateMapScreenshot entry', {center,zoom,width,height,markersCount:markers?.length||0}, 'A');
  // #endregion
  
  let createCanvas, loadImage, GlobalFonts: { registerFromPath: (path: string, name?: string) => boolean } | undefined;
  try {
    // #region agent log
    await debugLog('lib/map-screenshot.ts:87', 'Before @napi-rs/canvas import', {}, 'A');
    // #endregion
    
    const canvasModule = await import("@napi-rs/canvas");
    createCanvas = canvasModule.createCanvas;
    loadImage = canvasModule.loadImage;
    GlobalFonts = canvasModule.GlobalFonts;
    console.log(`[地図生成] @napi-rs/canvasのインポートに成功`);
    
    // 日本語フォントを登録（Canvas作成前に実行）。TTF/OTFのいずれかが存在すれば使用
    const fontPaths = [
      join(process.cwd(), "lib", "fonts", "NotoSansJP-Regular.ttf"),
      join(process.cwd(), "lib", "fonts", "NotoSansJP-Regular.otf"),
      join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.ttf"),
      join(process.cwd(), "public", "fonts", "NotoSansJP-Regular.otf"),
      join(process.cwd(), "node_modules", "typeface-notosans-jp", "NotoSansJP-Regular.otf"),
    ];
    for (const fontPath of fontPaths) {
      if (existsSync(fontPath) && GlobalFonts?.registerFromPath(fontPath, POPUP_FONT_FAMILY)) {
        console.log(`[地図生成] 日本語フォントを登録しました: ${fontPath}`);
        break;
      }
    }
    
    // #region agent log
    await debugLog('lib/map-screenshot.ts:90', 'After @napi-rs/canvas import success', {hasCreateCanvas:!!createCanvas,hasLoadImage:!!loadImage}, 'A');
    // #endregion
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[地図生成] @napi-rs/canvasのインポートに失敗:`, error);
    
    // #region agent log
    await debugLog('lib/map-screenshot.ts:93', '@napi-rs/canvas import failed', {error:errorMsg,errorType:error?.constructor?.name}, 'A');
    // #endregion
    
    throw new Error(`Failed to import @napi-rs/canvas: ${errorMsg}`);
  }
  
  // #region agent log
  await debugLog('lib/map-screenshot.ts:96', 'Before canvas creation', {width,height}, 'C');
  // #endregion
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  
  // #region agent log
  await debugLog('lib/map-screenshot.ts:99', 'After canvas creation', {canvasWidth:canvas.width,canvasHeight:canvas.height}, 'C');
  // #endregion
  
  // 背景を白で塗りつぶし
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  
  // 吹き出しが中央付近に来るよう、ピンをやや下にずらす（単一マーカー＋吹き出しの場合）
  const PIN_OFFSET_Y_PX = 90; // ピンを中央より下に表示するピクセル数
  const TILE_SIZE = 256;
  let effectiveCenter = center;
  if (markers && markers.length === 1 && markers[0].popup) {
    const [pinLat, pinLng] = markers[0].position;
    const markerTile = latLngToTile(pinLat, pinLng, zoom);
    const centerTileY = markerTile.y - PIN_OFFSET_Y_PX / TILE_SIZE;
    const adjustedCenterLatLng = tileToLatLng(markerTile.x, centerTileY, zoom);
    effectiveCenter = [adjustedCenterLatLng.lat, adjustedCenterLatLng.lng];
  }
  
  // タイルを取得して描画
  const centerTile = latLngToTile(effectiveCenter[0], effectiveCenter[1], zoom);
  console.log(`[地図生成] 中心タイル座標: [${centerTile.x}, ${centerTile.y}]`);
  
  // 画面に表示するタイルの範囲を計算
  const tileSize = 256;
  const tilesX = Math.ceil(width / tileSize) + 2;
  const tilesY = Math.ceil(height / tileSize) + 2;
  
  const startX = centerTile.x - Math.floor(tilesX / 2);
  const startY = centerTile.y - Math.floor(tilesY / 2);
  
  console.log(`[地図生成] タイル範囲: ${tilesX}x${tilesY} (${startX}, ${startY}から開始)`);
  
  let loadedTiles = 0;
  let failedTiles = 0;
  
  // 各タイルを描画
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tileX = startX + tx;
      const tileY = startY + ty;
      
      // タイル座標の範囲チェック
      const maxTile = Math.pow(2, zoom);
      if (tileX < 0 || tileX >= maxTile || tileY < 0 || tileY >= maxTile) {
        continue;
      }
      
      try {
        const tileImageData = await getTileImage(tileX, tileY, zoom);

        let tileImage: Awaited<ReturnType<typeof loadImage>>;
        try {
          tileImage = await loadImage(tileImageData);
        } catch (loadErr: unknown) {
          // Unsupported image type 等: フォールバックタイルで描画
          const code = loadErr && typeof loadErr === "object" && "code" in loadErr ? (loadErr as { code: string }).code : "";
          if (code === "InvalidArg" || (loadErr instanceof Error && loadErr.message?.includes("Unsupported"))) {
            tileImage = await loadImage(FALLBACK_TILE_BASE64);
          } else {
            throw loadErr;
          }
        }

        const offsetX = (tileX - centerTile.x) * tileSize;
        const offsetY = (tileY - centerTile.y) * tileSize;
        const px = width / 2 + offsetX;
        const py = height / 2 + offsetY;

        ctx.drawImage(tileImage, px, py, tileSize, tileSize);
        loadedTiles++;
      } catch (error) {
        failedTiles++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[地図生成] タイル ${zoom}/${tileX}/${tileY} の描画に失敗、スキップ:`, errorMsg);
      }
    }
  }
  
  console.log(`[地図生成] タイル読み込み完了: 成功=${loadedTiles}, 失敗=${failedTiles}`);
  
  // マーカーを描画
  if (markers && markers.length > 0) {
    for (const marker of markers) {
      const markerTile = latLngToTile(marker.position[0], marker.position[1], zoom);
      const centerTile = latLngToTile(center[0], center[1], zoom);
      
      const offsetX = (markerTile.x - centerTile.x) * tileSize;
      const offsetY = (markerTile.y - centerTile.y) * tileSize;
      
      const x = width / 2 + offsetX;
      const y = height / 2 + offsetY;
      
      // 吹き出しを描画（popupがある場合）※スマホでも読めるよう文字サイズ・余白を大きめに
      if (marker.popup) {
        const popupWidth = 340;
        const popupPadding = 20;
        const popupLineHeight = 34;
        let popupHeight = popupPadding * 2;
        
        // テキストの行数を計算
        if (marker.popup.candidateName) popupHeight += popupLineHeight + 4;
        if (marker.popup.locationText) popupHeight += popupLineHeight + 2;
        if (marker.popup.timeText) popupHeight += popupLineHeight;
        
        const popupX = x - popupWidth / 2;
        const popupY = y - 50 - popupHeight; // ピンの上に表示
        
        // 吹き出しの背景（白）
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        
        // 角丸の矩形を描画
        const radius = 12;
        ctx.beginPath();
        ctx.moveTo(popupX + radius, popupY);
        ctx.lineTo(popupX + popupWidth - radius, popupY);
        ctx.quadraticCurveTo(popupX + popupWidth, popupY, popupX + popupWidth, popupY + radius);
        ctx.lineTo(popupX + popupWidth, popupY + popupHeight - radius);
        ctx.quadraticCurveTo(popupX + popupWidth, popupY + popupHeight, popupX + popupWidth - radius, popupY + popupHeight);
        ctx.lineTo(popupX + radius, popupY + popupHeight);
        ctx.quadraticCurveTo(popupX, popupY + popupHeight, popupX, popupY + popupHeight - radius);
        ctx.lineTo(popupX, popupY + radius);
        ctx.quadraticCurveTo(popupX, popupY, popupX + radius, popupY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // 吹き出しの三角形（ピンへの接続）
        ctx.beginPath();
        ctx.moveTo(x - 10, popupY + popupHeight);
        ctx.lineTo(x, popupY + popupHeight + 10);
        ctx.lineTo(x + 10, popupY + popupHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // テキストを描画（文字色は黒、スマホでも読めるよう大きめのフォント）
        ctx.fillStyle = "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const fontFamily = `${POPUP_FONT_FAMILY}, sans-serif`;
        
        let textY = popupY + popupPadding;
        if (marker.popup.candidateName) {
          ctx.font = `bold 28px ${fontFamily}`;
          ctx.fillText(marker.popup.candidateName, popupX + popupWidth / 2, textY);
          textY += popupLineHeight + 4;
        }
        if (marker.popup.locationText) {
          ctx.font = `22px ${fontFamily}`;
          ctx.fillText(marker.popup.locationText, popupX + popupWidth / 2, textY);
          textY += popupLineHeight + 2;
        }
        if (marker.popup.timeText) {
          ctx.font = `20px ${fontFamily}`;
          ctx.fillText(marker.popup.timeText, popupX + popupWidth / 2, textY);
        }
      }
      
      // マーカーアイコンを描画（吹き出しの下に表示）
      ctx.fillStyle = marker.color === "red" ? "#ef4444" : marker.color === "blue" ? "#3b82f6" : "#f97316";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // 外側の白い輪郭
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  
  // Base64エンコードして返す
  // #region agent log
  await debugLog('lib/map-screenshot.ts:251', 'Before toDataURL', {loadedTiles,failedTiles,markersCount:markers?.length||0}, 'D');
  // #endregion
  
  const dataUrl = canvas.toDataURL("image/png");
  
  // #region agent log
  await debugLog('lib/map-screenshot.ts:253', 'After toDataURL', {dataUrlLength:dataUrl.length,dataUrlPrefix:dataUrl.substring(0,50)}, 'D');
  // #endregion
  
  console.log(`[地図生成] 完了: データURL長さ=${dataUrl.length}, 成功=${loadedTiles}, 失敗=${failedTiles}`);
  return { dataUrl, loadedTiles, failedTiles };
}
