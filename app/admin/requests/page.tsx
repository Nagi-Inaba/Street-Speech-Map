import { prisma } from "@/lib/db";
import { formatJST } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ candidateId?: string; status?: string }>;
}) {
  const params = await searchParams;
  const candidateId = params.candidateId;
  const status = params.status as "PENDING" | "APPROVED" | "REJECTED" | undefined;

  const requests = await prisma.publicRequest.findMany({
    where: {
      ...(candidateId && { candidateId }),
      ...(status && { status }),
    },
    include: {
      candidate: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // 重複キーでグループ化
  const groupedByDedupe = new Map<string, typeof requests>();
  requests.forEach((req) => {
    if (req.dedupeKey) {
      if (!groupedByDedupe.has(req.dedupeKey)) {
        groupedByDedupe.set(req.dedupeKey, []);
      }
      groupedByDedupe.get(req.dedupeKey)!.push(req);
    } else {
      // dedupeKeyがない場合は単独で表示
      groupedByDedupe.set(req.id, [req]);
    }
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">リクエスト審査</h1>

      <div className="space-y-4">
        {Array.from(groupedByDedupe.entries()).map(([key, group]) => {
          const representative = group[0];
          const duplicates = group.slice(1);

          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                    {representative.type} - {representative.candidate?.name || "候補者不明"}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    representative.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                    representative.status === "APPROVED" ? "bg-green-100 text-green-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {representative.status === "PENDING" ? "未承認" :
                     representative.status === "APPROVED" ? "承認済み" : "却下"}
                  </span>
                </CardTitle>
                <CardDescription>
                  {formatJST(representative.createdAt)}
                  {duplicates.length > 0 && (
                    <span className="ml-2 text-xs">
                      （重複: {duplicates.length}件）
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-2 rounded mb-4 overflow-auto">
                  {JSON.stringify(JSON.parse(representative.payload), null, 2)}
                </pre>
                <div className="flex gap-2">
                  <Button variant="default" size="sm">
                    承認
                  </Button>
                  <Button variant="outline" size="sm">
                    却下
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {requests.length === 0 && (
        <p className="text-muted-foreground">リクエストがありません。</p>
      )}
    </div>
  );
}
