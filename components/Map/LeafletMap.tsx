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
    isMoveHint?: boolean;
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

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 地図の中心位置とズームレベルの更新
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  // マーカーの更新
  useEffect(() => {
    if (!mapRef.current) return;

    // 既存のマーカーを削除
    markersRef.current.forEach((marker) => {
      if (marker && mapRef.current) {
        try {
          marker.remove();
        } catch (error) {
          // マーカーが既に削除されている場合は無視
          console.warn("Failed to remove marker:", error);
        }
      }
    });
    markersRef.current = [];

    // 新しいマーカーを追加
    markers.forEach((markerData) => {
      if (!mapRef.current) return;

      // MoveHintの場合はオレンジ色のアイコンを使用
      let icon: L.Icon | undefined;
      try {
        if (markerData.isMoveHint) {
          icon = L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
            iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });
        } else if (markerData.color === "red") {
          // 赤色のマーカー（演説中）
          icon = L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
            iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });
        } else if (markerData.color === "blue") {
          // 青色のマーカー（予定）
          icon = L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
            iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          });
        }
      } catch (error) {
        console.error("Failed to create icon:", error);
        // アイコン作成に失敗した場合はデフォルトアイコンを使用
      }

      try {
        const marker = L.marker(markerData.position, {
          draggable: editable,
          icon: icon,
        }).addTo(mapRef.current);

        if (markerData.popup) {
          marker.bindPopup(markerData.popup);
        }

        if (editable && onMapClick) {
          // ドラッグ終了時に位置を更新
          marker.on("dragend", () => {
            const pos = marker.getLatLng();
            onMapClick(pos.lat, pos.lng);
          });
        }

        markersRef.current.push(marker);
      } catch (error) {
        console.error("Failed to add marker:", error);
      }
    });
  }, [markers, editable, onMapClick]);

  // 地図クリック時にマーカーを移動（editableかつマーカーが1つの場合）
  useEffect(() => {
    if (!mapRef.current || !editable || !onMapClick) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // マーカーが1つだけの場合、そのマーカーを移動
      if (markersRef.current.length === 1) {
        const marker = markersRef.current[0];
        if (marker) {
          marker.setLatLng(e.latlng);
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      } else if (markersRef.current.length === 0 && onMapClick) {
        // マーカーがない場合でもクリック位置を通知
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    mapRef.current.on("click", handleMapClick);

    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleMapClick);
      }
    };
  }, [editable, onMapClick]);

  return <div ref={mapContainerRef} className={className} />;
}
