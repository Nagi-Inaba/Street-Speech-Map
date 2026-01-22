"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";

// LeafletはSSRで動作しないため、dynamic importを使用
const LeafletMap = dynamic(() => import("@/components/Map/LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-96 w-full bg-gray-100 animate-pulse rounded-md" />,
});

interface SpeechEvent {
  id: string;
  candidateId: string;
  candidate: {
    id: string;
    name: string;
  };
  status: string;
  startAt: string | null;
  endAt: string | null;
  timeUnknown: boolean;
  lat: number;
  lng: number;
  locationText: string;
}

interface Candidate {
  id: string;
  name: string;
}

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [event, setEvent] = useState<SpeechEvent | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [status, setStatus] = useState("PLANNED");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [lat, setLat] = useState(35.6812);
  const [lng, setLng] = useState(139.7671);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 候補者一覧を取得
    fetch("/api/admin/candidates")
      .then((res) => res.json())
      .then((data) => setCandidates(data))
      .catch(console.error);

    // イベント情報を取得
    fetch(`/api/admin/events/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("イベントが見つかりません");
        return res.json();
      })
      .then((data) => {
        setEvent(data);
        setCandidateId(data.candidateId);
        setStatus(data.status);
        setTimeUnknown(data.timeUnknown);
        setLocationText(data.locationText);
        setLat(data.lat);
        setLng(data.lng);
        
        if (data.startAt) {
          const start = new Date(data.startAt);
          setStartAt(formatDateTimeLocal(start));
        }
        if (data.endAt) {
          const end = new Date(data.endAt);
          setEndAt(formatDateTimeLocal(end));
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleMapClick = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const startAtDate = timeUnknown || !startAt ? null : new Date(startAt).toISOString();
      const endAtDate = timeUnknown || !endAt ? null : new Date(endAt).toISOString();

      const res = await fetch(`/api/admin/events/${id}`, {
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
        }),
      });

      if (res.ok) {
        router.push("/admin/events");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "更新に失敗しました");
      }
    } catch (err) {
      setError("エラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("本当にこのイベントを削除しますか？")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin/events");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || "削除に失敗しました");
      }
    } catch (err) {
      setError("エラーが発生しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-500">{error || "イベントが見つかりません"}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">イベント編集</h1>

      <Card>
        <CardHeader>
          <CardTitle>イベント情報</CardTitle>
          <CardDescription>演説イベントの情報を編集します</CardDescription>
        </CardHeader>
        <CardContent>
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
                className="w-full px-3 py-2 border rounded-md"
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
                状態 *
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
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
              <label htmlFor="locationText" className="block text-sm font-medium mb-1">
                場所テキスト *
              </label>
              <input
                id="locationText"
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md"
                placeholder="例: 東京駅前"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                場所（地図上でクリックして選択）
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

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
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
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                className="ml-auto"
              >
                削除
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
