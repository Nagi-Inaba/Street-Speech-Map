"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

interface Candidate {
  id: string;
  name: string;
  slug: string;
  type: string;
  prefecture: string | null;
  region: string | null;
  imageUrl: string | null;
}

interface CandidatesPageClientProps {
  candidates: Candidate[];
}

export default function CandidatesPageClient({ candidates }: CandidatesPageClientProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/candidates/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error("Error deleting candidate:", error);
      alert("エラーが発生しました");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">候補者一覧</h1>
        <Link href="/admin/candidates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規追加
          </Button>
        </Link>
      </div>

      {candidates.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            候補者が登録されていません
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <Card key={candidate.id}>
              <CardHeader>
                {candidate.imageUrl && (
                  <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
                    <Image
                      src={candidate.imageUrl}
                      alt={candidate.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <CardTitle>{candidate.name}</CardTitle>
                <CardDescription>
                  {candidate.region || candidate.prefecture || "ー"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Link href={`/admin/candidates/${candidate.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Pencil className="mr-2 h-4 w-4" />
                      編集
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => handleDelete(candidate.id, candidate.name)}
                    disabled={deletingId === candidate.id}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

