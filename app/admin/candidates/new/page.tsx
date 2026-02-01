"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CANDIDATE_TYPES, PREFECTURES, PROPORTIONAL_BLOCKS, SingleDistrict } from "@/lib/constants";
import { Loader2 } from "lucide-react";
import { loadSingleDistrictsFromCSV } from "@/lib/single-districts";

export default function NewCandidatePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState<"SINGLE" | "PROPORTIONAL" | "SUPPORT" | "PARTY_LEADER" | "">("");
  const [prefecture, setPrefecture] = useState("");
  const [proportionalBlock, setProportionalBlock] = useState("");
  const [singleDistrict, setSingleDistrict] = useState("");
  const [singleDistricts, setSingleDistricts] = useState<Record<string, SingleDistrict[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    // 小選挙区データを読み込む
    loadSingleDistrictsFromCSV().then(setSingleDistricts);
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

      const res = await fetch("/api/admin/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          slug, 
          type: typeValue,
          prefecture: prefectureValue,
          region: regionValue, 
          imageUrl: null 
        }),
      });

      if (res.ok) {
        router.push("/admin/candidates");
      } else {
        alert("作成に失敗しました");
      }
    } catch (error) {
      alert("エラーが発生しました");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const availableDistricts = prefecture ? (singleDistricts[prefecture] || []) : [];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">候補者追加</h1>

      <Card>
        <CardHeader>
          <CardTitle>候補者情報</CardTitle>
          <CardDescription>新しい候補者を追加します</CardDescription>
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

            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
