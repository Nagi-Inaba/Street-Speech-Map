"use client";

import { useState, useEffect } from "react";
import { Copy, Twitter, Facebook, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareButtonsProps {
  eventUrl: string;
  candidateName: string;
  locationText: string;
  isLive: boolean;
  startAt?: string;
}

export default function ShareButtons({
  eventUrl,
  candidateName,
  locationText,
  isLive,
  startAt,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState("");

  useEffect(() => {
    // クライアント側でのみURLを生成
    if (typeof window !== "undefined") {
      setFullUrl(`${window.location.origin}${eventUrl}`);
    }
  }, [eventUrl]);

  const getShareText = () => {
    // 候補者名から空白を削除してハッシュタグを作成
    const candidateHashtag = `#${candidateName.replace(/\s+/g, "")}`;
    
    if (isLive) {
      return `${candidateName}さんが現在${locationText}で街頭演説を行っています #チームみらい ${candidateHashtag}`;
    } else {
      const timeText = startAt || "時間未定";
      return `${timeText}から${candidateName}さんの街頭演説が${locationText}で予定されています #チームみらい ${candidateHashtag}`;
    }
  };

  const handleCopyLink = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("コピーに失敗しました");
    }
  };

  const shareText = getShareText();
  const encodedText = fullUrl ? encodeURIComponent(`${shareText}\n${fullUrl}`) : "";
  const encodedUrl = fullUrl ? encodeURIComponent(fullUrl) : "";

  // Twitter/X
  const twitterUrl = fullUrl ? `https://twitter.com/intent/tweet?text=${encodedText}` : "#";

  // Facebook
  const facebookUrl = fullUrl ? `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` : "#";

  // LINE
  const lineUrl = fullUrl ? `https://social-plugins.line.me/lineit/share?url=${encodedUrl}` : "#";

  return (
    <div className="flex items-center gap-2">
      {/* リンクコピーボタン */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopyLink}
        className="h-8 w-8 p-0"
        title="リンクをコピー"
      >
        <Copy className={`h-4 w-4 ${copied ? "text-green-600" : ""}`} />
      </Button>

      {/* Twitter/X */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="h-8 w-8 p-0"
        title="Twitter/Xでシェア"
      >
        <a
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-500"
        >
          <Twitter className="h-4 w-4" />
        </a>
      </Button>

      {/* Facebook */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="h-8 w-8 p-0"
        title="Facebookでシェア"
      >
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700"
        >
          <Facebook className="h-4 w-4" />
        </a>
      </Button>

      {/* LINE */}
      <Button
        variant="ghost"
        size="sm"
        asChild
        className="h-8 w-8 p-0"
        title="LINEでシェア"
      >
        <a
          href={lineUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-500 hover:text-green-600"
        >
          <MessageCircle className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

