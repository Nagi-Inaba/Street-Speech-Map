"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CANDIDATE_TYPES, PREFECTURES, PROPORTIONAL_BLOCKS, SingleDistrict } from "@/lib/constants";
import { loadSingleDistrictsFromCSV } from "@/lib/single-districts";

interface Candidate {
  id: string;
  name: string;
  slug: string;
  type: string;
  prefecture: string | null;
  region: string | null;
  imageUrl: string | null;
  events: Array<{ id: string }>;
}

export default function EditCandidatePage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"SINGLE" | "PROPORTIONAL">("PROPORTIONAL");
  const [prefecture, setPrefecture] = useState("");
  const [proportionalBlock, setProportionalBlock] = useState("");
  const [singleDistrict, setSingleDistrict] = useState("");
  const [singleDistricts, setSingleDistricts] = useState<Record<string, SingleDistrict[]>>({});
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // 小選挙区データを読み込む
    loadSingleDistrictsFromCSV().then(setSingleDistricts);
  }, []);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const res = await fetch(`/api/admin/candidates/${candidateId}`);
        if (res.ok) {
          const data = await res.json();
          setCandidate(data);
          setName(data.name);
          setSlug(data.slug);
          setType(data.type);
          setPrefecture(data.prefecture || "");
          
          // regionフィールドから比例ブロックまたは小選挙区名を取得
          if (data.type === "PROPORTIONAL") {
            setProportionalBlock(data.region || "");
          } else if (data.type === "SINGLE") {
            setSingleDistrict(data.region || "");
          }
          
          setImageUrl(data.imageUrl || "");
        } else {
          setError("候補者の取得に失敗しました");
        }
      } catch (error) {
        console.error("Error fetching candidate:", error);
        setError("エラーが発生しました");
      } finally {
        setIsLoading(false);
      }
    };

    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      // regionフィールドに比例ブロックまたは小選挙区名を設定
      let regionValue: string | null = null;
      if (type === "PROPORTIONAL") {
        regionValue = proportionalBlock || null;
      } else if (type === "SINGLE") {
        regionValue = singleDistrict || null;
      }

      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          type,
          prefecture: type === "SINGLE" ? (prefecture || null) : null,
          region: regionValue,
          imageUrl: imageUrl || null,
        }),
      });

      if (res.ok) {
        router.push("/admin/candidates");
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

  const handleDelete = async () => {
    if (!confirm("この候補者を削除しますか？関連する演説予定がある場合は削除できません。")) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/candidates/${candidateId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin/candidates");
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "削除に失敗しました");
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

  if (error && !candidate) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Button onClick={() => router.back()} className="mt-4">
          戻る
        </Button>
      </div>
    );
  }

  const availableDistricts = prefecture ? (singleDistricts[prefecture] || []) : [];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">候補者編集</h1>

      <Card>
        <CardHeader>
          <CardTitle>候補者情報</CardTitle>
          <CardDescription>候補者情報を編集します</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {candidate && candidate.events.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                注意: この候補者には{candidate.events.length}件の演説予定が登録されています。
                演説予定がある候補者は削除できません。
              </p>
            </div>
          )}

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
                立候補区分 *
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as "SINGLE" | "PROPORTIONAL");
                  if (e.target.value === "PROPORTIONAL") {
                    setPrefecture("");
                    setSingleDistrict("");
                  } else {
                    setProportionalBlock("");
                  }
                }}
                required
                className="w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="PROPORTIONAL">比例</option>
                <option value="SINGLE">小選挙区</option>
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
              <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">
                画像URL
              </label>
              <input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-md bg-white"
              />
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
              {candidate && candidate.events.length === 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                >
                  削除
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
