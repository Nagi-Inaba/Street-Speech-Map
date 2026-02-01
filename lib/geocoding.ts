/**
 * 住所検索（ジオコーディング）機能
 * OpenStreetMap Nominatim APIを使用
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

/** 全角数字を半角に変換 */
function fullWidthToHalf(str: string): string {
  return str.replace(/[０-９]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  );
}

/**
 * 検索クエリをNominatim向けに正規化する
 * - 7桁の数字（半角・全角、ハイフンありなし）→ 郵便番号として「〒XXX-XXXX 日本」に変換
 * - それ以外はそのまま（必要なら「日本」を付与して再試行は呼び出し側で行う）
 */
function normalizeSearchQuery(query: string): string {
  const trimmed = query.trim();
  const half = fullWidthToHalf(trimmed);
  const digitsOnly = half.replace(/\D/g, "");
  if (digitsOnly.length === 7) {
    return `〒${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)} 日本`;
  }
  return trimmed;
}

/**
 * 住所から座標を取得（ジオコーディング）
 * 住所・地名・建物名・郵便番号（7桁）に対応。郵便番号は「〒XXX-XXXX 日本」に変換して検索する。
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const normalized = normalizeSearchQuery(address);
  if (!normalized) return null;

  const tryQuery = async (q: string): Promise<GeocodingResult | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=jp`,
        {
          headers: {
            "User-Agent": "Street-Speech-Map/1.0", // Nominatimの利用規約に従う
          },
        }
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (data.length === 0) return null;
      const result = data[0];
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        displayName: result.display_name,
      };
    } catch {
      return null;
    }
  };

  try {
    let result = await tryQuery(normalized);
    if (!result && normalized !== address.trim()) {
      result = await tryQuery(address.trim());
    }
    if (!result && !/〒/.test(normalized)) {
      result = await tryQuery(`${normalized} 日本`);
    }
    return result;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

/**
 * 座標から住所を取得（逆ジオコーディング）
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Street-Speech-Map/1.0",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

