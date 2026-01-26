"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAreaFilterOptions, candidateMatchesArea } from "@/lib/area-filter";
import type { CandidateForArea } from "@/lib/area-filter";
import { formatJSTTime, formatJSTWithoutYear } from "@/lib/time";

export interface EventForArea {
  id: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  timeUnknown: boolean;
  locationText: string;
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
