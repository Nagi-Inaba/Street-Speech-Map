/**
 * 地図画像生成用のユーティリティ
 * OpenStreetMapの静的画像APIを使用
 */

/**
 * OpenStreetMapの静的画像URLを生成
 * @param center 中心座標 [緯度, 経度]
 * @param zoom ズームレベル (1-18)
 * @param width 画像幅
 * @param height 画像高さ
 * @param markers マーカーの配列
 */
export function generateStaticMapUrl(
  center: [number, number],
  zoom: number,
  width: number = 800,
  height: number = 600,
  markers?: Array<{
    position: [number, number];
    label?: string;
    color?: string;
  }>
): string {
  const [lat, lng] = center;
  const baseUrl = "https://staticmap.openstreetmap.de/staticmap.php";
  
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: zoom.toString(),
    size: `${width}x${height}`,
    maptype: "mapnik",
  });

  // マーカーを追加
  // OpenStreetMapの静的画像APIの形式: markers=lat,lng,color|label
  if (markers && markers.length > 0) {
    markers.forEach((marker) => {
      const [markerLat, markerLng] = marker.position;
      // 色の指定（red, blue, green, yellow, orange, violet, grey, black）
      const markerColor = marker.color === "red" ? "red" : marker.color === "blue" ? "blue" : marker.color === "orange" ? "orange" : "blue";
      let markerParam = `${markerLat},${markerLng},${markerColor}`;
      if (marker.label) {
        markerParam += `|${marker.label}`;
      }
      params.append("markers", markerParam);
    });
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * イベント個別ページ用：ピンをクローズアップした地図画像URLを生成
 * 吹き出しは画像上に直接描画できないため、ズームを上げてピンを大きく表示
 */
export function generateEventMapUrl(
  position: [number, number],
  width: number = 800,
  height: number = 600,
  isLive: boolean = false
): string {
  // クローズアップ用にズームレベルを高く設定（15-16程度）
  return generateStaticMapUrl(position, 16, width, height, [
    { position, color: isLive ? "red" : "blue" },
  ]);
}

/**
 * 候補者ページ用：複数のピンが入る範囲の地図画像URLを生成
 */
export function generateCandidateMapUrl(
  positions: Array<[number, number]>,
  width: number = 800,
  height: number = 600
): string {
  if (positions.length === 0) {
    // デフォルト位置（東京駅）
    return generateStaticMapUrl([35.6812, 139.7671], 13, width, height);
  }

  // すべてのピンの中心を計算
  const centerLat = positions.reduce((sum, [lat]) => sum + lat, 0) / positions.length;
  const centerLng = positions.reduce((sum, [, lng]) => sum + lng, 0) / positions.length;
  const center: [number, number] = [centerLat, centerLng];

  // ピン間の距離を計算して適切なズームレベルを決定
  const distances = positions.map(([lat, lng]) => {
    const dLat = lat - centerLat;
    const dLng = lng - centerLng;
    return Math.sqrt(dLat * dLat + dLng * dLng);
  });
  const maxDistance = Math.max(...distances);

  // 距離に応じてズームレベルを調整（多くのピンが入るように）
  let zoom = 13;
  if (maxDistance > 0.1) {
    zoom = 10;
  } else if (maxDistance > 0.05) {
    zoom = 11;
  } else if (maxDistance > 0.02) {
    zoom = 12;
  } else if (maxDistance > 0.01) {
    zoom = 13;
  } else {
    zoom = 14;
  }

  // マーカーを追加（色分けはしない）
  const markers = positions.map((pos) => ({ position: pos, color: "blue" as const }));

  return generateStaticMapUrl(center, zoom, width, height, markers);
}

/**
 * トップページ用：東京エリア全体の地図画像URLを生成
 */
export function generateTokyoAreaMapUrl(
  width: number = 800,
  height: number = 600
): string {
  // 東京エリアの中心（東京駅周辺）
  const center: [number, number] = [35.6812, 139.7671];
  // 東京エリア全体が入るズームレベル（10-11程度）
  return generateStaticMapUrl(center, 10, width, height);
}

/**
 * エリアページ用：関東エリア全体の地図画像URLを生成
 */
export function generateKantoAreaMapUrl(
  width: number = 800,
  height: number = 600
): string {
  // 関東エリアの中心（埼玉県と東京都の境界付近）
  const center: [number, number] = [36.0, 139.5];
  // 関東エリア全体が入るズームレベル（8-9程度）
  return generateStaticMapUrl(center, 8, width, height);
}
