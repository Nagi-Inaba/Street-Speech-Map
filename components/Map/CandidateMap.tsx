"use client";

import dynamic from "next/dynamic";

// LeafletはSSRで動作しないため、dynamic importを使用
const LeafletMap = dynamic(() => import("@/components/Map/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-gray-100 animate-pulse rounded-md flex items-center justify-center">
      <span className="text-muted-foreground">地図を読み込み中...</span>
    </div>
  ),
});

interface CandidateMapProps {
  center: [number, number];
  markers: Array<{
    id: string;
    position: [number, number];
    popup?: string;
    color?: string;
    isMoveHint?: boolean;
  }>;
}

export default function CandidateMap({ center, markers }: CandidateMapProps) {
  return (
    <LeafletMap
      center={center}
      zoom={13}
      markers={markers}
      className="h-96 w-full rounded-md"
    />
  );
}
