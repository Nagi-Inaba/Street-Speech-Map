"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAreaFilterOptions, candidateMatchesArea, REGION_BLOCK_DEFS } from "@/lib/area-filter";
import type { CandidateForArea } from "@/lib/area-filter";
import { formatJSTTime, formatJSTWithoutYear } from "@/lib/time";
import { getPrefectureCoordinates, PREFECTURE_COORDINATES } from "@/lib/constants";
import LeafletMap from "@/components/Map/LeafletMap";

export interface EventForArea {
  id: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  timeUnknown: boolean;
  locationText: string;
  lat: number;
  lng: number;
  candidateId: string;
  candidate: { name: string; slug: string };
  additionalCandidates?: Array<{ candidate: { name: string } }>;
}

export interface CandidateWithEventsForArea extends CandidateForArea {
  events: EventForArea[];
}

interface AreaEventsViewProps {
  candidates: CandidateWithEventsForArea[];
  showCandidateInfo: boolean;
  candidateLabel: string;
}

export default function AreaEventsView({
  candidates,
  showCandidateInfo,
  candidateLabel,
}: AreaEventsViewProps) {
  const options = getAreaFilterOptions();
  const [areaId, setAreaId] = useState<string>("all");

  // エリアで絞り込んだ候補者のうち、イベントが1件以上あるもの。各候補のイベントのみを渡す
  const { liveEvents, plannedEvents, endedEvents } = useMemo(() => {
    const live: EventForArea[] = [];
    const planned: EventForArea[] = [];
    const ended: EventForArea[] = [];

    for (const c of candidates) {
      if (!candidateMatchesArea(c, areaId)) continue;
      for (const e of c.events) {
        const ev = { ...e, candidate: { name: c.name, slug: c.slug } };
        if (e.status === "LIVE") live.push(ev);
        else if (e.status === "PLANNED") planned.push(ev);
        else if (e.status === "ENDED") ended.push(ev);
      }
    }

    // 実施中→予定→終了の順。実施中・予定は startAt で、終了は startAt の降順
    const sortByStart = (a: EventForArea, b: EventForArea) => {
      const pa = a.startAt ? new Date(a.startAt).getTime() : 0;
      const pb = b.startAt ? new Date(b.startAt).getTime() : 0;
      return pa - pb;
    };
    live.sort(sortByStart);
    planned.sort(sortByStart);
    ended.sort((a, b) => {
      const pa = a.startAt ? new Date(a.startAt).getTime() : 0;
      const pb = b.startAt ? new Date(b.startAt).getTime() : 0;
      return pb - pa;
    });

    return { liveEvents: live, plannedEvents: planned, endedEvents: ended };
  }, [candidates, areaId]);

  const totalCount = liveEvents.length + plannedEvents.length + endedEvents.length;

  const getTypeLabel = (c: CandidateForArea) => {
    if (c.type === "PARTY_LEADER") return "党首";
    if (!showCandidateInfo) return null;
    if (c.type === "SINGLE" && c.region) return c.region;
    if (c.type === "PROPORTIONAL" && c.region) return c.region;
    if (c.type === "SUPPORT") return "応援弁士";
    return null;
  };

  const renderEventCard = (
    event: EventForArea & { candidate: { name: string; slug: string } },
    candidate: CandidateWithEventsForArea,
    statusLabel: string,
    cardClass: string
  ) => {
    const typeLabel = getTypeLabel(candidate);
    const names = [event.candidate.name];
    if (event.additionalCandidates?.length) {
      event.additionalCandidates.forEach((a) => names.push(a.candidate.name));
    }
    const candidateLabel = names.length > 1 ? `${names[0]} ほか${names.length - 1}名` : names[0];
    const timeText = event.timeUnknown
      ? "時間未定"
      : event.startAt
      ? `${formatJSTWithoutYear(new Date(event.startAt))}${event.endAt ? ` - ${formatJSTTime(new Date(event.endAt))}` : ""}`
      : "時間未定";

    return (
      <Card key={event.id} className={cardClass}>
        <CardHeader className="py-3">
          <CardTitle className="text-base flex flex-wrap items-center gap-2">
            <Link
              href={`/c/${candidate.slug}#event-${event.id}`}
              className="hover:underline text-primary"
            >
              {candidateLabel}
            </Link>
            {typeLabel && (
              <span className="text-xs font-normal text-muted-foreground">{typeLabel}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-muted">{statusLabel}</span>
          </CardTitle>
          <CardDescription>
            {event.locationText}
            <span className="ml-2 text-muted-foreground">{" · "}{timeText}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2 pt-0">
          <Link
            href={`/c/${candidate.slug}#event-${event.id}`}
            className="text-sm text-primary hover:underline"
          >
            {candidate.name}さんのページへ →
          </Link>
        </CardContent>
      </Card>
    );
  };

  // イベントから候補者を引く
  const getCandidate = (candidateId: string) => candidates.find((c) => c.id === candidateId)!;

  // 地図用のマーカーを生成
  const mapMarkers = useMemo(() => {
    const allEvents = [...liveEvents, ...plannedEvents, ...endedEvents];
    return allEvents.map((event) => {
      const candidate = getCandidate(event.candidateId);
      const names = [event.candidate.name];
      if (event.additionalCandidates?.length) {
        event.additionalCandidates.forEach((a) => names.push(a.candidate.name));
      }
      const candidateLabel = names.length > 1 ? `${names[0]} ほか${names.length - 1}名` : names[0];
      
      // 吹き出しの内容（候補者名を黒字で表示）
      const popupContent = `<div style="color: black; font-weight: bold;">${candidateLabel}</div>`;
      
      return {
        id: event.id,
        position: [event.lat, event.lng] as [number, number],
        popup: popupContent,
        color: event.status === "LIVE" ? "red" : event.status === "ENDED" ? undefined : "blue",
      };
    });
  }, [liveEvents, plannedEvents, endedEvents, candidates]);

  // 地図の中心位置とズームレベルを計算
  const { mapCenter, mapZoom } = useMemo(() => {
    // エリアフィルタに応じて中心位置とズームを決定
    if (areaId === "all") {
      // すべてのエリア: すべてのイベントの中心
      if (mapMarkers.length === 0) return { mapCenter: [35.6812, 139.7671] as [number, number], mapZoom: 6 };
      const avgLat = mapMarkers.reduce((sum, m) => sum + m.position[0], 0) / mapMarkers.length;
      const avgLng = mapMarkers.reduce((sum, m) => sum + m.position[1], 0) / mapMarkers.length;
      return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: 10 };
    } else if (areaId.startsWith("block:")) {
      // 地域ブロック: ブロックの中心座標を計算
      const blockKey = areaId.slice(6);
      const def = REGION_BLOCK_DEFS[blockKey];
      if (def && def.prefectures.length > 0) {
        // ブロック内の都道府県の座標の平均を計算
        const coords = def.prefectures
          .map((pref) => PREFECTURE_COORDINATES[pref])
          .filter((coord): coord is [number, number] => coord !== undefined);
        if (coords.length > 0) {
          const avgLat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
          const avgLng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
          return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: 8 };
        }
      }
      // フォールバック: イベントの中心
      if (mapMarkers.length > 0) {
        const avgLat = mapMarkers.reduce((sum, m) => sum + m.position[0], 0) / mapMarkers.length;
        const avgLng = mapMarkers.reduce((sum, m) => sum + m.position[1], 0) / mapMarkers.length;
        return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: 8 };
      }
      return { mapCenter: [35.6812, 139.7671] as [number, number], mapZoom: 6 };
    } else if (areaId.startsWith("pref:")) {
      // 都道府県: その都道府県の中心座標
      const prefecture = areaId.slice(5);
      const coords = getPrefectureCoordinates(prefecture);
      if (coords) {
        return { mapCenter: coords, mapZoom: 10 };
      }
      // フォールバック: イベントの中心
      if (mapMarkers.length > 0) {
        const avgLat = mapMarkers.reduce((sum, m) => sum + m.position[0], 0) / mapMarkers.length;
        const avgLng = mapMarkers.reduce((sum, m) => sum + m.position[1], 0) / mapMarkers.length;
        return { mapCenter: [avgLat, avgLng] as [number, number], mapZoom: 10 };
      }
      return { mapCenter: [35.6812, 139.7671] as [number, number], mapZoom: 6 };
    }
    
    // デフォルト
    return { mapCenter: [35.6812, 139.7671] as [number, number], mapZoom: 6 };
  }, [mapMarkers, areaId]);

  return (
    <div className="space-y-6">
      {/* フィルター */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <label htmlFor="area-filter" className="text-sm font-medium shrink-0">
          エリアで絞り込む
        </label>
        <select
          id="area-filter"
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="max-w-md w-full px-3 py-2 border rounded-md bg-white"
        >
          <option value="all">{options[0]?.label ?? "すべてのエリア"}</option>
          <optgroup label="地域ブロック">
            {options.filter((o) => o.group === "block").map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </optgroup>
          <optgroup label="都道府県">
            {options.filter((o) => o.group === "prefecture").map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* 地図 */}
      {totalCount > 0 && (
        <div className="w-full">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">地図で見る</h2>
          <LeafletMap
            center={mapCenter}
            zoom={mapZoom}
            markers={mapMarkers}
            className="h-96 w-full rounded-md border"
          />
        </div>
      )}

      {totalCount === 0 ? (
        <p className="text-muted-foreground py-8">
          {areaId === "all" ? "演説予定はまだ登録されていません。" : "このエリアには演説予定がありません。"}
        </p>
      ) : (
        <div className="space-y-8">
          {liveEvents.length > 0 && (
            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-600">実施中</h2>
              <div className="space-y-3">
                {liveEvents.map((e) => renderEventCard(e, getCandidate(e.candidateId), "実施中", "border-red-200 bg-red-50"))}
              </div>
            </section>
          )}

          {plannedEvents.length > 0 && (
            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-4">予定</h2>
              <div className="space-y-3">
                {plannedEvents.map((e) => renderEventCard(e, getCandidate(e.candidateId), "予定", ""))}
              </div>
            </section>
          )}

          {endedEvents.length > 0 && (
            <section>
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-muted-foreground">終了</h2>
              <div className="space-y-3">
                {endedEvents.map((e) => renderEventCard(e, getCandidate(e.candidateId), "終了", "opacity-75"))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
