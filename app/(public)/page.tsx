import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import PublicHeader from "@/components/PublicHeader";
import { sortCandidatesByRegion } from "@/lib/sort-candidates";

export default async function HomePage() {
  const candidates = await prisma.candidate.findMany();
  const sortedCandidates = sortCandidatesByRegion(candidates);
  
  // 設定を取得
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "site-settings" },
  });
  const showCandidateInfo = settings?.showCandidateInfo ?? true;
  const candidateLabel = settings?.candidateLabel !== undefined ? settings.candidateLabel : "候補者";

  // 表示する候補者をフィルタリング
  // 党首は常に表示、その他は立候補区分（type）が設定されている場合のみ表示
  const visibleCandidates = sortedCandidates.filter((candidate) => {
    // 党首は常に表示
    if (candidate.type === "PARTY_LEADER") return true;
    // その他は立候補区分が設定されている場合のみ表示
    return candidate.type && candidate.type !== "";
  });

  return (
    <>
      <PublicHeader />

      <main className="container mx-auto px-4 py-8">
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
                <Link key={candidate.id} href={`/c/${candidate.slug}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

