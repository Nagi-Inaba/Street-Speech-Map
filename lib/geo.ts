/**
 * 地理計算ユーティリティ
 */

export interface BBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

/**
 * 緯度経度から簡易クラスターキーを生成（geohash風）
 */
export function getClusterKey(lat: number, lng: number, precision: number = 7): string {
  const latGrid = Math.round(lat * Math.pow(10, precision));
  const lngGrid = Math.round(lng * Math.pow(10, precision));
  return `${latGrid}:${lngGrid}`;
}

/**
 * 2点間の距離（km）を計算（Haversine formula）
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // 地球の半径（km）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * クラスタリング（簡易実装）
 * 同じクラスターキーを持つ点をグループ化
 */
export function clusterPoints<T extends { lat: number; lng: number }>(
  points: T[],
  precision: number = 7
): Map<string, T[]> {
  const clusters = new Map<string, T[]>();

  for (const point of points) {
    const key = getClusterKey(point.lat, point.lng, precision);
    if (!clusters.has(key)) {
      clusters.set(key, []);
    }
    clusters.get(key)!.push(point);
  }

  return clusters;
}

/**
 * クラスターの代表点（重心）を計算
 */
export function getClusterCenter(
  points: Array<{ lat: number; lng: number }>
): { lat: number; lng: number } {
  if (points.length === 0) {
    throw new Error("Points array is empty");
  }

  const sumLat = points.reduce((sum, p) => sum + p.lat, 0);
  const sumLng = points.reduce((sum, p) => sum + p.lng, 0);

  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length,
  };
}
