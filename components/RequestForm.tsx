"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LeafletMap from "@/components/Map/LeafletMap";
import { trackEvent, AnalyticsEvents } from "@/lib/analytics";

interface RequestFormProps {
  candidateId: string;
  candidateName: string;
}

export default function RequestForm({ candidateId, candidateName }: RequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [lat, setLat] = useState(35.6812);
  const [lng, setLng] = useState(139.7671);
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
      const payload: Record<string, any> = {
        locationText,
        lat,
        lng,
        timeUnknown,
      };

      if (!timeUnknown) {
        if (startAt) {
          payload.startAt = new Date(startAt).toISOString();
        }
        if (endAt) {
          payload.endAt = new Date(endAt).toISOString();
        }
      }

      const res = await fetch("/api/public/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CREATE_EVENT",
          candidateId,
          payload,
          lat,
          lng,
        }),
      });

      if (res.ok) {
        setSubmitStatus("success");
        // フォームをリセット
        setLocationText("");
        setStartAt("");
        setEndAt("");
        setTimeUnknown(false);
        // 分析イベント計測
        trackEvent(AnalyticsEvents.REQUEST_SUBMIT, {
          candidate: candidateName,
          type: "CREATE_EVENT",
        });
        // 3秒後に閉じる
        setTimeout(() => {
          setIsOpen(false);
          setSubmitStatus("idle");
        }, 3000);
      } else {
        const error = await res.json();
        console.error("Error submitting request:", error);
        setSubmitStatus("error");
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline" className="w-full">
        📝 新しい演説予定を報告
      </Button>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>新しい演説予定を報告</CardTitle>
        <CardDescription>
          候補者の新しい演説予定を報告してください。管理者が確認後、公開されます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="locationText" className="block text-sm font-medium mb-1">
              場所 *</label>
            <input
              id="locationText"
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              required
              placeholder="例: 〇〇駅前"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => setTimeUnknown(e.target.checked)}
              />
              <span className="text-sm">時間未定</span>
            </label>
          </div>

          {!timeUnknown && (
            <>
              <div>
                <label htmlFor="startAt" className="block text-sm font-medium mb-1">
                  開始時刻
                </label>
                <input
                  id="startAt"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label htmlFor="endAt" className="block text-sm font-medium mb-1">
                  終了時刻
                </label>
                <input
                  id="endAt"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              場所（地図上でクリックして選択）*
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
                  popup: locationText || "選択された場所",
                },
              ]}
            />
            <div className="mt-2 text-sm text-muted-foreground">
              緯度: {lat.toFixed(6)}, 経度: {lng.toFixed(6)}
            </div>
          </div>

          {submitStatus === "success" && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
              ✅ リクエストを送信しました。管理者が確認後、公開されます。
            </div>
          )}

          {submitStatus === "error" && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              ❌ 送信に失敗しました。しばらく時間をおいて再度お試しください。
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "送信中..." : "送信"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                setSubmitStatus("idle");
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

