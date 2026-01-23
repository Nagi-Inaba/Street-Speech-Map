"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LeafletMap from "@/components/Map/LeafletMap";

interface EventReportButtonsProps {
  eventId: string;
  eventLat: number;
  eventLng: number;
  eventStatus: string;
}

export default function EventReportButtons({ eventId, eventLat, eventLng, eventStatus }: EventReportButtonsProps) {
  const [reportedStart, setReportedStart] = useState(false);
  const [reportedEnd, setReportedEnd] = useState(false);
  const [showMoveMap, setShowMoveMap] = useState(false);
  const [newLat, setNewLat] = useState(eventLat);
  const [newLng, setNewLng] = useState(eventLng);
  const [canReportMove, setCanReportMove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartReport = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/public/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          kind: "start",
        }),
      });

      if (res.ok) {
        setReportedStart(true);
      } else if (res.status === 409) {
        setReportedStart(true); // 既に報告済み
      } else {
        alert("報告に失敗しました");
      }
    } catch (error) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndReport = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/public/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          kind: "end",
        }),
      });

      if (res.ok) {
        setReportedEnd(true);
      } else if (res.status === 409) {
        setReportedEnd(true); // 既に報告済み
      } else {
        alert("報告に失敗しました");
      }
    } catch (error) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveMapClick = (lat: number, lng: number) => {
    setNewLat(lat);
    setNewLng(lng);
    setCanReportMove(true);
  };

  const handleMoveReport = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "REPORT_MOVE",
          eventId,
          payload: {
            newLat,
            newLng,
          },
          lat: newLat,
          lng: newLng,
        }),
      });

      if (res.ok) {
        setShowMoveMap(false);
        setCanReportMove(false);
        alert("場所変更の報告が完了しました。承認後、反映されます。");
      } else {
        alert("報告に失敗しました");
      }
    } catch (error) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeChange = async () => {
    const newStartAtInput = prompt("新しい開始時刻を入力してください（YYYY-MM-DDTHH:mm形式、例: 2026-01-23T14:00）:");
    if (!newStartAtInput || newStartAtInput.trim() === "") {
      return;
    }

    const newEndAtInput = prompt("新しい終了時刻を入力してください（YYYY-MM-DDTHH:mm形式、空欄可）:");

    setIsSubmitting(true);
    try {
      // 日付のバリデーション
      let newStartAt: string | null = null;
      let newEndAt: string | null = null;

      if (newStartAtInput && newStartAtInput.trim() !== "") {
        const startDate = new Date(newStartAtInput.trim());
        if (isNaN(startDate.getTime())) {
          alert("開始時刻の形式が正しくありません");
          setIsSubmitting(false);
          return;
        }
        newStartAt = startDate.toISOString();
      }

      if (newEndAtInput && newEndAtInput.trim() !== "") {
        const endDate = new Date(newEndAtInput.trim());
        if (isNaN(endDate.getTime())) {
          alert("終了時刻の形式が正しくありません");
          setIsSubmitting(false);
          return;
        }
        newEndAt = endDate.toISOString();
      }

      const res = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "REPORT_TIME_CHANGE",
          eventId,
          payload: {
            newStartAt,
            newEndAt,
          },
        }),
      });

      if (res.ok) {
        alert("時間変更の報告が完了しました。承認後、反映されます。");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(`報告に失敗しました: ${errorData.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Time change error:", error);
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1">
        {eventStatus === "PLANNED" && (
          <Button
            onClick={handleStartReport}
            disabled={isSubmitting || reportedStart}
            variant={reportedStart ? "default" : "outline"}
            size="sm"
            className={reportedStart ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {reportedStart ? "✓ 演説中" : "演説中"}
          </Button>
        )}
        {(eventStatus === "PLANNED" || eventStatus === "LIVE") && (
          <Button
            onClick={handleEndReport}
            disabled={isSubmitting || reportedEnd}
            variant={reportedEnd ? "default" : "outline"}
            size="sm"
            className={reportedEnd ? "bg-gray-600 hover:bg-gray-700 text-white" : ""}
          >
            {reportedEnd ? "✓ 演説終了" : "演説終了"}
          </Button>
        )}
        {eventStatus !== "ENDED" && (
          <>
            <Button
              onClick={() => setShowMoveMap(true)}
              variant="outline"
              size="sm"
              disabled={isSubmitting}
            >
              場所変更
            </Button>
            <Button
              onClick={handleTimeChange}
              variant="outline"
              size="sm"
              disabled={isSubmitting}
            >
              時間変更
            </Button>
          </>
        )}
      </div>

      {/* 場所変更の地図モーダル */}
      <Dialog open={showMoveMap} onOpenChange={setShowMoveMap}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>場所変更の報告</DialogTitle>
            <DialogDescription>
              新しい場所を地図上でクリックして選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <LeafletMap
              center={[eventLat, eventLng]}
              zoom={15}
              editable
              onMapClick={handleMoveMapClick}
              markers={[
                {
                  id: "original",
                  position: [eventLat, eventLng],
                  popup: "元の場所",
                  color: "blue",
                },
                {
                  id: "new",
                  position: [newLat, newLng],
                  popup: "新しい場所",
                  color: "red",
                },
              ]}
            />
            <div className="text-sm text-muted-foreground">
              新しい場所: 緯度 {newLat.toFixed(6)}, 経度 {newLng.toFixed(6)}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMoveMap(false)}>
                キャンセル
              </Button>
              <Button
                onClick={handleMoveReport}
                disabled={!canReportMove || isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "報告中..." : "この位置で報告する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

