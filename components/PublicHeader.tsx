"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function PublicHeader() {
  const [imageError, setImageError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [candidateLabel, setCandidateLabel] = useState("候補者");

  useEffect(() => {
    setIsMounted(true);
    // 設定を取得
    fetch("/api/public/settings")
      .then((res) => res.json())
      .then((data) => {
        setCandidateLabel(data.candidateLabel !== undefined ? data.candidateLabel : "候補者");
      })
      .catch(() => {
        // エラー時はデフォルト値を使用
      });
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 overflow-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 min-w-0 max-w-full">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 min-h-[44px] py-1 -mx-1 px-1 rounded active:opacity-80">
            <div className={`relative w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 ${isMounted && imageError ? "hidden" : ""}`}>
              <Image
                src="/icon.png"
                alt="チームみらい"
                width={48}
                height={48}
                className="object-contain"
                onError={() => {
                  if (isMounted) {
                    setImageError(true);
                  }
                }}
                priority
              />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-gray-900 leading-tight break-words">チームみらい 街頭演説マップ</h1>
              <p className="text-xs sm:text-sm text-gray-600">サポーター作・非公式サイト</p>
            </div>
          </Link>
        </div>
        <p className="text-sm sm:text-base text-gray-600 break-words">
          {candidateLabel ? `${candidateLabel}の` : ""}演説予定・実施中・終了を地図で可視化
        </p>
      </div>
    </header>
  );
}

