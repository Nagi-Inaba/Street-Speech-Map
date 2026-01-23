"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function PublicHeader() {
  const [imageError, setImageError] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="flex items-center gap-3">
            {!imageError && (
              <div className="relative w-12 h-12 flex-shrink-0">
                <Image
                  src="/icon.png"
                  alt="チームみらい"
                  width={48}
                  height={48}
                  className="object-contain"
                  onError={() => setImageError(true)}
                  priority
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">チームみらい 街頭演説マップ</h1>
              <p className="text-sm text-gray-600">サポーター作・非公式サイト</p>
            </div>
          </Link>
        </div>
        <p className="text-gray-600">候補者の演説予定・実施中・終了を地図で可視化</p>
      </div>
    </header>
  );
}

