"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { CANDIDATE_TYPES, PREFECTURES, PROPORTIONAL_BLOCKS, SingleDistrict } from "@/lib/constants";
import { loadSingleDistrictsFromCSV } from "@/lib/single-districts";
import { hasPermission } from "@/lib/rbac";
import { Loader2 } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  slug: string;
  type: string;
  prefecture: string | null;
  region: string | null;
  imageUrl: string | null;
  showEvents: boolean;
  xAccountUrl: string | null;
}

export default function EditCandidatePage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id as string;

  const [userRole, setUserRole] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"SINGLE" | "PROPORTIONAL" | "SUPPORT" | "PARTY_LEADER" | "">("");
  const [prefecture, setPrefecture] = useState("");
  const [proportionalBlock, setProportionalBlock] = useState("");
  const [singleDistrict, setSingleDistrict] = useState("");
  const [singleDistricts, setSingleDistricts] = useState<Record<string, SingleDistrict[]>>({});
  const [imageUrl, setImageUrl] = useState("");
  const [showEvents, setShowEvents] = useState(false);
  const [xAccountUrl, setXAccountUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const submittingRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  const canDelete = hasPermission({ role: userRole || "" }, "SiteAdmin");

  useEffect(() => {
    // 小選挙区データを読み込む
    loadSingleDistrictsFromCSV().then(setSingleDistricts);

    // 候補者データを取得
    fetch(`/api/admin/candidates/${candidateId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert("候補者の取得に失敗しました");
          router.push("/admin/candidates");
          return;
        }
        setCandidate(data);
        setName(data.name);
        setSlug(data.slug);
        setType(data.type || "");
        setPrefecture(data.prefecture || "");
        setProportionalBlock(data.type === "PROPORTIONAL" ? (data.region || "") : "");
        setSingleDistrict(data.type === "SINGLE" ? (data.region || "") : "");
        setShowEvents(data.showEvents ?? false);
        setXAccountUrl(data.xAccountUrl ?? "");
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching candidate:", error);
        alert("エラーが発生しました");
        router.push("/admin/candidates");
      });
  }, [candidateId, router]);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((session) => setUserRole(session?.user?.role ?? null))
      .catch(() => setUserRole(null));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // regionフィールドに比例ブロックまたは小選挙区名を設定
      let regionValue: string | null = null;
      let typeValue: string | null = null;
      let prefectureValue: string | null = null;
      
      if (type === "PROPORTIONAL") {
        typeValue = "PROPORTIONAL";
        regionValue = proportionalBlock || null;
      } else if (type === "SINGLE") {
        typeValue = "SINGLE";
        prefectureValue = prefecture || null;
        regionValue = singleDistrict || null;
      } else if (type === "SUPPORT") {
        typeValue = "SUPPORT";
      } else if (type === "PARTY_LEADER") {
        typeValue = "PARTY_LEADER";
      }
      // typeが空文字列の場合はnull（立候補区分を表示しない）

      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          type: typeValue,
          prefecture: prefectureValue,
          region: regionValue,
          imageUrl: null,
          showEvents,
          xAccountUrl: xAccountUrl.trim() || null,
        }),
      });

      if (res.ok) {
        router.push("/admin/candidates");
      } else {
        const error = await res.json();
        alert(error.error || "更新に失敗しました");
      }
    } catch (error) {
      alert("エラーが発生しました");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) {
      alert("削除はSiteAdminのみ実行できます。");
      return;
    }

    const displayName = name || candidate?.name || "";
    const ok = window.confirm(
      `候補者${displayName ? `「${displayName}」` : ""}を削除します。\n関連する演説予定も削除されます。\nこの操作は取り消せません。\n本当に削除しますか？`
    );
    if (!ok) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin/candidates");
        return;
      }

      const error = await res.json().catch(() => null);
      alert(error?.error || error?.message || "削除に失敗しました。");
    } catch (error) {
      alert("削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">候補者編集</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (!candidate) {
    return null;
  }

  const availableDistricts = prefecture ? (singleDistricts[prefecture] || []) : [];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">候補者編集</h1>

      <Card>
        <CardHeader>
          <CardTitle>候補者情報</CardTitle>
          <CardDescription>候補者情報を編集します</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                名前 *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-md bg-white"
              />
            </div>
            <div>
              <label htmlFor="slug" className="block text-sm font-medium mb-1">
                Slug（URL用） *
              </label>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                pattern="[a-z0-9-]+"
                className="w-full px-3 py-2 border rounded-md bg-white"
              />
              <p className="text-xs text-muted-foreground mt-1">
                英数字とハイフンのみ使用可能
              </p>
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium mb-1">
                立候補区分
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as "SINGLE" | "PROPORTIONAL" | "SUPPORT" | "PARTY_LEADER" | "";
                  setType(newType);
                  if (newType === "PROPORTIONAL") {
                    setPrefecture("");
                    setSingleDistrict("");
                  } else if (newType === "SINGLE") {
                    setProportionalBlock("");
                  } else {
                    setPrefecture("");
                    setSingleDistrict("");
                    setProportionalBlock("");
                  }
                }}
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="">表示しない</option>
                <option value="SINGLE">小選挙区</option>
                <option value="PROPORTIONAL">比例</option>
                <option value="SUPPORT">応援弁士</option>
                <option value="PARTY_LEADER">党首</option>
              </select>
            </div>

            {/* 比例を選択した場合：比例ブロック選択 */}
            {type === "PROPORTIONAL" && (
              <div>
                <label htmlFor="proportionalBlock" className="block text-sm font-medium mb-1">
                  比例ブロック *
                </label>
                <select
                  id="proportionalBlock"
                  value={proportionalBlock}
                  onChange={(e) => setProportionalBlock(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md bg-white"
                >
                  <option value="">選択してください</option>
                  {PROPORTIONAL_BLOCKS.map((block) => (
                    <option key={block} value={block}>
                      {block}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 小選挙区を選択した場合：都道府県選択 */}
            {type === "SINGLE" && (
              <>
                <div>
                  <label htmlFor="prefecture" className="block text-sm font-medium mb-1">
                    都道府県 *
                  </label>
                  <select
                    id="prefecture"
                    value={prefecture}
                    onChange={(e) => {
                      setPrefecture(e.target.value);
                      setSingleDistrict(""); // 都道府県変更時に小選挙区をリセット
                    }}
                    required
                    className="w-full px-3 py-2 border rounded-md bg-white"
                  >
                    <option value="">選択してください</option>
                    {PREFECTURES.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </select>
                </div>
                {prefecture && availableDistricts.length > 0 && (
                  <div>
                    <label htmlFor="singleDistrict" className="block text-sm font-medium mb-1">
                      小選挙区 *
                    </label>
                    <select
                      id="singleDistrict"
                      value={singleDistrict}
                      onChange={(e) => setSingleDistrict(e.target.value)}
                      required
                      className="w-full px-3 py-2 border rounded-md bg-white"
                    >
                      <option value="">選択してください</option>
                      {availableDistricts.map((district) => (
                        <option key={district.districtName} value={district.districtName}>
                          {district.districtName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {prefecture && availableDistricts.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-sm text-yellow-800">
                      この都道府県の小選挙区データが見つかりません。CSVファイルを確認してください。
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <label htmlFor="xAccountUrl" className="block text-sm font-medium mb-1">
                X（旧Twitter）アカウントURL
              </label>
              <input
                id="xAccountUrl"
                type="url"
                value={xAccountUrl}
                onChange={(e) => setXAccountUrl(e.target.value)}
                placeholder="https://x.com/username"
                className="w-full px-3 py-2 border rounded-md bg-white"
              />
              <p className="text-xs text-muted-foreground mt-1">
                公開ページの名前横に「候補者X」リンクとして表示されます。空欄の場合は非表示です。
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
              <div className="space-y-0.5 flex-1">
                <Label htmlFor="show-events" className="text-base">
                  演説予定の表示
                </Label>
                <p className="text-sm text-muted-foreground">
                  この候補者の演説予定を公開側のページで表示するかどうかを制御します。
                  <br />
                  サイト全体の設定がOFFの場合は、この設定に関係なく非表示になります。
                </p>
              </div>
              <Switch
                id="show-events"
                checked={showEvents}
                onCheckedChange={setShowEvents}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <Button type="submit" disabled={isSubmitting || isDeleting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "更新中..." : "更新"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting || isDeleting}
              >
                キャンセル
              </Button>

              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  className="sm:ml-auto"
                  onClick={handleDelete}
                  disabled={isSubmitting || isDeleting}
                >
                  {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isDeleting ? "削除中..." : "候補者を削除"}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
