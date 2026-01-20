import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatJST, formatJSTTime } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LeafletMap from "@/components/Map/LeafletMap";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    include: {
      events: {
        orderBy: [
          { startAt: "asc" },
          { createdAt: "desc" },
        ],
      },
    },
  });

  if (!candidate) {
    notFound();
  }

  const now = new Date();
  const plannedEvents = candidate.events.filter((e) => e.status === "PLANNED");
  const liveEvents = candidate.events.filter((e) => e.status === "LIVE");
  const endedEvents = candidate.events.filter((e) => e.status === "ENDED");

  // 地図用のマーカー
  const mapMarkers = candidate.events
    .filter((e) => e.status !== "ENDED")
    .map((event) => ({
      id: event.id,
      position: [event.lat, event.lng] as [number, number],
      popup: `${event.locationText}\n${event.startAt ? formatJSTTime(event.startAt) : "時間未定"}`,
      color: event.status === "LIVE" ? "red" : "blue",
    }));

  // 地図の中心（最初のイベントまたは東京駅）
  const mapCenter: [number, number] =
    mapMarkers.length > 0
      ? mapMarkers[0].position
      : [35.6812, 139.7671];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            ← 候補者一覧に戻る
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          {candidate.imageUrl && (
            <div className="relative w-32 h-32 mb-4 rounded-full overflow-hidden">
              <Image
                src={candidate.imageUrl}
                alt={candidate.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold mb-2">{candidate.name}</h1>
          {candidate.region && (
            <p className="text-muted-foreground">{candidate.region}</p>
          )}
        </div>

        {/* 実施中のイベント */}
        {liveEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-red-600">実施中</h2>
            <div className="space-y-4">
              {liveEvents.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{event.locationText}</span>
                      <Button variant="outline" size="sm">
                        共有
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      {event.timeUnknown
                        ? "時間未定"
                        : event.startAt
                        ? `${formatJSTTime(event.startAt)} - ${event.endAt ? formatJSTTime(event.endAt) : "終了未定"}`
                        : "時間未定"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      登録時刻: {formatJST(event.submittedAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 予定のイベント */}
        {plannedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">予定</h2>
            <div className="space-y-4">
              {plannedEvents.map((event) => (
                <Card key={event.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{event.locationText}</span>
                      <Button variant="outline" size="sm">
                        共有
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      {formatJST(event.startAt)}
                      {event.endAt && ` - ${formatJSTTime(event.endAt)}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      登録時刻: {formatJST(event.submittedAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 終了したイベント */}
        {endedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-muted-foreground">終了</h2>
            <div className="space-y-4">
              {endedEvents.map((event) => (
                <Card key={event.id} className="opacity-60">
                  <CardHeader>
                    <CardTitle>{event.locationText}</CardTitle>
                    <CardDescription>
                      {formatJST(event.startAt)}
                      {event.endAt && ` - ${formatJSTTime(event.endAt)}`}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        {candidate.events.length === 0 && (
          <p className="text-muted-foreground">演説予定はありません。</p>
        )}

        {/* 地図エリア */}
        {mapMarkers.length > 0 && (
          <section className="mt-8">
            <h2 className="text-2xl font-bold mb-4">地図</h2>
            <Card>
              <CardContent className="p-0">
                <LeafletMap
                  center={mapCenter}
                  zoom={13}
                  markers={mapMarkers}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
