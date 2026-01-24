"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit, ExternalLink } from "lucide-react";
import { formatJSTWithoutYear, formatJSTTime } from "@/lib/time";

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
  checkCount: number;
  reports?: Array<{ kind: string }>;
}

interface EventsPageClientProps {
  events: SpeechEvent[];
  candidates: Candidate[];
}

export default function EventsPageClient({ events, candidates }: EventsPageClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
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

  const handleStatusChange = async (eventId: string, currentStatus: string, newStatus: string, locationText: string) => {
    // ステータスが変更されない場合は何もしない
    if (currentStatus === newStatus) {
      return;
    }

    const statusLabels: Record<string, string> = {
      PLANNED: "予定",
      LIVE: "実施中",
      ENDED: "終了",
    };

    const currentLabel = statusLabels[currentStatus] || currentStatus;
    const newLabel = statusLabels[newStatus] || newStatus;

    // すべての変更で確認メッセージを表示
    if (!confirm(`「${locationText}」のステータスを${currentLabel}→${newLabel}に変更しますか？`)) {
      return;
    }

    setUpdatingStatusId(eventId);
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("ステータスの変更に失敗しました");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("エラーが発生しました");
    } finally {
      setUpdatingStatusId(null);
    }
  };


  const filteredEvents = events.filter((event) => {
    if (filterCandidateId && event.candidateId !== filterCandidateId) return false;
    if (filterStatus && event.status !== filterStatus) return false;
    return true;
  });

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "LIVE":
        return "実施中";
      case "ENDED":
        return "終了";
      default:
        return "予定";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 whitespace-nowrap">実施中</span>;
      case "ENDED":
        return <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 whitespace-nowrap">終了</span>;
      default:
        return <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 whitespace-nowrap">予定</span>;
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">候補者</TableHead>
                  <TableHead>時間</TableHead>
                  <TableHead className="w-16 whitespace-nowrap">状態</TableHead>
                  <TableHead>備考</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium whitespace-nowrap">{event.candidate.name}</span>
                        <span className="text-sm text-muted-foreground">{event.locationText}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {event.timeUnknown
                        ? "時間未定"
                        : event.startAt
                        ? `${formatJSTWithoutYear(event.startAt)}${event.endAt ? ` - ${formatJSTTime(event.endAt)}` : ""}`
                        : "時間未定"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <select
                        value={event.status}
                        onChange={(e) => handleStatusChange(event.id, event.status, e.target.value, event.locationText)}
                        disabled={updatingStatusId === event.id}
                        className="text-xs px-2 py-1 rounded border bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: event.status === "LIVE" ? "#fee2e2" : event.status === "ENDED" ? "#f3f4f6" : "#dbeafe",
                          color: event.status === "LIVE" ? "#991b1b" : event.status === "ENDED" ? "#374151" : "#1e40af",
                        }}
                      >
                        <option value="PLANNED">予定</option>
                        <option value="LIVE">実施中</option>
                        <option value="ENDED">終了</option>
                      </select>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {event.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/c/${event.candidate.slug}#event-${event.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            公開ページ
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/edit`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            編集
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(event.id, event.locationText)}
                          disabled={deletingId === event.id}
                          className="h-8 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

