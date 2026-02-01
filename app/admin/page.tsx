import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sortCandidatesByRegion } from "@/lib/sort-candidates";
import { getTodayJSTDateRange, getTomorrowJSTStart } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { CalendarPlus, Pencil } from "lucide-react";

export default async function AdminDashboard() {
  const session = await auth();

  const [candidatesCount, eventsByStatus, pendingRequestsCount, candidatesWithEventCount] =
    await Promise.all([
      prisma.candidate.count(),
      Promise.all([
        prisma.speechEvent.count({ where: { status: "PLANNED" } }),
        prisma.speechEvent.count({ where: { status: "LIVE" } }),
        prisma.speechEvent.count({ where: { status: "ENDED" } }),
      ]).then(([planned, live, ended]) => ({ planned, live, ended })),
      prisma.publicRequest.count({
        where: { status: "PENDING" },
      }),
      (async () => {
        const todayRange = getTodayJSTDateRange();
        const tomorrowStart = getTomorrowJSTStart();
        const [candidates, events] = await Promise.all([
          prisma.candidate.findMany({
            select: { id: true, name: true, slug: true, type: true, prefecture: true, region: true },
          }),
          prisma.speechEvent.findMany({
            where: { status: { in: ["PLANNED", "LIVE"] } },
            select: { candidateId: true, startAt: true },
          }),
        ]);
        const todayCountByCandidate = new Map<string, number>();
        const tomorrowPlusCountByCandidate = new Map<string, number>();
        for (const e of events) {
          if (!e.startAt) continue;
          const t = e.startAt.getTime();
          if (t >= todayRange.start.getTime() && t <= todayRange.end.getTime()) {
            todayCountByCandidate.set(e.candidateId, (todayCountByCandidate.get(e.candidateId) ?? 0) + 1);
          } else if (t >= tomorrowStart.getTime()) {
            tomorrowPlusCountByCandidate.set(e.candidateId, (tomorrowPlusCountByCandidate.get(e.candidateId) ?? 0) + 1);
          }
        }
        const withCounts = candidates.map((c) => ({
          ...c,
          todayCount: todayCountByCandidate.get(c.id) ?? 0,
          tomorrowPlusCount: tomorrowPlusCountByCandidate.get(c.id) ?? 0,
        }));
        return sortCandidatesByRegion(withCounts);
      })(),
    ]);

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">ダッシュボード</h1>
      <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8">
        ようこそ、{session?.user?.name || session?.user?.email}さん
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Link href="/admin#candidates">
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
              <CardTitle className="text-lg">演説予定</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="text-2xl sm:text-3xl font-bold text-blue-600">{eventsByStatus.planned}</span>
                <span className="text-sm text-muted-foreground">予定</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-2xl sm:text-3xl font-bold text-red-600">{eventsByStatus.live}</span>
                <span className="text-sm text-muted-foreground">実施中</span>
                <span className="text-muted-foreground">/</span>
                <span className="text-2xl sm:text-3xl font-bold text-gray-600">{eventsByStatus.ended}</span>
                <span className="text-sm text-muted-foreground">終了済み</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                合計 {eventsByStatus.planned + eventsByStatus.live + eventsByStatus.ended} 件
              </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">クイックアクション</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link 
              href="/admin/candidates/new"
              className="flex items-center min-h-[44px] p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <span className="font-medium">+ 新しい候補者を追加</span>
            </Link>
            <Link 
              href="/admin/events/new"
              className="flex items-center min-h-[44px] p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors"
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
              className="inline-flex items-center min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              公開サイトを開く →
            </Link>
          </CardContent>
        </Card>
      </div>

      <section id="candidates" className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">候補者一覧</h2>
            <p className="text-sm text-muted-foreground">
              各候補者の演説予定数（今日 / 明日以降、予定・実施中のみ）
            </p>
          </div>
          <Link
            href="/admin/candidates/new"
            className="shrink-0 flex items-center min-h-[44px] text-sm font-medium text-primary hover:underline py-2 -mx-1 px-1 rounded"
          >
            + 新しい候補者を追加
          </Link>
        </div>
        {candidatesWithEventCount.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              候補者がいません
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {candidatesWithEventCount.map((c) => (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link href={`/admin/events?candidate=${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {c.type === "PROPORTIONAL" ? c.region : c.prefecture || c.region || "—"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                    <span>
                      <span className="font-medium text-foreground">今日</span>{" "}
                      <span className="text-muted-foreground">{c.todayCount} 件</span>
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span>
                      <span className="font-medium text-foreground">明日以降</span>{" "}
                      <span className="text-muted-foreground">{c.tomorrowPlusCount} 件</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/events/new?candidate=${c.id}`}
                      className="inline-flex items-center min-h-[44px] gap-1.5 text-sm font-medium text-primary hover:underline py-2 -mx-1 px-1 rounded"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      新規予定追加
                    </Link>
                    <Link
                      href={`/admin/candidates/${c.id}/edit`}
                      className="inline-flex items-center min-h-[44px] gap-1.5 text-sm text-muted-foreground hover:text-foreground py-2 -mx-1 px-1 rounded"
                    >
                      <Pencil className="h-4 w-4" />
                      編集
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
