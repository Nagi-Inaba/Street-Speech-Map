import { format, formatInTimeZone } from "date-fns-tz";

const TIMEZONE = "Asia/Tokyo";

/**
 * UTC時刻をJST文字列に変換
 */
export function formatJST(date: Date | null | undefined): string {
  if (!date) return "未定";
  return formatInTimeZone(date, TIMEZONE, "yyyy年MM月dd日 HH:mm", {
    timeZone: TIMEZONE,
  });
}

/**
 * 日付のみ（時刻なし）
 */
export function formatJSTDate(date: Date | null | undefined): string {
  if (!date) return "未定";
  return formatInTimeZone(date, TIMEZONE, "yyyy年MM月dd日", {
    timeZone: TIMEZONE,
  });
}

/**
 * 時刻のみ
 */
export function formatJSTTime(date: Date | null | undefined): string {
  if (!date) return "未定";
  return formatInTimeZone(date, TIMEZONE, "HH:mm", {
    timeZone: TIMEZONE,
  });
}

/**
 * 現在時刻をJSTで取得
 */
export function nowJST(): Date {
  return new Date();
}

/**
 * JST文字列をUTC Dateに変換
 */
export function parseJST(dateString: string, timeString?: string): Date {
  const combined = timeString
    ? `${dateString}T${timeString}:00+09:00`
    : `${dateString}T00:00:00+09:00`;
  return new Date(combined);
}
