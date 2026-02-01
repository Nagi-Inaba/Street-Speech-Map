import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import PublicHeader from "@/components/PublicHeader";
import { sortCandidatesByRegion } from "@/lib/sort-candidates";
import { getTodayJSTDateRange } from "@/lib/time";
import type { Metadata } from "next";

// ベースURLを取得（環境変数から、またはデフォルト値を使用）
function getBaseUrl() {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: "チームみらい 街頭演説マップ",
  description: "候補者の街頭演説予定・実施中・終了を地図で可視化",
  openGraph: {
    title: "チームみらい 街頭演説マップ",
    description: "候補者の街頭演説予定・実施中・終了を地図で可視化",
    url: baseUrl,
    siteName: "チームみらい 街頭演説マップ",
    images: [
      {
        url: `${baseUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "チームみらい 街頭演説マップ",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "チームみらい 街頭演説マップ",
    description: "候補者の街頭演説予定・実施中・終了を地図で可視化",
    images: [`${baseUrl}/opengraph-image`],
  },
};

// キャッシュを無効化して常に最新データを取得
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const { start: todayStart, end: todayEnd } = getTodayJSTDateRange();

  const [candidates, settings, todayEventsCount] = await Promise.all([
    prisma.candidate.findMany(),
    prisma.siteSettings.findUnique({
      where: { id: "site-settings" },
    }),
    prisma.speechEvent.count({
      where: {
        status: { in: ["PLANNED", "LIVE"] },
        startAt: { gte: todayStart, lte: todayEnd },
        isPublic: true,
      },
    }),
  ]);

  const sortedCandidates = sortCandidatesByRegion(candidates);
  const showCandidateInfo = settings?.showCandidateInfo ?? true;
  const candidateLabel = settings?.candidateLabel !== undefined ? settings.candidateLabel : "候補者";
  const visibleCandidates = sortedCandidates;

  return (
    <>
      <PublicHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>今日の演説予定：</span>
          <span className="font-semibold text-foreground">{todayEventsCount}</span>
          <span>件</span>
        </div>

        <Link
          href="/area"
          className="inline-block w-full sm:w-auto mb-6"
        >
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">エリアごと演説予定を見る</CardTitle>
            </CardHeader>
          </Card>
        </Link>

        <h2 className="text-2xl sm:text-3xl font-bold mb-6">候補者別で見る</h2>

        {visibleCandidates.length === 0 ? (
          <p className="text-muted-foreground">登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCandidates.map((candidate) => {
              // 表示する立候補区分のテキストを決定
              let typeText: string | null = null;
              if (candidate.type === "PARTY_LEADER") {
                typeText = "党首";
              } else if (showCandidateInfo) {
                // 立候補区分の表示が有効な場合のみ表示
                if (candidate.type === "SINGLE" && candidate.region) {
                  typeText = candidate.region;
                } else if (candidate.type === "PROPORTIONAL" && candidate.region) {
                  typeText = candidate.region;
                } else if (candidate.type === "SUPPORT") {
                  typeText = "応援弁士";
                }
              }

              return (
                <Card key={candidate.id} className="hover:shadow-lg transition-shadow">
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
                    {typeText && (
                      <CardDescription>{typeText}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Link
                      href={`/c/${candidate.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      地図で見る
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

