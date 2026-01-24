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
  const candidateLabel = settings?.candidateLabel ?? "候補者";

  return (
    <>
      <PublicHeader />

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">{candidateLabel}一覧</h2>

        {sortedCandidates.length === 0 ? (
          <p className="text-muted-foreground">{candidateLabel}が登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCandidates.map((candidate) => (
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
                    {showCandidateInfo && candidate.region && (
                      <CardDescription>{candidate.region}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

