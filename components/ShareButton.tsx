"use client";

import { useState, useEffect } from "react";
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
  const [shareTemplateLive, setShareTemplateLive] = useState<string | null>(null);
  const [shareTemplatePlanned, setShareTemplatePlanned] = useState<string | null>(null);

  useEffect(() => {
    // 設定を取得
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        setShareTemplateLive(data.shareTemplateLive || null);
        setShareTemplatePlanned(data.shareTemplatePlanned || null);
      })
      .catch((error) => {
        console.error("Error fetching share templates:", error);
      });
  }, []);

  const getShareText = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${baseUrl}${eventUrl}`;
    
    // 候補者名から空白を削除してハッシュタグを作成
    const candidateHashtag = `#${candidateName.replace(/\s+/g, "")}`;

    let template: string;
    if (isLive) {
      template = shareTemplateLive || "{候補者名}さんが現在{場所}で街頭演説を行っています #チームみらい #{候補者名}";
    } else {
      template = shareTemplatePlanned || "{時間}から{候補者名}さんの街頭演説が{場所}で予定されています #チームみらい #{候補者名}";
    }

    // テンプレート内の変数を置換
    let text = template
      .replace(/{候補者名}/g, candidateName)
      .replace(/{場所}/g, locationText);

    if (!isLive) {
      const timeText = startAt || "時間未定";
      text = text.replace(/{時間}/g, timeText);
    }

    // #{候補者名}の形式も置換（後方互換性のため）
    text = text.replace(/#{候補者名}/g, candidateHashtag);

    return `${text}\n${url}`;
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
