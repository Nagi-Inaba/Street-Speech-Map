import { auth } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminDashboard() {
  const session = await auth();

  const [candidatesCount, eventsCount, pendingRequestsCount] = await Promise.all([
    prisma.candidate.count(),
    prisma.speechEvent.count(),
    prisma.publicRequest.count({
      where: { status: "PENDING" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>候補者数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{candidatesCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>イベント数</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{eventsCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>未承認リクエスト</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingRequestsCount}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
