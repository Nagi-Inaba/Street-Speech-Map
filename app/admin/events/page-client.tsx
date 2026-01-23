"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { formatJST, formatJSTTime } from "@/lib/time";

interface Candidate {
  id: string;
  name: string;
  slug: string;
}

interface SpeechEvent {
  id: string;
  candidateId: string;
  candidate: Candidate;
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  timeUnknown: boolean;
  locationText: string;
  lat: number;
  lng: number;
  notes: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface EventsPageClientProps {
  events: SpeechEvent[];
  candidates: Candidate[];
}

export default function EventsPageClient({ events, candidates }: EventsPageClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCandidateId, setFilterCandidateId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const handleDelete = async (id: string, locationText: string) => {
    if (!confirm(`「${locationText}」の演説予定を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("エラーが発生しました");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEvents = events.filter((event) => {
    if (filterCandidateId && event.candidateId !== filterCandidateId) return false;
    if (filterStatus && event.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">実施中</span>;
      case "ENDED":
        return <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">終了</span>;
      default:
        return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">予定</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">演説予定一覧</h1>
        <Link href="/admin/events/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規追加
          </Button>
        </Link>
      </div>

      {/* フィルター */}
      <div className="mb-6 flex gap-4">
        <div>
          <label htmlFor="filter-candidate" className="block text-sm font-medium mb-1">
            候補者で絞り込み
          </label>
          <select
            id="filter-candidate"
            value={filterCandidateId}
            onChange={(e) => setFilterCandidateId(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
          >
            <option value="">すべて</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-status" className="block text-sm font-medium mb-1">
            ステータスで絞り込み
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
          >
            <option value="">すべて</option>
            <option value="PLANNED">予定</option>
            <option value="LIVE">実施中</option>
            <option value="ENDED">終了</option>
          </select>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {events.length === 0
              ? "演説予定が登録されていません"
              : "条件に一致する演説予定がありません"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span>{event.locationText}</span>
                    {getStatusBadge(event.status)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(event.id, event.locationText)}
                    disabled={deletingId === event.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  <div className="space-y-1">
                    <div>候補者: {event.candidate.name}</div>
                    <div>
                      時間:{" "}
                      {event.timeUnknown
                        ? "時間未定"
                        : event.startAt
                        ? `${formatJST(event.startAt)}${event.endAt ? ` - ${formatJSTTime(event.endAt)}` : ""}`
                        : "時間未定"}
                    </div>
                    {event.notes && <div>備考: {event.notes}</div>}
                  </div>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

