/**
 * 重複判定キーを生成
 * 同一候補・同日・同時間帯・位置グリッドで判定
 */
export function generateDedupeKey(params: {
  candidateId: string;
  date: string; // YYYY-MM-DD
  timeSlot?: string; // "morning" | "afternoon" | "evening" | "unknown"
  lat: number;
  lng: number;
}): string {
  const { candidateId, date, timeSlot, lat, lng } = params;

  // 位置を0.001度単位で丸める（約100m）
  const gridLat = Math.round(lat * 1000) / 1000;
  const gridLng = Math.round(lng * 1000) / 1000;

  return `${candidateId}:${date}:${timeSlot || "unknown"}:${gridLat}:${gridLng}`;
}

/**
 * 時刻から時間帯を判定
 */
export function getTimeSlot(hour: number | null): string {
  if (hour === null) return "unknown";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
