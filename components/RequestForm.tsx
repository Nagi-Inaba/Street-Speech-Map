"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import LeafletMapWithSearch from "@/components/Map/LeafletMapWithSearch";

interface RequestFormProps {
  candidateId: string;
  candidateName: string;
}

// 時間の選択肢（8-20時：選挙活動ができる時間）
const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, "0"));

// 分の選択肢（0, 15, 30, 45）
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

export default function RequestForm({ candidateId, candidateName }: RequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // 今日の日付をデフォルト値として設定（MM-DD形式）
  const getTodayDateString = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${month}-${day}`;
  };
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [lat, setLat] = useState(35.6812);
  const [lng, setLng] = useState(139.7671);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  };

  // 月日と時刻をISO形式の日時文字列に変換（年は現在の年を使用）
  const combineDateTime = (date: string, hour: string, minute: string): string | null => {
    if (!date || !hour || !minute) return null;
    const currentYear = new Date().getFullYear();
    const time = `${hour}:${minute}`;
    const dateTimeString = `${currentYear}-${date}T${time}`;
    return new Date(dateTimeString).toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsSuccess(false);

    try {
      const payload = {
        startAt: timeUnknown || !startDate || !startHour || !startMinute ? null : combineDateTime(startDate, startHour, startMinute),
        // 終了時刻は開始日時の日付と同じ日付を使用
        endAt: timeUnknown || !endHour || !endMinute ? null : combineDateTime(startDate, endHour, endMinute),
        timeUnknown,
        locationText,
        lat,
        lng,
      };

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
        setIsSuccess(true);
        // フォームをリセット
        setStartDate(getTodayDateString());
        setStartHour("");
        setStartMinute("");
        setEndHour("");
        setEndMinute("");
        setLocationText("");
        setTimeout(() => setIsSuccess(false), 5000);
      } else {
        alert("送信に失敗しました");
      }
    } catch (error) {
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>演説予定の新規登録リクエスト</CardTitle>
            <CardDescription>
              {candidateName}さんの新しい演説予定を登録できます
            </CardDescription>
          </div>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
        {isSuccess && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md">
            送信が完了しました。承認後、反映されます。
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={timeUnknown}
                onChange={(e) => {
                  setTimeUnknown(e.target.checked);
                  if (e.target.checked) {
                    setStartDate("");
                    setStartHour("");
                    setStartMinute("");
                    setEndHour("");
                    setEndMinute("");
                  } else {
                    setStartDate(getTodayDateString());
                    setStartHour("");
                    setStartMinute("");
                  }
                }}
              />
              <span className="text-sm">時間未定</span>
            </label>
          </div>

          {!timeUnknown && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                  開始日時
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="startDate"
                    type="date"
                    value={`${new Date().getFullYear()}-${startDate}`}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        const [, month, day] = value.split("-");
                        setStartDate(`${month}-${day}`);
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-md bg-white"
                  />
                  <div className="flex gap-2 flex-1">
                    <select
                      id="startHour"
                      value={startHour}
                      onChange={(e) => setStartHour(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md bg-white"
                    >
                      <option value="">時</option>
                      {HOUR_OPTIONS.map((hour) => (
                        <option key={hour} value={hour}>
                          {hour}
                        </option>
                      ))}
                    </select>
                    <select
                      id="startMinute"
                      value={startMinute}
                      onChange={(e) => setStartMinute(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-md bg-white"
                    >
                      <option value="">分</option>
                      {MINUTE_OPTIONS.map((minute) => (
                        <option key={minute} value={minute}>
                          {minute}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="endHour" className="block text-sm font-medium mb-1">
                  終了時刻
                </label>
                <div className="flex gap-2">
                  <select
                    id="endHour"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="">時</option>
                    {HOUR_OPTIONS.map((hour) => (
                      <option key={hour} value={hour}>
                        {hour}
                      </option>
                    ))}
                  </select>
                  <select
                    id="endMinute"
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="">分</option>
                    {MINUTE_OPTIONS.map((minute) => (
                      <option key={minute} value={minute}>
                        {minute}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="locationText" className="block text-sm font-medium mb-1">
              場所 *
            </label>
            <input
              id="locationText"
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="例: 〇〇駅西口交差点前"
              required
              className="w-full px-3 py-2 border rounded-md bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              場所（地図上でクリックして選択、または住所検索） *
            </label>
            <LeafletMapWithSearch
              center={[lat, lng]}
              zoom={15}
              editable
              onMapClick={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
              onCenterChange={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
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

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "送信中..." : "送信"}
          </Button>
        </form>
        </CardContent>
      )}
    </Card>
  );
}

