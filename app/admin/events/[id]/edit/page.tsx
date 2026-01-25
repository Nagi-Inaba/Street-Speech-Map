"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LeafletMapWithSearch from "@/components/Map/LeafletMapWithSearch";
import { getPrefectureCoordinates } from "@/lib/constants";
import { Calendar, Plus, X } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  prefecture: string | null;
  region: string | null;
  type: string;
}

interface SpeechEvent {
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
  additionalCandidates?: Array<{
    id: string;
    candidateId: string;
    candidate: Candidate;
  }>;
}

// 時間の選択肢（8-20時：選挙活動ができる時間）
const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, "0"));

// 分の選択肢（0, 15, 30, 45）
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [event, setEvent] = useState<SpeechEvent | null>(null);
  const [candidateId, setCandidateId] = useState("");
  const [additionalCandidateIds, setAdditionalCandidateIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"PLANNED" | "LIVE" | "ENDED">("PLANNED");
  
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
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState(35.6812);
  const [lng, setLng] = useState(139.7671);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6812, 139.7671]);
  const [mapZoom, setMapZoom] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 候補者一覧を取得
  useEffect(() => {
    fetch("/api/admin/candidates")
      .then((res) => res.json())
      .then((data) => setCandidates(data));
  }, []);

  // イベントデータを取得
  useEffect(() => {
    if (!eventId || candidates.length === 0) return;
    
    fetch(`/api/admin/events/${eventId}`)
      .then((res) => res.json())
      .then((data: SpeechEvent) => {
        setEvent(data);
        setCandidateId(data.candidateId);
        setStatus(data.status as "PLANNED" | "LIVE" | "ENDED");
        setLocationText(data.locationText);
        
        // 中間テーブルから合同演説者を取得
        if (data.additionalCandidates && data.additionalCandidates.length > 0) {
          const ids = data.additionalCandidates.map((ec) => ec.candidateId);
          setAdditionalCandidateIds(ids);
        } else {
          // 後方互換性: notesから合同演説者の情報を抽出（既存データ用）
          const notesText = data.notes || "";
          const jointSpeakersMatch = notesText.match(/合同演説者:\s*(.+?)(\n|$)/);
          if (jointSpeakersMatch) {
            const jointSpeakersText = jointSpeakersMatch[1];
            const jointSpeakersNames = jointSpeakersText.split("、").map((name) => name.trim());
            const ids = jointSpeakersNames
              .map((name) => candidates.find((c) => c.name === name)?.id)
              .filter((id): id is string => !!id);
            if (ids.length > 0) {
              setAdditionalCandidateIds(ids);
            }
            // notesから合同演説者の情報を削除
            const notesWithoutJointSpeakers = notesText.replace(/合同演説者:.*?(\n|$)/, "").trim();
            setNotes(notesWithoutJointSpeakers);
          } else {
            setNotes(notesText);
          }
        }
        
        if (data.additionalCandidates && data.additionalCandidates.length === 0) {
          setNotes(data.notes || "");
        } else if (!data.additionalCandidates) {
          setNotes(data.notes || "");
        }
        setLat(data.lat);
        setLng(data.lng);
        setTimeUnknown(data.timeUnknown);
        setMapCenter([data.lat, data.lng]);
        setMapZoom(15);

        // 日時をパース
        if (data.startAt && !data.timeUnknown) {
          const startDateObj = new Date(data.startAt);
          const month = String(startDateObj.getMonth() + 1).padStart(2, "0");
          const day = String(startDateObj.getDate()).padStart(2, "0");
          setStartDate(`${month}-${day}`);
          setStartHour(String(startDateObj.getHours()).padStart(2, "0"));
          setStartMinute(String(startDateObj.getMinutes()).padStart(2, "0"));
        }

        if (data.endAt && !data.timeUnknown) {
          const endDateObj = new Date(data.endAt);
          setEndHour(String(endDateObj.getHours()).padStart(2, "0"));
          setEndMinute(String(endDateObj.getMinutes()).padStart(2, "0"));
        }
        
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching event:", error);
        alert("イベントの取得に失敗しました");
        setIsLoading(false);
      });
  }, [eventId, candidates]);

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

    try {
      const startAtDate = timeUnknown || !startDate || !startHour || !startMinute ? null : combineDateTime(startDate, startHour, startMinute);
      // 終了時刻は開始日時の日付と同じ日付を使用
      const endAtDate = timeUnknown || !endHour || !endMinute ? null : combineDateTime(startDate, endHour, endMinute);

      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          additionalCandidateIds: additionalCandidateIds.filter((id) => id && id !== candidateId),
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
        const error = await res.json();
        alert(`更新に失敗しました: ${error.error || "不明なエラー"}`);
      }
    } catch (error) {
      console.error("Error updating event:", error);
      alert("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">演説予定編集</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            読み込み中...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">演説予定編集</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            イベントが見つかりませんでした
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">演説予定編集</h1>

      <Card>
        <CardHeader>
          <CardTitle>演説予定情報</CardTitle>
          <CardDescription>演説予定の情報を編集します</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="candidateId" className="block text-sm font-medium mb-1">
                メイン候補者 *
              </label>
              <select
                id="candidateId"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="">選択してください</option>
                {candidates
                  .filter((c) => !additionalCandidateIds.includes(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                合同演説者
              </label>
              {additionalCandidateIds.map((additionalId, index) => {
                const candidate = candidates.find((c) => c.id === additionalId);
                return (
                  <div key={`${additionalId}-${index}`} className="flex gap-2 mb-2">
                    <select
                      value={additionalId}
                      onChange={(e) => {
                        const newIds = [...additionalCandidateIds];
                        newIds[index] = e.target.value;
                        setAdditionalCandidateIds(newIds);
                      }}
                      className="flex-1 px-3 py-2 border rounded-md bg-white"
                    >
                      <option value="">選択してください</option>
                      {candidates
                        .filter((c) => c.id !== candidateId && (!additionalCandidateIds.includes(c.id) || c.id === additionalId))
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setAdditionalCandidateIds(additionalCandidateIds.filter((_, i) => i !== index));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdditionalCandidateIds([...additionalCandidateIds, ""]);
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                合同演説者を追加
              </Button>
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
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                      開始日時 *
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-full">
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
                          required={!timeUnknown}
                          className="w-full px-3 py-2 pr-10 border rounded-md bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById("startDate") as HTMLInputElement;
                            if (input?.showPicker) {
                              input.showPicker();
                            } else {
                              input?.focus();
                            }
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                      </div>
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
                placeholder="例: 〇〇駅西口交差点前"
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

