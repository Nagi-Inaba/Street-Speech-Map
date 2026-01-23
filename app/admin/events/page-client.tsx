"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatJSTDate, formatJSTTime } from "@/lib/time";
import { useRouter } from "next/navigation";

interface Event {
  id: string;
  candidateId: string;
  candidate: {
    id: string;
    name: string;
  };
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  timeUnknown: boolean;
  locationText: string;
  lat: number;
  lng: number;
  notes: string | null;
}

interface Candidate {
  id: string;
  name: string;
}

interface EventsPageClientProps {
  events: Event[];
  candidates: Candidate[];
}

export default function EventsPageClient({ events: initialEvents, candidates: initialCandidates }: EventsPageClientProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("all");
  const [updatingStatus, setUpdatingStatus] = useState<Set<string>>(new Set());
  const router = useRouter();

  // 全候補者の演説予定を日付順にソート（最初のシート用）
  const allEventsSorted = useMemo(() => {
    return [...initialEvents].sort((a, b) => {
      const aDate = a.startAt ? new Date(a.startAt).getTime() : Infinity;
      const bDate = b.startAt ? new Date(b.startAt).getTime() : Infinity;
      return aDate - bDate;
    });
  }, [initialEvents]);

  // 候補者ごとにグループ化
  const eventsByCandidate = useMemo(() => {
    const map = new Map<string, Event[]>();
    initialCandidates.forEach((candidate) => {
      const candidateEvents = initialEvents.filter((e) => e.candidateId === candidate.id);
      if (candidateEvents.length > 0) {
        map.set(candidate.id, candidateEvents);
      }
    });
    return map;
  }, [initialEvents, initialCandidates]);

  // 表示する演説予定を決定
  const displayEvents = useMemo(() => {
    if (selectedCandidateId === "all") {
      return allEventsSorted;
    }
    return eventsByCandidate.get(selectedCandidateId) || [];
  }, [selectedCandidateId, allEventsSorted, eventsByCandidate]);

  const handleStatusChange = async (eventId: string, newStatus: string) => {
    setUpdatingStatus((prev) => new Set(prev).add(eventId));
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("ステータスの更新に失敗しました");
      }
    } catch (error) {
      alert("エラーが発生しました");
    } finally {
      setUpdatingStatus((prev) => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">演説予定管理</h1>
        <Link href="/admin/events/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      {/* プルダウンで候補者選択 */}
      <div className="mb-6">
        <label htmlFor="candidate-select" className="block text-sm font-medium mb-2">
          候補者で絞り込み:
        </label>
        <select
          id="candidate-select"
          value={selectedCandidateId}
          onChange={(e) => setSelectedCandidateId(e.target.value)}
          className="px-3 py-2 border rounded-md bg-white min-w-[200px]"
        >
          <option value="all">すべて</option>
          {initialCandidates.map((candidate) => {
            const candidateEvents = eventsByCandidate.get(candidate.id);
            if (!candidateEvents || candidateEvents.length === 0) return null;
            return (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            );
          })}
        </select>
      </div>

      {/* 表形式で表示 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-muted">
              <tr>
                {selectedCandidateId === "all" && (
                  <th className="border p-2 text-left">候補者名</th>
                )}
                <th className="border p-2 text-left">日付</th>
                <th className="border p-2 text-left">場所</th>
                <th className="border p-2 text-left">時間</th>
                <th className="border p-2 text-left">備考</th>
                <th className="border p-2 text-left">ステータス</th>
                <th className="border p-2 text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              {displayEvents.map((event) => (
                <tr key={event.id} className="hover:bg-muted/50">
                  {selectedCandidateId === "all" && (
                    <td className="border p-2 font-medium">{event.candidate.name}</td>
                  )}
                  <td className="border p-2">
                    {event.startAt ? formatJSTDate(event.startAt) : "未定"}
                  </td>
                  <td className="border p-2">{event.locationText}</td>
                  <td className="border p-2">
                    {event.timeUnknown
                      ? "時間未定"
                      : event.startAt
                      ? `${formatJSTTime(event.startAt)}${event.endAt ? ` - ${formatJSTTime(event.endAt)}` : ""}`
                      : "未定"}
                  </td>
                  <td className="border p-2 text-sm text-muted-foreground">
                    {event.notes || "-"}
                  </td>
                  <td className="border p-2">
                    <select
                      value={event.status}
                      onChange={(e) => handleStatusChange(event.id, e.target.value)}
                      disabled={updatingStatus.has(event.id)}
                      className={`text-xs px-2 py-1 rounded border ${
                        event.status === "LIVE"
                          ? "bg-red-100 text-red-800 border-red-300"
                          : event.status === "ENDED"
                          ? "bg-gray-100 text-gray-800 border-gray-300"
                          : "bg-blue-100 text-blue-800 border-blue-300"
                      } ${updatingStatus.has(event.id) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <option value="PLANNED">予定</option>
                      <option value="LIVE">実施中</option>
                      <option value="ENDED">終了</option>
                    </select>
                  </td>
                  <td className="border p-2">
                    <Link href={`/admin/events/${event.id}/edit`}>
                      <Button variant="outline" size="sm">
                        編集
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayEvents.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            演説予定が登録されていません。
          </div>
        )}
      </div>
    </div>
  );
}

