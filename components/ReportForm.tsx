"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LeafletMap from "@/components/Map/LeafletMap";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface ReportFormProps {
  eventId: string;
  eventLocationText: string;
  eventLat: number;
  eventLng: number;
  candidateName: string;
}

export default function ReportForm({
  eventId,
  eventLocationText,
  eventLat,
  eventLng,
  candidateName,
}: ReportFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportKind, setReportKind] = useState<"start" | "end" | "move">("start");
  const [lat, setLat] = useState(eventLat);
  const [lng, setLng] = useState(eventLng);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const payload: {
        eventId: string;
        kind: "start" | "end" | "move";
        lat?: number;
        lng?: number;
      } = {
        eventId,
        kind: reportKind,
      };

      // 場所変更報告の場合は座標を含める
      if (reportKind === "move") {
        payload.lat = lat;
        payload.lng = lng;
      }

      const res = await fetch("/api/public/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmitStatus("success");
        // 分析イベント計測
        const eventName =
          reportKind === "start"
            ? AnalyticsEvents.REPORT_START
            : reportKind === "end"
            ? AnalyticsEvents.REPORT_END
            : AnalyticsEvents.REPORT_MOVE;
        trackEvent(eventName, {
          candidate: candidateName,
          eventId,
        });
        // 3秒後に閉じる
        setTimeout(() => {
          setIsOpen(false);
          setSubmitStatus("idle");
        }, 3000);
      } else {
        const error = await res.json();
        console.error("Error submitting report:", error);
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getReportKindLabel = (kind: "start" | "end" | "move") => {
    switch (kind) {
      case "start":
        return "開始報告";
      case "end":
        return "終了報告";
      case "move":
        return "場所変更報告";
    }
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline" size="sm">
        📢 報告
      </Button>
    );
  }

  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle>{getReportKindLabel(reportKind)}</CardTitle>
        <CardDescription>
          イベントの状態を報告してください。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">報告種類 *</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={reportKind === "start" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setReportKind("start");
                  setLat(eventLat);
                  setLng(eventLng);
                }}
              >
                開始
              </Button>
              <Button
                type="button"
                variant={reportKind === "end" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setReportKind("end");
                  setLat(eventLat);
                  setLng(eventLng);
                }}
              >
                終了
              </Button>
              <Button
                type="button"
                variant={reportKind === "move" ? "default" : "outline"}
                size="sm"
                onClick={() => setReportKind("move")}
              >
                場所変更
              </Button>
            </div>
          </div>

          {reportKind === "move" && (
            <div>
              <label className="block text-sm font-medium mb-1">
                新しい場所（地図上でクリックして選択）*
              </label>
              <LeafletMap
                center={[lat, lng]}
                zoom={15}
                editable
                onMapClick={handleMapClick}
                markers={[
                  {
                    id: "current",
                    position: [lat, lng],
                    popup: "新しい場所",
                  },
                  {
                    id: "original",
                    position: [eventLat, eventLng],
                    popup: `元の場所: ${eventLocationText}`,
                    color: "gray",
                  },
                ]}
              />
              <div className="mt-2 text-sm text-muted-foreground">
                緯度: {lat.toFixed(6)}, 経度: {lng.toFixed(6)}
              </div>
            </div>
          )}

          {submitStatus === "success" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
              ✅ 報告を送信しました。ありがとうございます。
            </div>
          )}

          {submitStatus === "error" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              ❌ 送信に失敗しました。既に報告済みの可能性があります。
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? "送信中..." : "送信"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                setSubmitStatus("idle");
                setReportKind("start");
                setLat(eventLat);
                setLng(eventLng);
              }}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

