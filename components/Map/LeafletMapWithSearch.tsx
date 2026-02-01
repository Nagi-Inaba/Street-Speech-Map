"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { geocodeAddress, reverseGeocode } from "@/lib/geocoding";

// LeafletはSSRで動作しないため、dynamic importを使用
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
      <span className="text-muted-foreground">地図を読み込み中...</span>
    </div>
  ),
});

interface LeafletMapWithSearchProps {
  center: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    position: [number, number];
    popup?: string;
    color?: string;
  }>;
  onMapClick?: (lat: number, lng: number) => void;
  editable?: boolean;
  className?: string;
  onCenterChange?: (lat: number, lng: number) => void;
}

export default function LeafletMapWithSearch({
  center,
  zoom = 13,
  markers = [],
  onMapClick,
  editable = false,
  className = "h-96 w-full",
  onCenterChange,
}: LeafletMapWithSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(center);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  // centerが変更されたときに地図の中心を更新
  useEffect(() => {
    setCurrentCenter(center);
  }, [center]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await geocodeAddress(searchQuery);
      if (result) {
        setCurrentCenter([result.lat, result.lng]);
        setCurrentZoom(15);
        if (onMapClick) {
          onMapClick(result.lat, result.lng);
        }
        if (onCenterChange) {
          onCenterChange(result.lat, result.lng);
        }
      } else {
        alert("住所が見つかりませんでした");
      }
    } catch (error) {
      console.error("Search error:", error);
      alert("検索中にエラーが発生しました");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-2">
      {/* 住所検索バー */}
      <div className="space-y-1">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="住所・地名・郵便番号（7桁）で検索"
              className="w-full px-3 py-2 pl-10 border rounded-md bg-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <Button
            type="button"
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
          >
            {isSearching ? "検索中..." : "検索"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ヒットしない場合は「○○駅」「○○駅西口」や郵便番号（7桁）で試してください。位置がずれたら地図上でピンを動かして調整できます。
        </p>
      </div>

      {/* 地図 */}
      <LeafletMap
        center={currentCenter}
        zoom={currentZoom}
        markers={markers}
        onMapClick={onMapClick}
        editable={editable}
        className={className}
      />
    </div>
  );
}

