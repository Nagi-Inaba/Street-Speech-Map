import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatJST, formatJSTTime } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import CandidateMap from "@/components/Map/CandidateMap";
import ShareButton from "@/components/ShareButton";
import RequestForm from "@/components/RequestForm";
import ReportForm from "@/components/ReportForm";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  if (!slug) {
    console.error("Slug is missing");
    notFound();
  }

  let candidate;
  try {
    // まず候補者のみを取得（eventsを含めない）
    const candidateWithoutEvents = await prisma.candidate.findUnique({
      where: { slug },
    });

    if (!candidateWithoutEvents) {
      console.error("Candidate not found for slug:", slug);
      notFound();
    }

    // 次にeventsを別途取得
    const events = await prisma.speechEvent.findMany({
      where: { candidateId: candidateWithoutEvents.id },
      orderBy: [
        { startAt: "asc" },
        { createdAt: "desc" },
      ],
    });

    // 候補者とイベントを結合
    candidate = {
      ...candidateWithoutEvents,
      events,
    };
  } catch (error) {
    console.error("Error fetching candidate:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }

  // statusフィールドを文字列として明示的に扱う（Prismaクライアントの型問題を回避）
  const plannedEvents = candidate.events.filter((e) => String(e.status) === "PLANNED");
  const liveEvents = candidate.events.filter((e) => String(e.status) === "LIVE");
  const endedEvents = candidate.events.filter((e) => String(e.status) === "ENDED");

  // 地図用のマーカー
  const mapMarkers = candidate.events
    .filter((e) => String(e.status) !== "ENDED")
    .map((event) => ({
      id: event.id,
      position: [event.lat, event.lng] as [number, number],
      popup: `${event.locationText}\n${event.startAt ? formatJSTTime(event.startAt) : "時間未定"}`,
      color: String(event.status) === "LIVE" ? "red" : "blue",
    }));

  // 地図の中心（最初のイベント、候補者の地域、または東京駅）
  const getMapCenter = (): [number, number] => {
    if (mapMarkers.length > 0) {
      return mapMarkers[0].position;
    }
    // 地域に基づいてデフォルト位置を設定
    if (candidate.region?.includes("東京")) {
      return [35.6812, 139.7671]; // 東京駅
    } else if (candidate.region?.includes("神奈川")) {
      return [35.4658, 139.6203]; // 横浜駅
    } else if (candidate.region?.includes("埼玉")) {
      return [35.9069, 139.6236]; // 大宮駅
    }
    return [35.6812, 139.7671]; // デフォルト: 東京駅
  };
  const mapCenter = getMapCenter();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-muted-foreground hover:text-foreground flex items-center gap-2">
              <span>←</span>
              <span>候補者一覧に戻る</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 候補者情報ヘッダー */}
        <div className="mb-8">
          <div className="flex items-start gap-6">
            {candidate.imageUrl && (
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
                <Image
                  src={candidate.imageUrl}
                  alt={candidate.name}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{candidate.name}</h1>
              {candidate.region && (
                <p className="text-muted-foreground text-lg">{candidate.region}</p>
              )}
            </div>
          </div>
        </div>

        {/* 地図エリア（常に表示） */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">地図</h2>
          <Card>
            <CardContent className="p-4">
              <CandidateMap center={mapCenter} markers={mapMarkers} />
              {mapMarkers.length === 0 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  演説予定が登録されると、地図上に表示されます
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 実施中のイベント */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-red-600">🔴 実施中</h2>
          {liveEvents.length > 0 ? (
            <div className="space-y-4">
              {liveEvents.map((event) => (
                <Card key={event.id} className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{event.locationText}</span>
                      <ShareButton
                        candidateName={candidate.name}
                        locationText={event.locationText}
                        isLive={true}
                        eventUrl={`/c/${candidate.slug}#event-${event.id}`}
                      />
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
                    <p className="text-sm text-muted-foreground mb-2">
                      登録時刻: {formatJST(event.submittedAt)}
                    </p>
                    <ReportForm
                      eventId={event.id}
                      eventLocationText={event.locationText}
                      eventLat={event.lat}
                      eventLng={event.lng}
                      candidateName={candidate.name}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">
                  現在実施中の演説はありません
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* 予定のイベント */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">📅 予定</h2>
          {plannedEvents.length > 0 ? (
            <div className="space-y-4">
              {plannedEvents.map((event) => (
                <Card key={event.id} id={`event-${event.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{event.locationText}</span>
                      <ShareButton
                        candidateName={candidate.name}
                        locationText={event.locationText}
                        isLive={false}
                        startAt={event.startAt ? formatJSTTime(event.startAt) : undefined}
                        eventUrl={`/c/${candidate.slug}#event-${event.id}`}
                      />
                    </CardTitle>
                    <CardDescription>
                      {event.timeUnknown
                        ? "時間未定"
                        : event.startAt
                        ? `${formatJST(event.startAt)}${event.endAt ? ` - ${formatJSTTime(event.endAt)}` : ""}`
                        : "時間未定"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">
                      登録時刻: {formatJST(event.submittedAt)}
                    </p>
                    <ReportForm
                      eventId={event.id}
                      eventLocationText={event.locationText}
                      eventLat={event.lat}
                      eventLng={event.lng}
                      candidateName={candidate.name}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">
                  予定されている演説はありません
                </p>
              </CardContent>
            </Card>
          )}
        </section>

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
                      {event.timeUnknown
                        ? "時間未定"
                        : event.startAt
                        ? `${formatJST(event.startAt)}${event.endAt ? ` - ${formatJSTTime(event.endAt)}` : ""}`
                        : "時間未定"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* リクエスト投稿フォーム */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">情報提供</h2>
          <RequestForm candidateId={candidate.id} candidateName={candidate.name} />
        </section>
      </main>
    </div>
  );
}
