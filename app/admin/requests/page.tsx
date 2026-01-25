"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LeafletMap from "@/components/Map/LeafletMap";
import { X } from "lucide-react";

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
    id: string;
    locationText: string;
    startAt: string | null;
    endAt: string | null;
    status: string;
    candidate: Candidate | null;
  };
  requests: PublicRequest[];
  requestsByType: {
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
        {(payload.lat && payload.lng) && (
          <div className="flex items-center gap-2">
            <p className="text-xs">
              座標: {payload.lat.toFixed(6)}, {payload.lng.toFixed(6)}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMapModal({ lat: payload.lat, lng: payload.lng })}
              className="text-xs h-6"
            >
              地図を表示
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
              地図を表示
            </Button>
          </div>
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
      {request.status === "PENDING" && !isPublicReport && (
        <div className="flex gap-2">
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
        </div>
      )}
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
  const [groupByEvent, setGroupByEvent] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapModal, setMapModal] = useState<{ lat: number; lng: number; locationText?: string } | null>(null);

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
        if (data.updatedCount !== undefined && data.updatedCount < ids.size) {
          alert(
            `${data.updatedCount}件のリクエストを処理しました。${ids.size - data.updatedCount}件は既に処理済みまたは存在しませんでした。`
          );
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
      <h1 className="text-3xl font-bold mb-8">リクエスト審査</h1>

      {/* フィルター */}
      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">候補者</label>
          <select
            value={filterCandidateId}
            onChange={(e) => setFilterCandidateId(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
          >
            <option value="">すべて</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">状態</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-md bg-white"
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
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedIds.size === pendingCount && pendingCount > 0 ? "選択解除" : "すべて選択"}
            </Button>
          <Button
            size="sm"
            onClick={() => handleBulkAction("approve")}
            disabled={selectedIds.size === 0 || isProcessing}
          >
            {isProcessing ? "処理中..." : `一括承認 (${selectedIds.size})`}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleBulkAction("reject")}
            disabled={selectedIds.size === 0 || isProcessing}
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
          {(() => {
            // すべてのイベントからリクエストを収集し、報告タイプごとにグループ化
            const allRequestsByType = {
              REPORT_START: [] as PublicRequest[],
              REPORT_END: [] as PublicRequest[],
              REPORT_MOVE: [] as PublicRequest[],
              REPORT_TIME_CHANGE: [] as PublicRequest[],
            };

            eventsWithRequests.forEach((eventWithRequests) => {
              // filterStatusでフィルタリング（API側で既にフィルタリングされているが、念のため）
              // filterStatusが空文字列の場合はすべて表示
              const filteredRequests = eventWithRequests.requests.filter(
                (r) => !filterStatus || filterStatus === "" || r.status === filterStatus
              );

              filteredRequests.forEach((req) => {
                if (req.type === "REPORT_START") allRequestsByType.REPORT_START.push(req);
                else if (req.type === "REPORT_END") allRequestsByType.REPORT_END.push(req);
                else if (req.type === "REPORT_MOVE") allRequestsByType.REPORT_MOVE.push(req);
                else if (req.type === "REPORT_TIME_CHANGE") allRequestsByType.REPORT_TIME_CHANGE.push(req);
              });
            });

            // 報告タイプごとに表示
            return (
              <>
                {/* 開始報告 */}
                {allRequestsByType.REPORT_START.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>開始報告 {allRequestsByType.REPORT_START.length}件</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {allRequestsByType.REPORT_START.map((req) => (
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
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 終了報告 */}
                {allRequestsByType.REPORT_END.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>終了報告 {allRequestsByType.REPORT_END.length}件</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {allRequestsByType.REPORT_END.map((req) => (
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
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 場所変更 */}
                {allRequestsByType.REPORT_MOVE.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>場所変更報告 {allRequestsByType.REPORT_MOVE.length}件</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {allRequestsByType.REPORT_MOVE.map((req) => (
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
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 時間変更 */}
                {allRequestsByType.REPORT_TIME_CHANGE.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>時間変更報告 {allRequestsByType.REPORT_TIME_CHANGE.length}件</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {allRequestsByType.REPORT_TIME_CHANGE.map((req) => (
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
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            );
          })()}
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
                          地図を表示
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {representative.status === "PENDING" && (
                    <div className="flex gap-2">
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
                    </div>
                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-white rounded-lg shadow-lg flex flex-col">
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
    </div>
  );
}
