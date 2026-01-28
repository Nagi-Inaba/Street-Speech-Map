/**
 * 地図スクリーンショット生成ユーティリティ
 * Canvas APIを使ってOpenStreetMapのタイル画像を取得・合成
 */

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
  
  try {
    return await imageToBase64(url);
  } catch (error) {
    console.error(`Failed to fetch tile ${z}/${x}/${y}:`, error);
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
  }>
): Promise<string> {
  // @napi-rs/canvasを使用（Vercel対応）
  // 注意: この実装はNode.js環境でのみ動作します
  const { createCanvas, loadImage } = await import("@napi-rs/canvas");
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  
  // 背景を白で塗りつぶし
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  
  // タイルを取得して描画
  const centerTile = latLngToTile(center[0], center[1], zoom);
  
  // 画面に表示するタイルの範囲を計算
  const tileSize = 256;
  const tilesX = Math.ceil(width / tileSize) + 2;
  const tilesY = Math.ceil(height / tileSize) + 2;
  
  const startX = centerTile.x - Math.floor(tilesX / 2);
  const startY = centerTile.y - Math.floor(tilesY / 2);
  
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
        const tileImage = await loadImage(tileImageData);
        
        // タイルの位置を計算
        const tileLatLng = tileToLatLng(tileX, tileY, zoom);
        const centerLatLng = tileToLatLng(centerTile.x, centerTile.y, zoom);
        
        // ピクセル位置を計算（簡易版）
        const offsetX = (tileX - centerTile.x) * tileSize;
        const offsetY = (tileY - centerTile.y) * tileSize;
        
        const x = width / 2 + offsetX;
        const y = height / 2 + offsetY;
        
        ctx.drawImage(tileImage, x, y, tileSize, tileSize);
      } catch (error) {
        console.error(`Failed to draw tile ${zoom}/${tileX}/${tileY}:`, error);
      }
    }
  }
  
  // マーカーを描画
  if (markers && markers.length > 0) {
    for (const marker of markers) {
      const markerTile = latLngToTile(marker.position[0], marker.position[1], zoom);
      const centerTile = latLngToTile(center[0], center[1], zoom);
      
      const offsetX = (markerTile.x - centerTile.x) * tileSize;
      const offsetY = (markerTile.y - centerTile.y) * tileSize;
      
      const x = width / 2 + offsetX;
      const y = height / 2 + offsetY;
      
      // マーカーアイコンを描画（簡易版：円で表現）
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
  return canvas.toDataURL("image/png");
}
