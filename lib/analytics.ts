/**
 * 分析イベント計測
 * Umami等の分析基盤に送信
 */

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, string>) => void;
    };
  }
}

export function trackEvent(
  eventName: string,
  eventData?: Record<string, string>
): void {
  if (typeof window === "undefined") return;

  // Umami
  if (window.umami) {
    window.umami.track(eventName, eventData);
  }

  // 開発環境ではconsoleに出力
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", eventName, eventData);
  }
}

// イベント名の定義
export const AnalyticsEvents = {
  PAGE_VIEW: "page_view",
  SHARE_PLANNED_CLICK: "share_planned_click",
  SHARE_LIVE_CLICK: "share_live_click",
  REQUEST_SUBMIT: "request_submit",
  REPORT_START: "report_start",
  REPORT_END: "report_end",
  REPORT_MOVE: "report_move",
  ADMIN_APPROVE_BULK: "admin_approve_bulk",
} as const;
