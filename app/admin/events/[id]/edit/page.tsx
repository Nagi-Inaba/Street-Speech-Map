"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LeafletMapWithSearch from "@/components/Map/LeafletMapWithSearch";
import { getPrefectureCoordinates } from "@/lib/constants";

interface Candidate {
  id: string;
  name: string;
  prefecture: string | null;
  region: string | null;
  type: string;
}

// 時間の選択肢（8-20時：選挙活動ができる時間）
const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, "0"));

// 分の選択肢（0, 15, 30, 45）
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

interface Event {
  id: string;
  candidateId: string;
  candidate: Candidate;
  status: string;
  startAt: string | null;
  endAt: string | null;
  timeUnknown: boolean;
  locationText: string;
  lat: number;
  lng: number;
  notes: string | null;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [status, setStatus] = useState<"PLANNED" | "LIVE" | "ENDED">("PLANNED");
  const [startDate, setStartDate] = useState("");
  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("");
  const [endHour, setEndHour] = useState("");
  const [endMinute, setEndMinute] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState(35.6812);
  const [lng, setLng] = useState(139.7671);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6812, 139.7671]);
  const [mapZoom, setMapZoom] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, candidatesRes] = await Promise.all([
          fetch(`/api/admin/events/${eventId}`),
          fetch("/api/admin/candidates"),
        ]);

        if (eventRes.ok && candidatesRes.ok) {
          const eventData = await eventRes.json();
          const candidatesData = await candidatesRes.json();

          setEvent(eventData);
          setCandidates(candidatesData);
          setCandidateId(eventData.candidateId);
          setStatus(eventData.status);
          setTimeUnknown(eventData.timeUnknown);

          // 日時を月日と時刻に分離
          if (eventData.startAt) {
            const startDateObj = new Date(eventData.startAt);
            const month = String(startDateObj.getMonth() + 1).padStart(2, "0");
            const day = String(startDateObj.getDate()).padStart(2, "0");
            const hours = String(startDateObj.getHours()).padStart(2, "0");
            const minutes = String(startDateObj.getMinutes()).padStart(2, "0");
            setStartDate(`${month}-${day}`);
            setStartHour(hours);
            setStartMinute(minutes);
          } else {
            setStartDate("");
            setStartHour("");
            setStartMinute("");
          }

          if (eventData.endAt) {
            const endDateObj = new Date(eventData.endAt);
            const hours = String(endDateObj.getHours()).padStart(2, "0");
            const minutes = String(endDateObj.getMinutes()).padStart(2, "0");
            setEndHour(hours);
            setEndMinute(minutes);
          } else {
            setEndHour("");
            setEndMinute("");
          }

          setLocationText(eventData.locationText);
          setNotes(eventData.notes || "");
          setLat(eventData.lat);
          setLng(eventData.lng);
          setMapCenter([eventData.lat, eventData.lng]);
          setMapZoom(15);
        } else {
          setError("データの取得に失敗しました");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  // 候補者選択時に地図の中心を立候補地域に設定
  useEffect(() => {
    if (candidateId) {
      const candidate = candidates.find((c) => c.id === candidateId);
      if (candidate) {
        if (candidate.type === "SINGLE" && candidate.prefecture) {
          // 小選挙区の場合：都道府県の座標を使用
          const coords = getPrefectureCoordinates(candidate.prefecture);
          if (coords) {
            setMapCenter(coords);
            setMapZoom(10);
          }
        } else if (candidate.type === "PROPORTIONAL" && candidate.region) {
          // 比例の場合：比例ブロックに応じた座標を使用
          const blockCoords: Record<string, [number, number]> = {
            "北海道ブロック": [43.0642, 141.3469],
            "東北ブロック": [38.2682, 140.8694],
            "北関東ブロック": [36.5658, 139.8836],
            "南関東ブロック": [35.6895, 139.6917],
            "東京ブロック": [35.6895, 139.6917],
            "北陸信越ブロック": [37.9022, 139.0236],
            "東海ブロック": [35.1802, 136.9066],
            "近畿ブロック": [34.6863, 135.5197],
            "中国ブロック": [34.6617, 133.9350],
            "四国ブロック": [33.8416, 132.7657],
            "九州ブロック": [33.6063, 130.4181],
          };
          const coords = blockCoords[candidate.region] || [35.6812, 139.7671];
          setMapCenter(coords);
          setMapZoom(8);
        }
      }
    }
  }, [candidateId, candidates]);

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
    setError("");

    try {
      const startAtDate = timeUnknown || !startDate || !startHour || !startMinute ? null : combineDateTime(startDate, startHour, startMinute);
      // 終了時刻は開始日時の日付と同じ日付を使用
      const endAtDate = timeUnknown || !endHour || !endMinute ? null : combineDateTime(startDate, endHour, endMinute);

      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          status,
          startAt: startAtDate,
          endAt: endAtDate,
          timeUnknown,
          locationText,
          lat,
          lng,
          notes: notes || null,
        }),
      });

      if (res.ok) {
        router.push("/admin/events");
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "更新に失敗しました");
      }
    } catch (error) {
      setError("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Button onClick={() => router.back()} className="mt-4">
          戻る
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">演説予定編集</h1>

      <Card>
        <CardHeader>
          <CardTitle>演説予定情報</CardTitle>
          <CardDescription>演説予定情報を編集します</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="candidateId" className="block text-sm font-medium mb-1">
                候補者 *
              </label>
              <select
                id="candidateId"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="">選択してください</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1">
                ステータス *
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "PLANNED" | "LIVE" | "ENDED")}
                required
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="PLANNED">予定</option>
                <option value="LIVE">実施中</option>
                <option value="ENDED">終了</option>
              </select>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                      開始日時 *
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="startDate"
                        type="date"
                        value={startDate ? `${new Date().getFullYear()}-${startDate}` : ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            const [, month, day] = value.split("-");
                            setStartDate(`${month}-${day}`);
                          } else {
                            setStartDate("");
                          }
                        }}
                        required={!timeUnknown}
                        className="w-full px-3 py-2 border rounded-md bg-white"
                      />
                      <select
                        id="startHour"
                        value={startHour}
                        onChange={(e) => setStartHour(e.target.value)}
                        required={!timeUnknown}
                        className="w-full px-3 py-2 border rounded-md bg-white"
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
                        required={!timeUnknown}
                        className="w-full px-3 py-2 border rounded-md bg-white"
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
                  <div>
                    <label htmlFor="endTime" className="block text-sm font-medium mb-1">
                      終了時刻
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="endHour"
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                        className="w-full px-3 py-2 border rounded-md bg-white"
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
                        className="w-full px-3 py-2 border rounded-md bg-white"
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
              </>
            )}

            <div>
              <label htmlFor="locationText" className="block text-sm font-medium mb-1">
                場所テキスト *
              </label>
              <input
                id="locationText"
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-white"
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                備考
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-md bg-white"
                placeholder="応援演説などの備考を入力してください"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                場所（地図上でクリックして選択、または住所検索）
              </label>
              <LeafletMapWithSearch
                center={mapCenter}
                zoom={mapZoom}
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

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "更新中..." : "更新"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

