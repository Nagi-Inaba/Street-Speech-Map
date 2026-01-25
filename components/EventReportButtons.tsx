"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LeafletMap from "@/components/Map/LeafletMap";

interface EventReportButtonsProps {
  eventId: string;
  eventLat: number;
  eventLng: number;
  eventStatus: string;
  eventStartAt?: Date | string | null;
  eventEndAt?: Date | string | null;
}

export default function EventReportButtons({ eventId, eventLat, eventLng, eventStatus, eventStartAt, eventEndAt }: EventReportButtonsProps) {
  const [reportedStart, setReportedStart] = useState(false);
  const [reportedEnd, setReportedEnd] = useState(false);
  const [showMoveMap, setShowMoveMap] = useState(false);
  const [showTimeChange, setShowTimeChange] = useState(false);
  const [newLat, setNewLat] = useState(eventLat);
  const [newLng, setNewLng] = useState(eventLng);
  const [canReportMove, setCanReportMove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");

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

  const handleTimeChangeSubmit = async () => {
    if (!newStartTime.trim()) {
      alert("開始時刻を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      // 現在のイベントの日付を取得
      const currentStartDate = eventStartAt ? new Date(eventStartAt) : new Date();
      const currentEndDate = eventEndAt ? new Date(eventEndAt) : currentStartDate;

      // 時間だけを変更して新しい日時を作成
      let newStartAtISO: string | null = null;
      let newEndAtISO: string | null = null;

      if (newStartTime && newStartTime.trim() !== "") {
        const [hours, minutes] = newStartTime.trim().split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          alert("開始時刻の形式が正しくありません（HH:mm形式）");
          setIsSubmitting(false);
          return;
        }
        const newStartDate = new Date(currentStartDate);
        newStartDate.setHours(hours, minutes, 0, 0);
        newStartAtISO = newStartDate.toISOString();
      }

      if (newEndTime && newEndTime.trim() !== "") {
        const [hours, minutes] = newEndTime.trim().split(":").map(Number);
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          alert("終了時刻の形式が正しくありません（HH:mm形式）");
          setIsSubmitting(false);
          return;
        }
        const newEndDate = new Date(currentEndDate);
        newEndDate.setHours(hours, minutes, 0, 0);
        newEndAtISO = newEndDate.toISOString();
      }

      const res = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "REPORT_TIME_CHANGE",
          eventId,
          payload: {
            newStartAt: newStartAtISO,
            newEndAt: newEndAtISO,
          },
        }),
      });

      if (res.ok) {
        setShowTimeChange(false);
        setNewStartTime("");
        setNewEndTime("");
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
              onClick={() => {
                // 現在のイベントの時刻を初期値として設定
                if (eventStartAt) {
                  const startDate = new Date(eventStartAt);
                  const hours = String(startDate.getHours()).padStart(2, "0");
                  const minutes = String(startDate.getMinutes()).padStart(2, "0");
                  setNewStartTime(`${hours}:${minutes}`);
                }
                if (eventEndAt) {
                  const endDate = new Date(eventEndAt);
                  const hours = String(endDate.getHours()).padStart(2, "0");
                  const minutes = String(endDate.getMinutes()).padStart(2, "0");
                  setNewEndTime(`${hours}:${minutes}`);
                }
                setShowTimeChange(true);
              }}
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
        <DialogContent className="max-w-4xl w-[95vw] sm:w-full">
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

      {/* 時間変更のダイアログ */}
      <Dialog open={showTimeChange} onOpenChange={setShowTimeChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>時間変更の報告</DialogTitle>
            <DialogDescription>
              新しい開始時刻と終了時刻を入力してください（日付は変更されません）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {eventStartAt && (
              <div className="text-sm text-muted-foreground">
                現在の日付: {new Date(eventStartAt).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newStartTime">新しい開始時刻 *</Label>
              <Input
                id="newStartTime"
                type="time"
                value={newStartTime}
                onChange={(e) => setNewStartTime(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                形式: HH:mm（例: 14:00）
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEndTime">新しい終了時刻（任意）</Label>
              <Input
                id="newEndTime"
                type="time"
                value={newEndTime}
                onChange={(e) => setNewEndTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                形式: HH:mm（例: 16:00）
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTimeChange(false);
                  setNewStartTime("");
                  setNewEndTime("");
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleTimeChangeSubmit}
                disabled={isSubmitting || !newStartTime.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? "報告中..." : "報告する"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

