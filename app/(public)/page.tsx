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

      <main className="container mx-auto px-4 py-6 sm:py-8 min-w-0 overflow-x-hidden">
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>今日の演説予定：</span>
          <span className="font-semibold text-foreground">{todayEventsCount}</span>
          <span>件</span>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
          <Link
            href="/area"
            className="block w-full sm:flex-1 sm:min-w-0 min-h-[48px]"
          >
            <Card className="h-full min-h-[48px] sm:min-h-0 hover:shadow-lg transition-shadow cursor-pointer flex items-center">
              <CardHeader className="text-center py-4 sm:py-6 w-full">
                <CardTitle className="text-base sm:text-xl">エリアごと演説予定を見る</CardTitle>
              </CardHeader>
            </Card>
          </Link>
          <a
            href="https://sns-profile-site.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full sm:flex-1 sm:min-w-0 min-h-[48px]"
          >
            <Card className="h-full min-h-[48px] sm:min-h-0 py-3 px-4 sm:py-3 sm:px-4 hover:shadow-md transition-shadow cursor-pointer border-primary/20 hover:border-primary/40 flex flex-col justify-center">
              <CardContent className="p-0 text-sm text-primary font-medium break-words">
                各候補者の紹介はこちら
              </CardContent>
              <p className="text-xs text-muted-foreground mt-1">サポーター作</p>
            </Card>
          </a>
          <a
            href="https://mirai-checker.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full sm:flex-1 sm:min-w-0 min-h-[48px]"
          >
            <Card className="h-full min-h-[48px] sm:min-h-0 py-3 px-4 sm:py-3 sm:px-4 hover:shadow-md transition-shadow cursor-pointer border-primary/20 hover:border-primary/40 flex flex-col justify-center">
              <CardContent className="p-0 text-sm text-primary font-medium break-words">
                チームみらいに投票できるかチェックする
              </CardContent>
              <p className="text-xs text-muted-foreground mt-1">サポーター作</p>
            </Card>
          </a>
        </div>

        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">候補者別で見る</h2>

        {visibleCandidates.length === 0 ? (
          <p className="text-muted-foreground text-sm sm:text-base">登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
                      className="inline-flex items-center min-h-[44px] text-sm text-primary hover:underline py-2 -mx-1 px-1 rounded"
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

