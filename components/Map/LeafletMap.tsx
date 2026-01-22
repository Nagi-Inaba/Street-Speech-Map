"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// デフォルトアイコンの問題を修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LeafletMapProps {
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
}

export default function LeafletMap({
  center,
  zoom = 13,
  markers = [],
  onMapClick,
  editable = false,
  className = "h-96 w-full",
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // 地図の初期化（一度だけ実行）
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // 地図の初期化
    const map = L.map(mapContainerRef.current).setView(center, zoom);

    // タイルレイヤーの追加（OSM）
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // クリックイベント
    if (editable && onMapClick) {
      map.on("click", (e) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // マーカーの更新
  useEffect(() => {
    if (!mapRef.current) return;

    // 既存のマーカーを削除
    markersRef.current.forEach((marker) => {
      marker.remove();
    });
    markersRef.current = [];

    // 新しいマーカーを追加
    markers.forEach((markerData) => {
      const marker = L.marker(markerData.position, {
        draggable: editable,
      }).addTo(mapRef.current!);

      if (markerData.popup) {
        marker.bindPopup(markerData.popup);
      }

      if (editable && onMapClick) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onMapClick(pos.lat, pos.lng);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, editable, onMapClick]);

  return <div ref={mapContainerRef} className={className} />;
}
