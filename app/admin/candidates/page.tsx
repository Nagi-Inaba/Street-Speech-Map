import { prisma } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CandidatesPage() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">候補者管理</h1>
        <Link href="/admin/candidates/new">
          <Button>新規作成</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map((candidate) => (
          <Card key={candidate.id}>
            <CardHeader>
              <CardTitle>{candidate.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Slug: {candidate.slug}
              </p>
              {candidate.region && (
                <p className="text-sm text-muted-foreground mb-4">
                  地域: {candidate.region}
                </p>
              )}
              <div className="flex gap-2">
                <Link href={`/admin/candidates/${candidate.id}/edit`}>
                  <Button variant="outline" size="sm">
                    編集
                  </Button>
                </Link>
                <Link href={`/c/${candidate.slug}`}>
                  <Button variant="outline" size="sm">
                    公開ページ
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {candidates.length === 0 && (
        <p className="text-muted-foreground">候補者が登録されていません。</p>
      )}
    </div>
  );
}
