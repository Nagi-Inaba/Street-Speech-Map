"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
    
    // 候補者名から空白を削除してハッシュタグを作成
    const candidateHashtag = `#${candidateName.replace(/\s+/g, "")}`;

    if (isLive) {
      return `${candidateName}さんが現在${locationText}で街頭演説を行っています #チームみらい ${candidateHashtag}\n${url}`;
    } else {
      const timeText = startAt || "時間未定";
      return `${timeText}から${candidateName}さんの街頭演説が${locationText}で予定されています #チームみらい ${candidateHashtag}\n${url}`;
    }
  };

  const handleShare = async () => {
    const shareText = getShareText();

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
