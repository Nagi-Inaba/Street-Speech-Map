"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  const [showCandidateInfo, setShowCandidateInfo] = useState(true);
  const [candidateLabel, setCandidateLabel] = useState("候補者");
  const [showEvents, setShowEvents] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setShowCandidateInfo(data.showCandidateInfo ?? true);
        setCandidateLabel(data.candidateLabel ?? "候補者");
        setShowEvents(data.showEvents ?? true);
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

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">サイト設定</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>公開表示設定</CardTitle>
          <CardDescription>
            公開側のページでの表示を制御します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
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
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
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
            </p>
            <Input
              id="candidate-label"
              type="text"
              value={candidateLabel}
              onChange={(e) => setCandidateLabel(e.target.value)}
              placeholder="候補者"
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
    </div>
  );
}

