import { formatInTimeZone } from "date-fns-tz";

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
 * 年を省略した日時（M月dd日 HH:mm、先頭0なし）
 */
export function formatJSTWithoutYear(date: Date | null | undefined): string {
  if (!date) return "未定";
  return formatInTimeZone(date, TIMEZONE, "M月dd日 HH:mm", {
    timeZone: TIMEZONE,
  });
}

/**
 * 日のみ（dd日）
 */
export function formatJSTDay(date: Date | null | undefined): string {
  if (!date) return "";
  return formatInTimeZone(date, TIMEZONE, "d日", {
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

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/**
 * 今日（JST）の 00:00:00 と 23:59:59.999 を UTC の Date で返す（今日の演説数を数える用）
 */
export function getTodayJSTDateRange(): { start: Date; end: Date } {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  const d = jstNow.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - JST_OFFSET_MS);
  return { start, end };
}
