import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default async function Home() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">街頭演説マップ</h1>
          <p className="text-muted-foreground">候補者の演説予定・実施中・終了を地図で可視化</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6">候補者一覧</h2>

        {candidates.length === 0 ? (
          <p className="text-muted-foreground">候補者が登録されていません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
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
                    {candidate.region && (
                      <CardDescription>{candidate.region}</CardDescription>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
