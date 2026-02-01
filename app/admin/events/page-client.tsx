"use client";

import { useState, useRef } from "react";
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
import { Plus, Trash2, Edit, ExternalLink, Upload, Loader2 } from "lucide-react";
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
  isPublic?: boolean;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  checkCount: number;
  reports?: Array<{ kind: string }>;
  additionalCandidates?: Array<{
    id: string;
    candidateId: string;
    candidate: Candidate;
  }>;
}

interface EventsPageClientProps {
  events: SpeechEvent[];
  candidates: Candidate[];
  defaultCandidateId?: string;
}

const NOT_ENDED = "NOT_ENDED";

export default function EventsPageClient({ events, candidates, defaultCandidateId }: EventsPageClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const bulkUpdatingRef = useRef(false);
  const deletingRef = useRef<string | null>(null);
  const updatingStatusRef = useRef<string | null>(null);
  const [filterCandidateId, setFilterCandidateId] = useState<string>(defaultCandidateId ?? "");
  const [filterStatus, setFilterStatus] = useState<string>(NOT_ENDED);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string, locationText: string) => {
    if (deletingRef.current) return;
    if (!confirm(`「${locationText}」の演説予定を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    deletingRef.current = id;
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
      deletingRef.current = null;
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (eventId: string, currentStatus: string, newStatus: string, locationText: string) => {
    if (updatingStatusRef.current === eventId) return;
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
    updatingStatusRef.current = eventId;
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
      updatingStatusRef.current = null;
      setUpdatingStatusId(null);
    }
  };


  const filteredEvents = events
    .filter((event) => {
      if (filterCandidateId && event.candidateId !== filterCandidateId) return false;
      if (filterStatus === NOT_ENDED) return event.status !== "ENDED";
      if (filterStatus && event.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      // ステータスが「ENDED」のものを最下部に移動
      if (a.status === "ENDED" && b.status !== "ENDED") return 1;
      if (a.status !== "ENDED" && b.status === "ENDED") return -1;
      // 両方ともENDEDのときは直近で終了が上：endAt 降順（なければ startAt 降順）
      if (a.status === "ENDED" && b.status === "ENDED") {
        const aTime = a.endAt ? new Date(a.endAt).getTime() : a.startAt ? new Date(a.startAt).getTime() : 0;
        const bTime = b.endAt ? new Date(b.endAt).getTime() : b.startAt ? new Date(b.startAt).getTime() : 0;
        return bTime - aTime;
      }
      // それ以外は日時順（startAt 昇順）
      if (a.startAt && b.startAt) {
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      }
      if (a.startAt) return -1;
      if (b.startAt) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEvents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEvents.map((e) => e.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: "LIVE" | "ENDED") => {
    if (bulkUpdatingRef.current) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const label = newStatus === "LIVE" ? "実施中" : "終了";
    if (!confirm(`選択した ${ids.length} 件のステータスを「${label}」に変更しますか？`)) return;
    bulkUpdatingRef.current = true;
    setBulkUpdating(true);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/admin/events/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        alert(`${failed.length} 件の更新に失敗しました。`);
      } else {
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("一括更新中にエラーが発生しました。");
    } finally {
      bulkUpdatingRef.current = false;
      setBulkUpdating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">演説予定一覧</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link href="/admin/events/new" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              新規追加
            </Button>
          </Link>
          <Link href="/admin/events/bulk" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">
              <Upload className="mr-2 h-4 w-4" />
              一括入稿
            </Button>
          </Link>
        </div>
      </div>

      {/* フィルター */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label htmlFor="filter-candidate" className="block text-sm font-medium mb-1">
            候補者で絞り込み
          </label>
          <select
            id="filter-candidate"
            value={filterCandidateId}
            onChange={(e) => setFilterCandidateId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white"
          >
            <option value="">すべて</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="filter-status" className="block text-sm font-medium mb-1">
            ステータスで絞り込み
          </label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white"
          >
            <option value={NOT_ENDED}>予定・実施中</option>
            <option value="">すべて</option>
            <option value="PLANNED">予定</option>
            <option value="LIVE">実施中</option>
            <option value="ENDED">終了</option>
          </select>
        </div>
      </div>

      {/* 一括操作 */}
      {filteredEvents.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredEvents.length && filteredEvents.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">すべて選択</span>
          </label>
          {selectedIds.size > 0 && (
            <>
              <Button
                size="sm"
                variant="default"
                onClick={() => handleBulkStatusChange("LIVE")}
                disabled={bulkUpdating}
              >
                {bulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                選択を実施中に
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleBulkStatusChange("ENDED")}
                disabled={bulkUpdating}
              >
                {bulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                選択を終了に
              </Button>
              <span className="text-sm text-muted-foreground">{selectedIds.size} 件選択中</span>
            </>
          )}
        </div>
      )}

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
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 px-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredEvents.length && filteredEvents.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4"
                      aria-label="すべて選択"
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap min-w-[120px]">候補者</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[150px]">時間</TableHead>
                  <TableHead className="whitespace-nowrap min-w-[80px]">状態</TableHead>
                  <TableHead className="min-w-[100px]">備考</TableHead>
                  <TableHead className="text-right whitespace-nowrap min-w-[200px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="w-10 px-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(event.id)}
                        onChange={() => toggleSelect(event.id)}
                        className="w-4 h-4"
                        aria-label={`${event.locationText} を選択`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium whitespace-nowrap">{event.candidate.name}</span>
                          {event.additionalCandidates && event.additionalCandidates.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              合同: {event.additionalCandidates
                                .filter((ec) => ec.candidate && ec.candidate.name)
                                .map((ec) => ec.candidate.name)
                                .join("、")}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{event.locationText}</span>
                        {event.isPublic === false && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 ml-1">非公開</span>
                        )}
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
                      <div className="flex flex-wrap items-center gap-2">
                        {event.status === "PLANNED" && (
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white h-8 min-w-[72px]"
                            onClick={() => handleStatusChange(event.id, event.status, "LIVE", event.locationText)}
                            disabled={updatingStatusId === event.id}
                          >
                            {updatingStatusId === event.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            開始に変更
                          </Button>
                        )}
                        {event.status === "LIVE" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 min-w-[72px]"
                            onClick={() => handleStatusChange(event.id, event.status, "ENDED", event.locationText)}
                            disabled={updatingStatusId === event.id}
                          >
                            {updatingStatusId === event.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            終了に変更
                          </Button>
                        )}
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
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {event.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link 
                          href={`/c/${event.candidate.slug}#event-${event.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs sm:text-sm"
                          >
                            <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">公開ページ</span>
                            <span className="sm:hidden">公開</span>
                          </Button>
                        </Link>
                        <Link href={`/admin/events/${event.id}/edit`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs sm:text-sm"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
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
                          {deletingId === event.id ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" /> : <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />}
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

