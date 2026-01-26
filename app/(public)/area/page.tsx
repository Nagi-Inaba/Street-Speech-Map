import Link from "next/link";
import { prisma } from "@/lib/db";
import PublicHeader from "@/components/PublicHeader";
import AreaEventsView from "@/components/AreaEventsView";
import type { CandidateWithEventsForArea } from "@/components/AreaEventsView";

export const metadata = {
  title: "エリアごと演説予定 | チームみらい 街頭演説マップ",
  description: "エリアごとに候補者の街頭演説予定・実施中・終了を一覧で表示",
};

export default async function AreaPage() {
  const [candidates, settings] = await Promise.all([
    prisma.candidate.findMany({
      include: {
        events: {
          include: {
            additionalCandidates: {
              include: {
                candidate: { select: { name: true } },
              },
            },
          },
          orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
        },
      },
    }),
    prisma.siteSettings.findUnique({
      where: { id: "site-settings" },
    }),
  ]);

  const showEventsSite = settings?.showEvents ?? true;
  const showCandidateInfo = settings?.showCandidateInfo ?? true;
  const candidateLabel = settings?.candidateLabel ?? "候補者";

  // トップと同じ: 党首は常に、その他は type が空でないもの
  const visibleCandidates = candidates.filter((c) => {
    if (c.type === "PARTY_LEADER") return true;
    return !!c.type && c.type !== "";
  });

  // 演説予定を表示する候補者のみ（サイト設定 AND 候補者ごと showEvents）
  const withEvents: CandidateWithEventsForArea[] = visibleCandidates
    .filter((c) => showEventsSite && (c.showEvents ?? false))
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      type: c.type,
      prefecture: c.prefecture,
      region: c.region,
      showEvents: c.showEvents ?? false,
      events: c.events.map((e) => ({
        id: e.id,
        status: e.status,
        startAt: e.startAt?.toISOString() ?? null,
        endAt: e.endAt?.toISOString() ?? null,
        timeUnknown: e.timeUnknown,
        locationText: e.locationText,
        candidateId: e.candidateId,
        candidate: { name: c.name, slug: c.slug },
        additionalCandidates: e.additionalCandidates,
      })),
    }));

  return (
    <>
      <PublicHeader />
      <div className="container mx-auto px-4 py-2">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← トップに戻る
        </Link>
      </div>
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">エリアごと演説予定</h1>
        <p className="text-muted-foreground mb-6">
          エリアを選択すると、その地域の小選挙区候補と比例代表ブロックの候補の演説予定を表示します。
        </p>
        {!showEventsSite ? (
          <p className="text-muted-foreground py-8">演説予定の表示は現在オフになっています。</p>
        ) : (
          <AreaEventsView
            candidates={withEvents}
            showCandidateInfo={showCandidateInfo}
            candidateLabel={candidateLabel}
          />
        )}
      </main>
    </>
  );
}
