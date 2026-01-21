"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Candidate {
  id: string;
  name: string;
  slug: string;
  region: string | null;
  imageUrl: string | null;
}

export default function EditCandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [region, setRegion] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/admin/candidates/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("候補者が見つかりません");
        return res.json();
      })
      .then((data) => {
        setCandidate(data);
        setName(data.name);
        setSlug(data.slug);
        setRegion(data.region || "");
        setImageUrl(data.imageUrl || "");
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/candidates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          region: region || null,
          imageUrl: imageUrl || null,
        }),
      });

      if (res.ok) {
        router.push("/admin/candidates");
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
    if (!confirm("本当にこの候補者を削除しますか？関連するイベントも削除されます。")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/candidates/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin/candidates");
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

  if (!candidate) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-500">{error || "候補者が見つかりません"}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">候補者編集</h1>

      <Card>
        <CardHeader>
          <CardTitle>候補者情報</CardTitle>
          <CardDescription>候補者の情報を編集します</CardDescription>
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
                className="w-full px-3 py-2 border rounded-md"
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
                className="w-full px-3 py-2 border rounded-md"
              />
              <p className="text-xs text-muted-foreground mt-1">
                英数字とハイフンのみ使用可能（例: sample-candidate-1）
              </p>
            </div>
            <div>
              <label htmlFor="region" className="block text-sm font-medium mb-1">
                地域
              </label>
              <input
                id="region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="例: 東京都"
              />
            </div>
            <div>
              <label htmlFor="imageUrl" className="block text-sm font-medium mb-1">
                画像URL
              </label>
              <input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://example.com/image.jpg"
              />
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
