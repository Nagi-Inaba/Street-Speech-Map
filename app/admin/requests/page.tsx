"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeafletMap from "@/components/Map/LeafletMap";
import { X, MapPin, Info } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
}

interface PublicRequest {
  id: string;
  type: string;
  status: string;
  candidateId: string | null;
  candidate: Candidate | null;
  eventId: string | null;
  payload: string;
  dedupeKey: string | null;
  createdAt: string;
}

interface EventWithRequests {
  event: {
    id: string | null; // eventIdがないリクエストの場合null
    locationText: string;
    startAt: string | null;
    endAt: string | null;
    status: string | null;
    candidate: Candidate | null;
  };
  requests: PublicRequest[];
  requestsByType: {
    CREATE_EVENT: PublicRequest[];
    UPDATE_EVENT: PublicRequest[];
    REPORT_START: PublicRequest[];
    REPORT_END: PublicRequest[];
    REPORT_MOVE: PublicRequest[];
    REPORT_TIME_CHANGE: PublicRequest[];
  };
}

const TYPE_LABELS: Record<string, string> = {
  CREATE_EVENT: "新規演説予定",
  UPDATE_EVENT: "演説予定更新",
  REPORT_START: "開始報告",
  REPORT_END: "終了報告",
  REPORT_MOVE: "場所変更報告",
  REPORT_TIME_CHANGE: "時間変更報告",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "未承認",
  APPROVED: "承認済み",
  REJECTED: "却下",
  DUPLICATE: "重複",
};

interface RequestItemProps {
  request: PublicRequest;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onBulkAction: (action: "approve" | "reject", selectedIds: Set<string>) => void;
  setSelectedIds: (ids: Set<string>) => void;
  isProcessing: boolean;
  filterStatus: string;
  parsePayload: (payload: string) => any;
  formatDate: (dateString: string) => string;
  setMapModal: (modal: { lat: number; lng: number; locationText?: string } | null) => void;
  setDetailModal: (request: PublicRequest | null) => void;
}

function RequestItem({
  request,
  selectedIds,
  onSelect,
  onBulkAction,
  setSelectedIds,
  isProcessing,
  filterStatus,
  parsePayload,
  formatDate,
  setMapModal,
  setDetailModal,
}: RequestItemProps) {
  const payload = parsePayload(request.payload);
  const isPublicReport = request.id.startsWith("report_"); // PublicReport由来のリクエスト

  return (
    <div className="border rounded-md p-3 bg-muted/50">
      <div className="flex items-center gap-2 mb-2">
        {filterStatus === "PENDING" && !isPublicReport && (
          <input
            type="checkbox"
            checked={selectedIds.has(request.id)}
            onChange={() => onSelect(request.id)}
            className="w-4 h-4"
          />
        )}
        <span
          className={`text-xs px-2 py-1 rounded ${
            request.status === "PENDING"
              ? "bg-yellow-100 text-yellow-800"
              : request.status === "APPROVED"
              ? "bg-green-100 text-green-800"
              : request.status === "REJECTED"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {STATUS_LABELS[request.status] || request.status}
          {isPublicReport && <span className="ml-1">（自動処理済み）</span>}
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(request.createdAt)}
        </span>
      </div>
      <div className="text-sm space-y-1 mb-2">
        {payload.locationText && (
          <p className="text-xs font-medium">場所: {payload.locationText}</p>
        )}
        {(payload.lat && payload.lng) && (
          <div className="flex items-center gap-2">
            <p className="text-xs">
              座標: {payload.lat.toFixed(6)}, {payload.lng.toFixed(6)}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMapModal({ lat: payload.lat, lng: payload.lng, locationText: payload.locationText })}
              className="text-xs h-6"
            >
              <MapPin className="h-3 w-3 mr-1" />
              地図
            </Button>
          </div>
        )}
        {payload.newLat && payload.newLng && (
          <div className="flex items-center gap-2">
            <p className="text-xs">
              新しい座標: {payload.newLat.toFixed(6)}, {payload.newLng.toFixed(6)}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMapModal({ lat: payload.newLat, lng: payload.newLng, locationText: payload.locationText })}
              className="text-xs h-6"
            >
              <MapPin className="h-3 w-3 mr-1" />
              地図
            </Button>
          </div>
        )}
        {payload.startAt && (
          <p className="text-xs">
            開始: {new Date(payload.startAt).toLocaleString("ja-JP")}
          </p>
        )}
        {payload.endAt && (
          <p className="text-xs">
            終了: {new Date(payload.endAt).toLocaleString("ja-JP")}
          </p>
        )}
        {payload.newStartAt && (
          <p className="text-xs">
            新しい開始時刻: {new Date(payload.newStartAt).toLocaleString("ja-JP")}
          </p>
        )}
        {payload.newEndAt && (
          <p className="text-xs">
            新しい終了時刻: {new Date(payload.newEndAt).toLocaleString("ja-JP")}
          </p>
        )}
      </div>
      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDetailModal(request)}
          className="h-7 text-xs"
        >
          <Info className="h-3 w-3 mr-1" />
          詳細
        </Button>
        {request.status === "PENDING" && !isPublicReport && (
          <>
            <Button
              size="sm"
              onClick={() => {
                setSelectedIds(new Set([request.id]));
                onBulkAction("approve", new Set([request.id]));
              }}
              disabled={isProcessing}
              className="h-7 text-xs"
            >
              承認
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedIds(new Set([request.id]));
                onBulkAction("reject", new Set([request.id]));
              }}
              disabled={isProcessing}
              className="h-7 text-xs"
            >
              却下
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [eventsWithRequests, setEventsWithRequests] = useState<EventWithRequests[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterCandidateId, setFilterCandidateId] = useState("");
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [groupByEvent, setGroupByEvent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapModal, setMapModal] = useState<{ lat: number; lng: number; locationText?: string } | null>(null);
  const [detailModal, setDetailModal] = useState<PublicRequest | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCandidateId) params.set("candidateId", filterCandidateId);
      if (filterStatus) params.set("status", filterStatus);
      if (groupByEvent) params.set("groupByEvent", "true");
      
      const res = await fetch(`/api/admin/requests?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (groupByEvent && Array.isArray(data) && data.length > 0 && data[0].event) {
          setEventsWithRequests(data);
          setRequests([]);
        } else {
          setRequests(data);
          setEventsWithRequests([]);
        }
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 候補者一覧を取得
    fetch("/api/admin/candidates")
      .then((res) => res.json())
      .then((data) => setCandidates(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchRequests();
    setSelectedIds(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCandidateId, filterStatus, groupByEvent]);

  const handleSelectAll = () => {
    // groupByEventがtrueの場合、eventsWithRequestsからすべてのリクエストを収集
    let allPendingRequests: PublicRequest[] = [];
    if (groupByEvent && eventsWithRequests.length > 0) {
      eventsWithRequests.forEach((eventWithRequests) => {
        const filtered = eventWithRequests.requests.filter(
          (r) => r.status === "PENDING" && !r.id.startsWith("report_")
        );
        allPendingRequests.push(...filtered);
      });
    } else {
      allPendingRequests = requests.filter((r) => r.status === "PENDING");
    }

    if (selectedIds.size === allPendingRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPendingRequests.map((r) => r.id)));
    }
  };

  const handleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: "approve" | "reject", idsToProcess?: Set<string>) => {
    const ids = idsToProcess || selectedIds;
    if (ids.size === 0) return;
    
    if (!confirm(`${ids.size}件のリクエストを${action === "approve" ? "承認" : "却下"}しますか？`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch("/api/admin/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(ids),
          action,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await fetchRequests();
        setSelectedIds(new Set());
        
        // 警告メッセージの構築
        let message = "";
        if (data.warnings && data.warnings.length > 0) {
          message = data.message || `${data.updatedCount || ids.size}件のリクエストを承認しましたが、${data.warnings.length}件の処理でエラーが発生しました。\n\n`;
          data.warnings.forEach((warning: any) => {
            message += `・${TYPE_LABELS[warning.type] || warning.type} (ID: ${warning.requestId}): ${warning.error}\n`;
          });
        } else if (data.updatedCount !== undefined && data.updatedCount < ids.size) {
          message = `${data.updatedCount}件のリクエストを処理しました。${ids.size - data.updatedCount}件は既に処理済みまたは存在しませんでした。`;
        } else if (data.message) {
          message = data.message;
        }
        
        if (message) {
          alert(message);
        }
      } else {
        const errorMessage =
          data.details || data.error || "処理に失敗しました";
        if (data.details && typeof data.details === "object") {
          const details = data.details;
          let message = errorMessage + "\n\n";
          if (details.notFound && details.notFound.length > 0) {
            message += `存在しないリクエスト: ${details.notFound.length}件\n`;
          }
          if (details.alreadyProcessed && details.alreadyProcessed.length > 0) {
            message += `既に処理済み: ${details.alreadyProcessed.length}件\n`;
          }
          alert(message);
        } else {
          alert(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error processing requests:", error);
      const errorMessage =
        error instanceof Error ? error.message : "エラーが発生しました";
      alert(`エラーが発生しました: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const parsePayload = (payload: string) => {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  };

  // 重複キーでグループ化（従来の表示用）
  // requestsは既にAPI側でfilterStatusに基づいてフィルタリングされている
  const groupedByDedupe = new Map<string, PublicRequest[]>();
  requests.forEach((req) => {
    const key = req.dedupeKey || req.id;
    if (!groupedByDedupe.has(key)) {
      groupedByDedupe.set(key, []);
    }
    groupedByDedupe.get(key)!.push(req);
  });


  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">リクエスト審査</h1>

      {/* フィルター */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">候補者</label>
          <select
            value={filterCandidateId}
            onChange={(e) => setFilterCandidateId(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white"
          >
            <option value="">すべて</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">状態</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-white"
          >
            <option value="">すべて</option>
            <option value="PENDING">未承認</option>
            <option value="APPROVED">承認済み</option>
            <option value="REJECTED">却下</option>
            <option value="DUPLICATE">重複</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByEvent}
              onChange={(e) => setGroupByEvent(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">予定ごとにまとめる</span>
          </label>
        </div>
      </div>

      {/* 一括操作 */}
      {filterStatus === "PENDING" && (() => {
        // 表示されている未承認リクエストの数を計算
        let pendingCount = 0;
        if (groupByEvent && eventsWithRequests.length > 0) {
          eventsWithRequests.forEach((eventWithRequests) => {
            pendingCount += eventWithRequests.requests.filter(
              (r) => r.status === "PENDING" && !r.id.startsWith("report_")
            ).length;
          });
        } else {
          pendingCount = requests.filter((r) => r.status === "PENDING").length;
        }
        return (
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs sm:text-sm"
            >
              {selectedIds.size === pendingCount && pendingCount > 0 ? "選択解除" : "すべて選択"}
            </Button>
          <Button
            size="sm"
            onClick={() => handleBulkAction("approve")}
            disabled={selectedIds.size === 0 || isProcessing}
            className="text-xs sm:text-sm"
          >
            {isProcessing ? "処理中..." : `一括承認 (${selectedIds.size})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("reject")}
            disabled={selectedIds.size === 0 || isProcessing}
            className="text-xs sm:text-sm"
          >
            一括却下 ({selectedIds.size})
          </Button>
          </div>
        );
      })()}

      {/* リクエスト一覧 */}
      {isLoading ? (
        <p className="text-muted-foreground">読み込み中...</p>
      ) : groupByEvent && eventsWithRequests.length > 0 ? (
        <div className="space-y-4">
          {eventsWithRequests.map((eventWithRequests, index) => {
            // filterStatusでフィルタリング
            const filteredRequests = eventWithRequests.requests.filter(
              (r) => !filterStatus || filterStatus === "" || r.status === filterStatus
            );

            if (filteredRequests.length === 0) return null;

            const isEventCreated = eventWithRequests.event.id !== null;
            const event = eventWithRequests.event;

            return (
              <Card key={event.id || `no-event-${index}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      {isEventCreated ? (
                        <>
                          {event.candidate?.name || "候補者不明"} - {event.locationText}
                        </>
                      ) : (
                        "イベント未作成のリクエスト"
                      )}
                    </span>
                    {isEventCreated && (
                      <span className={`text-sm px-2 py-1 rounded ${
                        event.status === "LIVE" ? "bg-red-100 text-red-800" :
                        event.status === "ENDED" ? "bg-gray-100 text-gray-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {event.status === "PLANNED" ? "予定" :
                         event.status === "LIVE" ? "実施中" : "終了"}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {isEventCreated ? (
                      <>
                        {event.startAt && (
                          <span>開始: {new Date(event.startAt).toLocaleString("ja-JP")}</span>
                        )}
                        {event.endAt && (
                          <span className="ml-4">終了: {new Date(event.endAt).toLocaleString("ja-JP")}</span>
                        )}
                        {!event.startAt && !event.endAt && (
                          <span>時間未定</span>
                        )}
                      </>
                    ) : (
                      <span>新規登録や更新のリクエスト</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {filteredRequests.map((req) => (
                      <RequestItem
                        key={req.id}
                        request={req}
                        selectedIds={selectedIds}
                        onSelect={handleSelect}
                        onBulkAction={handleBulkAction}
                        setSelectedIds={setSelectedIds}
                        isProcessing={isProcessing}
                        filterStatus={filterStatus}
                        parsePayload={parsePayload}
                        formatDate={formatDate}
                        setMapModal={setMapModal}
                        setDetailModal={setDetailModal}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(groupedByDedupe.entries()).map(([key, group]) => {
            const representative = group[0];
            const duplicates = group.slice(1);
            const payload = parsePayload(representative.payload);

            return (
              <Card key={key}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    {filterStatus === "PENDING" && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(representative.id)}
                        onChange={() => handleSelect(representative.id)}
                        className="w-4 h-4"
                      />
                    )}
                    <div className="flex-1">
                      <CardTitle className="flex items-center justify-between">
                        <span>
                          {TYPE_LABELS[representative.type] || representative.type}
                          {representative.candidate && ` - ${representative.candidate.name}`}
                        </span>
                        <span
                          className={`text-sm px-2 py-1 rounded ${
                            representative.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : representative.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : representative.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {STATUS_LABELS[representative.status] || representative.status}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {formatDate(representative.createdAt)}
                        {duplicates.length > 0 && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            類似: {duplicates.length}件
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1 bg-muted p-3 rounded-md mb-4">
                    {payload.locationText && (
                      <p>場所: {payload.locationText}</p>
                    )}
                    {payload.startAt && (
                      <p>開始: {new Date(payload.startAt).toLocaleString("ja-JP")}</p>
                    )}
                    {payload.endAt && (
                      <p>終了: {new Date(payload.endAt).toLocaleString("ja-JP")}</p>
                    )}
                    {payload.lat && payload.lng && (
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          座標: {payload.lat.toFixed(6)}, {payload.lng.toFixed(6)}
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMapModal({ lat: payload.lat, lng: payload.lng, locationText: payload.locationText })}
                          className="text-xs"
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          地図
                        </Button>
                      </div>
                    )}
                    {(!payload.lat || !payload.lng) && (
                      <p className="text-xs text-yellow-600">
                        ⚠️ 位置情報が不足しています
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDetailModal(representative)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      詳細
                    </Button>
                    {representative.status === "PENDING" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedIds(new Set([representative.id]));
                            handleBulkAction("approve");
                          }}
                          disabled={isProcessing}
                        >
                          承認
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedIds(new Set([representative.id]));
                            handleBulkAction("reject");
                          }}
                          disabled={isProcessing}
                        >
                          却下
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && requests.length === 0 && eventsWithRequests.length === 0 && (
        <p className="text-muted-foreground">リクエストがありません。</p>
      )}

      {/* 地図モーダル */}
      {mapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-lg flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                {mapModal.locationText || "位置確認"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMapModal(null)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* 地図 */}
            <div className="flex-1 overflow-hidden">
              <LeafletMap
                center={[mapModal.lat, mapModal.lng]}
                zoom={15}
                markers={[
                  {
                    id: "location",
                    position: [mapModal.lat, mapModal.lng],
                    popup: mapModal.locationText || "位置",
                  },
                ]}
                className="h-full w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* 詳細表示モーダル */}
      <Dialog open={!!detailModal} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          {detailModal && (() => {
            const payload = parsePayload(detailModal.payload);
            const isPublicReport = detailModal.id.startsWith("report_");
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle>
                    {TYPE_LABELS[detailModal.type] || detailModal.type} - 詳細情報
                  </DialogTitle>
                  <DialogDescription>
                    {detailModal.candidate?.name || "候補者不明"} | {formatDate(detailModal.createdAt)}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* 基本情報 */}
                  <div>
                    <h3 className="font-semibold mb-2">基本情報</h3>
                    <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                      <p><span className="font-medium">ステータス:</span> {STATUS_LABELS[detailModal.status] || detailModal.status}</p>
                      <p><span className="font-medium">リクエストID:</span> {detailModal.id}</p>
                      {detailModal.candidate && (
                        <p><span className="font-medium">候補者:</span> {detailModal.candidate.name}</p>
                      )}
                      {detailModal.eventId && (
                        <p><span className="font-medium">イベントID:</span> {detailModal.eventId}</p>
                      )}
                      {isPublicReport && (
                        <p className="text-xs text-muted-foreground">（自動処理済みの報告）</p>
                      )}
                    </div>
                  </div>

                  {/* 場所情報 */}
                  {(payload.locationText || payload.lat || payload.lng) && (
                    <div>
                      <h3 className="font-semibold mb-2">場所情報</h3>
                      <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                        {payload.locationText && (
                          <p><span className="font-medium">場所:</span> {payload.locationText}</p>
                        )}
                        {(payload.lat && payload.lng) && (
                          <div className="flex items-center gap-2">
                            <p><span className="font-medium">座標:</span> {payload.lat.toFixed(6)}, {payload.lng.toFixed(6)}</p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setMapModal({ lat: payload.lat, lng: payload.lng, locationText: payload.locationText });
                                setDetailModal(null);
                              }}
                            >
                              <MapPin className="h-4 w-4 mr-1" />
                              地図で確認
                            </Button>
                          </div>
                        )}
                        {!payload.lat || !payload.lng ? (
                          <p className="text-xs text-yellow-600">
                            ⚠️ 位置情報が不足しています。地図で位置を確認できません。
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* 時間情報 */}
                  {(payload.startAt || payload.endAt || payload.timeUnknown || payload.newStartAt || payload.newEndAt) && (
                    <div>
                      <h3 className="font-semibold mb-2">時間情報</h3>
                      <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                        {payload.timeUnknown && (
                          <p><span className="font-medium">時間未定:</span> はい</p>
                        )}
                        {payload.startAt && (
                          <p><span className="font-medium">開始時刻:</span> {new Date(payload.startAt).toLocaleString("ja-JP")}</p>
                        )}
                        {payload.endAt && (
                          <p><span className="font-medium">終了時刻:</span> {new Date(payload.endAt).toLocaleString("ja-JP")}</p>
                        )}
                        {payload.newStartAt && (
                          <p><span className="font-medium">新しい開始時刻:</span> {new Date(payload.newStartAt).toLocaleString("ja-JP")}</p>
                        )}
                        {payload.newEndAt && (
                          <p><span className="font-medium">新しい終了時刻:</span> {new Date(payload.newEndAt).toLocaleString("ja-JP")}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 変更情報（REPORT_MOVE, REPORT_TIME_CHANGE） */}
                  {(payload.newLat || payload.newLng) && (
                    <div>
                      <h3 className="font-semibold mb-2">変更後の位置</h3>
                      <div className="bg-muted p-3 rounded-md space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <p><span className="font-medium">新しい座標:</span> {payload.newLat.toFixed(6)}, {payload.newLng.toFixed(6)}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMapModal({ lat: payload.newLat, lng: payload.newLng, locationText: payload.locationText });
                              setDetailModal(null);
                            }}
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            地図で確認
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 全データ（JSON形式） */}
                  <div>
                    <h3 className="font-semibold mb-2">全データ（JSON）</h3>
                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-60">
                      {JSON.stringify(payload, null, 2)}
                    </pre>
                  </div>

                  {/* 操作ボタン */}
                  {detailModal.status === "PENDING" && !isPublicReport && (
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        onClick={() => {
                          setSelectedIds(new Set([detailModal.id]));
                          handleBulkAction("approve", new Set([detailModal.id]));
                          setDetailModal(null);
                        }}
                        disabled={isProcessing}
                      >
                        承認
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedIds(new Set([detailModal.id]));
                          handleBulkAction("reject", new Set([detailModal.id]));
                          setDetailModal(null);
                        }}
                        disabled={isProcessing}
                      >
                        却下
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
