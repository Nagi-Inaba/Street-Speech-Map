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

/**
 * 画像をBase64に変換
 */
async function imageToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/**
 * OpenStreetMapのタイル画像を取得
 */
async function getTileImage(x: number, y: number, z: number): Promise<string> {
  // OpenStreetMapのタイルサーバー（複数のサーバーからランダムに選択）
  const servers = ["a", "b", "c"];
  const server = servers[Math.floor(Math.random() * servers.length)];
  const url = `https://${server}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
  
  // #region agent log
  await debugLog('lib/map-screenshot.ts:43', 'Before tile fetch', {x,y,z,server,url}, 'B');
  // #endregion
  
  try {
    const result = await imageToBase64(url);
    
    // #region agent log
    await debugLog('lib/map-screenshot.ts:50', 'Tile fetch success', {x,y,z,resultLength:result.length,resultPrefix:result.substring(0,30)}, 'B');
    // #endregion
    
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to fetch tile ${z}/${x}/${y}:`, error);
    
    // #region agent log
    await debugLog('lib/map-screenshot.ts:52', 'Tile fetch failed, using fallback', {x,y,z,error:errorMsg,errorType:error?.constructor?.name}, 'B');
    // #endregion
    
    // フォールバック: 白い画像を返す
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }
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
): Promise<string> {
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
        // #region agent log
        await debugLog('lib/map-screenshot.ts:133', 'Before tile fetch', {tileX,tileY,zoom}, 'B');
        // #endregion
        
        const tileImageData = await getTileImage(tileX, tileY, zoom);
        
        // #region agent log
        await debugLog('lib/map-screenshot.ts:136', 'After tile fetch', {tileX,tileY,zoom,dataUrlLength:tileImageData?.length||0,dataUrlPrefix:tileImageData?.substring(0,30)||''}, 'B');
        // #endregion
        
        const tileImage = await loadImage(tileImageData);
        
        // タイルの位置を計算
        const tileLatLng = tileToLatLng(tileX, tileY, zoom);
        const centerLatLng = tileToLatLng(centerTile.x, centerTile.y, zoom);
        
        // ピクセル位置を計算（簡易版）
        const offsetX = (tileX - centerTile.x) * tileSize;
        const offsetY = (tileY - centerTile.y) * tileSize;
        
        const x = width / 2 + offsetX;
        const y = height / 2 + offsetY;
        
        // #region agent log
        await debugLog('lib/map-screenshot.ts:147', 'Before drawImage', {tileX,tileY,x,y,tileSize}, 'C');
        // #endregion
        
        ctx.drawImage(tileImage, x, y, tileSize, tileSize);
        
        // #region agent log
        await debugLog('lib/map-screenshot.ts:149', 'After drawImage success', {tileX,tileY}, 'C');
        // #endregion
        
        loadedTiles++;
      } catch (error) {
        failedTiles++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[地図生成] タイル ${zoom}/${tileX}/${tileY} の描画に失敗:`, error);
        
        // #region agent log
        await debugLog('lib/map-screenshot.ts:152', 'Tile drawImage failed', {tileX,tileY,zoom,error:errorMsg,errorType:error?.constructor?.name}, 'B');
        // #endregion
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
  
  console.log(`[地図生成] 完了: データURL長さ=${dataUrl.length}`);
  return dataUrl;
}
