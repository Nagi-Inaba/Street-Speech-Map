"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface ShareButtonProps {
  candidateName: string;
  locationText: string;
  isLive: boolean;
  startAt?: string;
  eventUrl: string;
}

export default function ShareButton({
  candidateName,
  locationText,
  isLive,
  startAt,
  eventUrl,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const getShareText = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}${eventUrl}`;

    if (isLive) {
      return `${candidateName}さんは現在${locationText}付近で演説中です。\n${url}`;
    } else {
      const timeText = startAt || "時間未定";
      return `${candidateName}さんは${timeText}から${locationText}付近で演説予定です。\n${url}`;
    }
  };

  const handleShare = async () => {
    const shareText = getShareText();

    // 分析イベント計測
    trackEvent(
      isLive ? AnalyticsEvents.SHARE_LIVE_CLICK : AnalyticsEvents.SHARE_PLANNED_CLICK,
      {
        candidate: candidateName,
        location: locationText,
      }
    );

    // Web Share APIが使える場合はそれを使用
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: isLive ? `${candidateName}さん 演説中` : `${candidateName}さん 演説予定`,
          text: shareText,
        });
        return;
      } catch (error) {
        // ユーザーがキャンセルした場合は何もしない
        if ((error as Error).name === "AbortError") {
          return;
        }
        // それ以外のエラーはクリップボードコピーにフォールバック
      }
    }

    // クリップボードにコピー
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("コピーに失敗しました");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="min-w-[80px]"
    >
      {copied ? "コピー済み" : "共有"}
    </Button>
  );
}
