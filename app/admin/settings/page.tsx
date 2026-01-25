"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Candidate {
  id: string;
  name: string;
  showEvents: boolean;
}

export default function SettingsPage() {
  const [showCandidateInfo, setShowCandidateInfo] = useState(true);
  const [candidateLabel, setCandidateLabel] = useState("");
  const [showEvents, setShowEvents] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settingsRes, candidatesRes] = await Promise.all([
        fetch("/api/admin/settings"),
        fetch("/api/admin/candidates"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setShowCandidateInfo(data.showCandidateInfo ?? true);
        setCandidateLabel(data.candidateLabel !== undefined ? data.candidateLabel : "");
        setShowEvents(data.showEvents ?? true);
      }

      if (candidatesRes.ok) {
        const candidatesData = await candidatesRes.json();
        setCandidates(
          candidatesData.map((c: any) => ({
            id: c.id,
            name: c.name,
            showEvents: c.showEvents ?? false,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showCandidateInfo,
          candidateLabel,
          showEvents,
        }),
      });

      if (res.ok) {
        alert("設定を保存しました");
      } else {
        alert("設定の保存に失敗しました");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("エラーが発生しました");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCandidateShowEvents = async (candidateId: string, currentValue: boolean) => {
    setUpdatingCandidateId(candidateId);
    try {
      const candidate = candidates.find((c) => c.id === candidateId);
      if (!candidate) return;

      // 候補者データを取得
      const candidateRes = await fetch(`/api/admin/candidates/${candidateId}`);
      if (!candidateRes.ok) {
        alert("候補者データの取得に失敗しました");
        return;
      }
      const candidateData = await candidateRes.json();

      // 候補者のshowEventsを更新
      const updateRes = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: candidateData.name,
          slug: candidateData.slug,
          type: candidateData.type || null,
          prefecture: candidateData.prefecture,
          region: candidateData.region,
          imageUrl: candidateData.imageUrl,
          showEvents: !currentValue,
        }),
      });

      if (updateRes.ok) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, showEvents: !currentValue } : c))
        );
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error("Error updating candidate:", error);
      alert("エラーが発生しました");
    } finally {
      setUpdatingCandidateId(null);
    }
  };

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">サイト設定</h1>

      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>公開表示設定</CardTitle>
          <CardDescription>
            公開側のページでの表示を制御します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="show-candidate-info" className="text-base">
                立候補区分・選挙区の表示
              </Label>
              <p className="text-sm text-muted-foreground">
                公開側のページで立候補区分（小選挙区/比例区）や選挙区の情報を表示するかどうかを制御します。
                <br />
                公選法の関係で非表示にする場合は、このスイッチをオフにしてください。
              </p>
            </div>
            <Switch
              id="show-candidate-info"
              checked={showCandidateInfo}
              onCheckedChange={setShowCandidateInfo}
              className="flex-shrink-0"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-0.5 flex-1">
              <Label htmlFor="show-events" className="text-base">
                演説予定の表示
              </Label>
              <p className="text-sm text-muted-foreground">
                公開側のページで演説予定（予定・実施中・終了）を表示するかどうかを制御します。
                <br />
                非表示にする場合は、このスイッチをオフにしてください。
              </p>
            </div>
            <Switch
              id="show-events"
              checked={showEvents}
              onCheckedChange={setShowEvents}
              className="flex-shrink-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidate-label" className="text-base">
              候補者ラベル
            </Label>
            <p className="text-sm text-muted-foreground">
              公開側のページで「候補者」という文字列を別の文字列に置き換えます。
              <br />
              例: 「公認候補予定者」「立候補予定者」など
              <br />
              空白にすると「候補者」という文字列は表示されません。
            </p>
            <Input
              id="candidate-label"
              type="text"
              value={candidateLabel}
              onChange={(e) => setCandidateLabel(e.target.value)}
              placeholder="空白可（空白の場合は「候補者」は表示されません）"
              className="max-w-md"
            />
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "設定を保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="max-w-2xl w-full mt-6">
        <CardHeader>
          <CardTitle>候補者ごとの演説予定表示設定</CardTitle>
          <CardDescription>
            各候補者の演説予定を公開側のページで表示するかどうかを個別に設定できます。
            <br />
            サイト全体の設定がOFFの場合は、この設定に関係なく非表示になります。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">候補者が登録されていません</p>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0"
                >
                  <Label htmlFor={`candidate-show-events-${candidate.id}`} className="flex-1">
                    {candidate.name}
                  </Label>
                  <Switch
                    id={`candidate-show-events-${candidate.id}`}
                    checked={candidate.showEvents}
                    onCheckedChange={() =>
                      handleToggleCandidateShowEvents(candidate.id, candidate.showEvents)
                    }
                    disabled={updatingCandidateId === candidate.id}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

