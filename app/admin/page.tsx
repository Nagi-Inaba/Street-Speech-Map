import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

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
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">ダッシュボード</h1>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
        ようこそ、{session?.user?.name || session?.user?.email}さん
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Link href="/admin/candidates">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">候補者数</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl sm:text-4xl font-bold text-primary">{candidatesCount}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">登録済み候補者</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/events">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">演説予定数</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{eventsCount}</p>
              <p className="text-sm text-muted-foreground mt-1">登録済み演説予定</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/requests">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="text-lg">未承認リクエスト</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-orange-500">{pendingRequestsCount}</p>
              <p className="text-sm text-muted-foreground mt-1">承認待ちリクエスト</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link 
              href="/admin/candidates/new"
              className="block p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium">+ 新しい候補者を追加</span>
            </Link>
            <Link 
              href="/admin/events/new"
              className="block p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium">+ 新しい演説予定を追加</span>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">公開サイト</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              一般ユーザー向けの公開ページを確認できます。
            </p>
            <Link 
              href="/"
              target="_blank"
              className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              公開サイトを開く →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
