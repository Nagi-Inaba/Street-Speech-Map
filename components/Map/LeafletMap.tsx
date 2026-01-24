"use client";

import { useEffect, useRef, useState } from "react";

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
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const [leaflet, setLeaflet] = useState<any>(null);

  // Leafletの読み込みを待つ
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // CSSファイルを動的に読み込む
    import("leaflet/dist/leaflet.css").catch(() => {
      // CSSファイルの読み込みエラーは無視（既に読み込まれている可能性がある）
    });
    
    import("leaflet").then((L) => {
      // Leafletはデフォルトエクスポートなので、L.defaultまたはLを使用
      const leafletLib = L.default || L;
      
      if (!leafletLib || !leafletLib.marker) {
        console.error("Leaflet library not loaded correctly");
        return;
      }
      
      // デフォルトアイコンの問題を修正
      if (leafletLib.Icon && leafletLib.Icon.Default) {
        delete (leafletLib.Icon.Default.prototype as any)._getIconUrl;
        leafletLib.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
      }
      
      setLeaflet(leafletLib);
    }).catch((error) => {
      console.error("Failed to load Leaflet:", error);
    });
  }, []);

  // 地図の初期化（一度だけ実行）
  useEffect(() => {
    if (!leaflet || !mapContainerRef.current || mapRef.current) return;

    // 地図の初期化
    const map = leaflet.map(mapContainerRef.current).setView(center, zoom);

    // タイルレイヤーの追加（OSM）
    leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
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
  }, [leaflet]);

  // 地図の中心位置とズームレベルの更新
  useEffect(() => {
    if (!leaflet || !mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [leaflet, center, zoom]);

  // マーカーの更新
  useEffect(() => {
    if (!leaflet || !mapRef.current) return;

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
      if (!mapRef.current || !leaflet) return;

      // MoveHintの場合はオレンジ色のアイコンを使用
      let icon: any | undefined;
      try {
        if (markerData.isMoveHint) {
          icon = leaflet.icon({
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
          icon = leaflet.icon({
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
          icon = leaflet.icon({
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
        icon = undefined;
      }

      try {
        // leaflet.markerが存在するか確認
        if (!leaflet.marker) {
          console.error("leaflet.marker is not available");
          return;
        }

        // マーカーオプションを構築
        const markerOptions: any = {
          draggable: editable,
        };
        
        // iconが定義されている場合のみ追加
        if (icon) {
          markerOptions.icon = icon;
        }

        const marker = leaflet.marker(markerData.position, markerOptions);
        
        if (!marker) {
          console.error("Failed to create marker");
          return;
        }
        
        marker.addTo(mapRef.current);

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
  }, [leaflet, markers, editable, onMapClick]);

  // 地図クリック時にマーカーを移動（editableかつマーカーが1つの場合）
  useEffect(() => {
    if (!leaflet || !mapRef.current || !editable || !onMapClick) return;

    const handleMapClick = (e: any) => {
      // マーカーが1つだけの場合、そのマーカーを移動
      if (markers.length === 1 && markersRef.current.length === 1) {
        const marker = markersRef.current[0];
        if (marker) {
          marker.setLatLng(e.latlng);
          onMapClick(e.latlng.lat, e.latlng.lng);
        }
      } else if (markers.length === 0) {
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
  }, [leaflet, editable, onMapClick, markers]);

  if (!leaflet) {
    return (
      <div className={className + " bg-gray-100 animate-pulse rounded-md flex items-center justify-center"}>
        <span className="text-muted-foreground">地図を読み込み中...</span>
      </div>
    );
  }

  return <div ref={mapContainerRef} className={className} />;
}
