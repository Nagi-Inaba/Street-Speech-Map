/**
 * 住所検索（ジオコーディング）機能
 * OpenStreetMap Nominatim APIを使用
 */

export interface GeocodingResult {
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * 住所から座標を取得（ジオコーディング）
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=jp`,
      {
        headers: {
          "User-Agent": "Street-Speech-Map/1.0", // Nominatimの利用規約に従う
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    };
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

