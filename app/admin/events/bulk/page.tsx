"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
}

function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if ((c === "," && !inQuotes) || c === "\t") {
        result.push(current.trim());
        current = "";
      } else {
        current += c;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

function normalizeTimePart(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  const colonMatch = raw.match(/(\d{1,2})\s*[:：]\s*(\d{1,2})/);
  const dotMatch = raw.match(/(\d{1,2})\s*[.．]\s*(\d{1,2})/);
  const jpMatch = raw.match(/(\d{1,2})\s*時\s*(\d{1,2})?/);
  const hourOnlyMatch = raw.match(/^(\d{1,2})$/);
  const match = colonMatch ?? dotMatch ?? jpMatch ?? hourOnlyMatch;
  if (!match) return "";

  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "00");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";
  return `${pad2(String(hour))}:${pad2(String(minute))}`;
}

export default function BulkImportPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [csvText, setCsvText] = useState("");
  const [defaultCandidateId, setDefaultCandidateId] = useState("");
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [submitResult, setSubmitResult] = useState<{ created: number; errors?: { index: number; message: string }[] } | null>(null);

  useEffect(() => {
    fetch("/api/admin/candidates")
      .then((res) => res.json())
      .then((data) => setCandidates(data));
  }, []);

  useEffect(() => {
    if (!defaultCandidateId && candidates.length > 0) {
      setDefaultCandidateId(candidates[0].id);
    }
  }, [candidates, defaultCandidateId]);

  useEffect(() => {
    if (!csvText.trim() || candidates.length === 0) {
      if (!csvText.trim()) setPreview([]);
      return;
    }
    setParseError(null);
    setSubmitResult(null);
    try {
      const rows = parseCsv(csvText);
      if (rows.length < 2) {
        setPreview([]);
        return;
      }
      const header = rows[0].map((h) => h.toLowerCase().replace(/\s/g, ""));
      const dataRows = rows.slice(1);
      const previewData: Array<Record<string, string>> = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const record: Record<string, string> = {};
        for (let j = 0; j < header.length && j < row.length; j++) {
          record[header[j]] = row[j] ?? "";
        }
        previewData.push(record);
      }
      setPreview(previewData);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : String(e));
      setPreview([]);
    }
  }, [csvText, candidates.length]);

  const buildEvents = (): Array<{
    candidateId: string;
    startAt: string | null;
    endAt: string | null;
    displayTime: string;
    timeUnknown: boolean;
    locationText: string;
    lat?: number;
    lng?: number;
    notes: string | null;
    isPublic: boolean;
  }> => {
    const nameToId = new Map(candidates.map((c) => [c.name, c.id]));
    const events: Array<{
      candidateId: string;
      startAt: string | null;
      endAt: string | null;
      displayTime: string;
      timeUnknown: boolean;
      locationText: string;
      lat?: number;
      lng?: number;
      notes: string | null;
      isPublic: boolean;
    }> = [];
    const currentYear = new Date().getFullYear();

    for (const row of preview) {
      const cand = (row["候補者"] ?? row["candidate"] ?? row["候補者名"] ?? row["candidateid"] ?? "").trim();
      const candidateId = nameToId.get(cand) ?? (candidates.find((c) => c.id === cand) ? cand : defaultCandidateId || null);
      if (!candidateId) continue;

      const rawDate = (row["日付"] ?? row["date"] ?? row["日"] ?? "").trim();
      const startTime = (row["開始"] ?? row["start"] ?? row["開始時刻"] ?? "").trim();
      const endTime = (row["終了"] ?? row["end"] ?? row["終了時刻"] ?? "").trim();
      const locationText = (row["場所"] ?? row["location"] ?? row["場所名"] ?? "").trim();
      const latStr = (row["緯度"] ?? row["lat"] ?? "").trim();
      const lngStr = (row["経度"] ?? row["lng"] ?? "").trim();
      const notes = (row["備考"] ?? row["notes"] ?? "").trim() || null;

      if (!locationText) continue;

      let startAt: string | null = null;
      let endAt: string | null = null;
      const normalizedStartTime = normalizeTimePart(startTime);
      const normalizedEndTime = normalizeTimePart(endTime);
      const timeUnknown = !rawDate && !normalizedStartTime;
      const normalizedDate = rawDate
        ? (() => {
            const replaced = rawDate.replace(/\//g, "-");
            return /^\d{4}-\d{2}-\d{2}$/.test(replaced) ? replaced : `${currentYear}-${replaced}`;
          })()
        : "";
      const buildIsoWithOffset = (date: string, time: string) => `${date}T${time}:00+09:00`;
      if (normalizedDate && normalizedStartTime) {
        startAt = buildIsoWithOffset(normalizedDate, normalizedStartTime);
      } else if (normalizedDate) {
        startAt = `${normalizedDate}T00:00:00+09:00`;
      }
      if (normalizedDate && normalizedEndTime) {
        endAt = buildIsoWithOffset(normalizedDate, normalizedEndTime);
      }
      const displayTime = normalizedDate
        ? `${normalizedDate}${normalizedStartTime ? ` ${normalizedStartTime}` : ""}${normalizedEndTime ? `–${normalizedEndTime}` : ""}`
        : "時間未定";

      const parsedLat = latStr ? parseFloat(latStr) : undefined;
      const parsedLng = lngStr ? parseFloat(lngStr) : undefined;

      events.push({
        candidateId,
        startAt,
        endAt,
        displayTime,
        timeUnknown,
        locationText,
        lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
        lng: Number.isFinite(parsedLng) ? parsedLng : undefined,
        notes,
        isPublic: false,
      });
    }
    return events;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    const events = buildEvents();
    if (events.length === 0) {
      alert("有効な行がありません。候補者・場所を確認し、CSVの1行目をヘッダーにしてください。");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/admin/events/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubmitResult({ created: data.created ?? events.length, errors: data.errors });
        if (data.created > 0) {
          setCsvText("");
          setPreview([]);
          setTimeout(() => router.push("/admin/events"), 1500);
        }
      } else {
        alert(data.error || "一括登録に失敗しました");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const events = buildEvents();
  const canSubmit = events.length > 0;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/events" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold">一括入稿</h1>
      </div>

      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>CSVで演説予定を一括登録</CardTitle>
          <CardDescription>
            スプレッドシートやCSVのデータを貼り付けて一括登録できます。1行目はヘッダーにしてください。
            <br />
            列の例: 候補者名, 日付, 開始時刻, 終了時刻, 場所, 緯度, 経度, 備考
            <br />
            日付は、MM-DD 開始時刻と終了時刻は、HH:mmの形式で入力してください。表記ゆれもある程度自動で変換されます。
            <br />
            緯度/経度を空欄にしても登録できます。空欄の場合は東京駅付近の座標で保存されます。
            <br />
            CSV内に候補者名の列がない行は、下の「既定の候補者」で指定した候補者として登録されます。
            <br />
            このページから作成したイベントはすべて非公開で保存されるため、管理画面で個別に公開しない限り外部には表示されません。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="default-candidate" className="block text-sm font-medium mb-1">
              既定の候補者（列に候補者がない行に使用）
            </Label>
            <select
              id="default-candidate"
              value={defaultCandidateId}
              onChange={(e) => setDefaultCandidateId(e.target.value)}
              className="w-full max-w-md px-3 py-2 border rounded-md bg-white"
            >
              <option value="">指定しない</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              選択がない場合、候補者一覧の最初の候補者を自動で既定に設定します。
            </p>
          </div>
          <div>
            <Label htmlFor="csv" className="block text-sm font-medium mb-1">
              CSVデータ（貼り付けまたはカンマ/タブ区切り）
            </Label>
            <Textarea
              id="csv"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`候補者名,日付,開始,終了,場所,緯度,経度,備考\n山田太郎,2025-02-03,09:00,10:00,〇〇駅西口,35.68,139.76,`}
              rows={12}
              className="font-mono text-sm"
            />
            {parseError && <p className="text-sm text-red-600 mt-1">{parseError}</p>}
          </div>
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">
                プレビュー: {events.length} 件を登録します
                {events.length < preview.length && `（${preview.length - events.length} 件はスキップ）`}
              </p>
            <div className="relative">
              <div className="overflow-x-auto max-h-48 border rounded p-2 text-xs">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr>
                      <th className="text-left p-1">候補者</th>
                      <th className="text-left p-1">日付・時刻</th>
                      <th className="text-left p-1">場所</th>
                      <th className="text-left p-1">緯度</th>
                      <th className="text-left p-1">経度</th>
                      <th className="text-left p-1">備考</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.slice(0, 10).map((e, i) => (
                      <tr key={i}>
                        <td className="p-1">{candidates.find((c) => c.id === e.candidateId)?.name ?? e.candidateId}</td>
                        <td className="p-1">{e.displayTime}</td>
                        <td className="p-1">{e.locationText}</td>
                        <td className="p-1">{typeof e.lat === "number" ? e.lat.toFixed(6) : "―"}</td>
                        <td className="p-1">{typeof e.lng === "number" ? e.lng.toFixed(6) : "―"}</td>
                        <td className="p-1 break-words max-w-[200px]">{e.notes ?? "―"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {events.length > 10 && <p className="text-muted-foreground mt-1">… 他 {events.length - 10} 件</p>}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5 text-center" role="status">
                横長のテーブルは横スクロール可能です。<span className="hidden sm:inline">マウスホイールやトラックパッドで左右に移動できます。</span>
              </p>
            </div>
            </div>
          )}
          {submitResult && (
            <p className="text-sm text-green-600">
              {submitResult.created} 件を登録しました
              {submitResult.errors?.length ? `（${submitResult.errors.length} 件エラー）` : ""}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "登録中..." : `${events.length} 件を登録`}
            </Button>
            <Link href="/admin/events">
              <Button variant="outline">キャンセル</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
