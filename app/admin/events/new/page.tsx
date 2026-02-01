"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

// 時間の選択肢（5-20時：選挙活動ができる時間）
const HOUR_OPTIONS = Array.from({ length: 16 }, (_, i) => String(i + 5).padStart(2, "0"));

// 分の選択肢（0, 15, 30, 45）
const MINUTE_OPTIONS = ["00", "15", "30", "45"];

export default function NewEventPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [additionalCandidateIds, setAdditionalCandidateIds] = useState<string[]>([]);
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
  // 地図上でユーザーがピンを打った後は、候補者変更で場所を上書きしない
  const [userHasSetLocation, setUserHasSetLocation] = useState(false);

  useEffect(() => {
    fetch("/api/admin/candidates")
      .then((res) => res.json())
      .then((data) => setCandidates(data));
  }, []);

  // 候補者選択時に地図の中心を立候補地域に設定（ユーザーがまだ場所を設定していない場合のみ lat/lng を更新）
  useEffect(() => {
    if (userHasSetLocation) return;
    if (candidateId) {
      const candidate = candidates.find((c) => c.id === candidateId);
      if (candidate) {
        if (candidate.type === "SINGLE" && candidate.prefecture) {
          const coords = getPrefectureCoordinates(candidate.prefecture);
          if (coords) {
            setMapCenter(coords);
            setMapZoom(10);
            setLat(coords[0]);
            setLng(coords[1]);
          }
        } else if (candidate.type === "PROPORTIONAL" && candidate.region) {
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
          setLat(coords[0]);
          setLng(coords[1]);
        }
      }
    }
  }, [candidateId, candidates, userHasSetLocation]);

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    setUserHasSetLocation(true);
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

    try {
      let startAtDate: string | null = null;
      let endAtDate: string | null = null;

      if (timeUnknown) {
        // 日付のみ指定されている場合は、00:00として保存し、timeUnknownフラグで「時間未定」を表現
        if (startDate) {
          startAtDate = combineDateTime(startDate, "00", "00");
        }
      } else {
        // 時間が指定されている場合のみ、開始・終了時刻を保存
        startAtDate =
          !startDate || !startHour || !startMinute ? null : combineDateTime(startDate, startHour, startMinute);
        // 終了時刻は開始日時の日付と同じ日付を使用
        endAtDate = !endHour || !endMinute ? null : combineDateTime(startDate, endHour, endMinute);
      }

      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId,
          additionalCandidateIds: additionalCandidateIds.filter((id) => id && id !== candidateId),
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
        const errorMessage = errorData.error 
          ? (typeof errorData.error === "string" 
              ? errorData.error 
              : JSON.stringify(errorData.error))
          : "作成に失敗しました";
        alert(`作成に失敗しました: ${errorMessage}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "エラーが発生しました";
      alert(`エラーが発生しました: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">新規演説予定作成</h1>

      <Card>
        <CardHeader>
          <CardTitle>演説予定情報</CardTitle>
          <CardDescription>新しい演説予定を登録します</CardDescription>
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
                  <div key={additionalId} className="flex gap-2 mb-2">
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
                        .filter((c) => c.id !== candidateId && !additionalCandidateIds.includes(c.id) || c.id === additionalId)
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={timeUnknown}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setTimeUnknown(checked);
                    if (checked) {
                      // 「時間未定」の場合は時間だけクリア（日時フィールド自体は残す）
                      setStartHour("");
                      setStartMinute("");
                      setEndHour("");
                      setEndMinute("");
                    }
                  }}
                />
                <span className="text-sm">時間未定</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                  開始日 *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      id="startDate"
                      type="date"
                      value={startDate ? `${new Date().getFullYear()}-${startDate}` : ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value) {
                          const [, month, day] = value.split("-");
                          setStartDate(`${month}-${day}`);
                        } else if (!timeUnknown) {
                          // 時間未定のときは空のonChangeを無視（モバイルでレイアウト変化時に誤発火することがある）
                          setStartDate("");
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
                  {!timeUnknown && (
                    <div className="flex gap-2 flex-1">
                      <select
                        id="startHour"
                        value={startHour}
                        onChange={(e) => setStartHour(e.target.value)}
                        required={!timeUnknown}
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
                        required={!timeUnknown}
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
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="endTime" className="block text-sm font-medium mb-1">
                  終了時刻
                </label>
                {!timeUnknown && (
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
                )}
                {timeUnknown && <p className="text-xs text-muted-foreground mt-1">時間未定のため入力不要です</p>}
              </div>
            </div>

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
                onMapClick={handleMapClick}
                onCenterChange={(newLat, newLng) => {
                  setLat(newLat);
                  setLng(newLng);
                  setUserHasSetLocation(true);
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

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? "作成中..." : "作成"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="w-full sm:w-auto"
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
