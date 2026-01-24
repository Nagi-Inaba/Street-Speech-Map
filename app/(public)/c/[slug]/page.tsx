import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatJST, formatJSTTime, formatJSTDay } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import CandidateMap from "@/components/Map/CandidateMap";
import ShareButtons from "@/components/ShareButtons";
import RequestForm from "@/components/RequestForm";
import EventReportButtons from "@/components/EventReportButtons";
import { getPrefectureCoordinates } from "@/lib/constants";
import PublicHeader from "@/components/PublicHeader";

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
        include: {
          moveHints: {
            where: {
              active: true,
            },
          },
        },
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

  const plannedEvents = candidate.events.filter((e) => e.status === "PLANNED");
  const liveEvents = candidate.events.filter((e) => e.status === "LIVE");
  const endedEvents = candidate.events.filter((e) => e.status === "ENDED");

  // 地図用のマーカー（通常のイベントピン）
  const mapMarkers = candidate.events
    .filter((e) => e.status !== "ENDED")
    .map((event) => {
      let popupText = event.locationText;
      if (event.startAt) {
        const day = formatJSTDay(event.startAt);
        const time = formatJSTTime(event.startAt);
        popupText += `\n${day} ${time}`;
      } else {
        popupText += "\n時間未定";
      }
      return {
        id: event.id,
        position: [event.lat, event.lng] as [number, number],
        popup: popupText,
        color: event.status === "LIVE" ? "red" : "blue",
      };
    });

  // MoveHint用のマーカー（推定位置）
  const moveHintMarkers = candidate.events
    .filter((e) => e.status !== "ENDED")
    .flatMap((event) => {
      const hints = event.moveHints || [];
      return hints.map((hint) => ({
        id: `move-hint-${hint.id}`,
        position: [hint.lat, hint.lng] as [number, number],
        popup: `推定位置（${hint.count}件の報告より）`,
        color: "orange" as const,
        isMoveHint: true,
      }));
    });

  // すべてのマーカーを結合
  const allMarkers = [...mapMarkers, ...moveHintMarkers];

  // 地図の中心位置を決定
  // 1. 予定がある場合: 演説中 > 直近の予定の位置を優先
  // 2. 予定がない場合: 候補者の都道府県の座標
  // 3. それもない場合: 東京駅（デフォルト）
  let mapCenter: [number, number] = [35.6812, 139.7671]; // デフォルト: 東京駅

  if (allMarkers.length > 0) {
    // 演説中のイベントを優先（通常のマーカーのみ）
    const liveMarker = mapMarkers.find((m) => {
      const event = candidate.events.find((e) => e.id === m.id);
      return event?.status === "LIVE";
    });

    if (liveMarker) {
      mapCenter = liveMarker.position;
    } else {
      // 直近の予定（startAtが最も近いもの）
      const sortedEvents = candidate.events
        .filter((e) => e.status === "PLANNED" && e.startAt)
        .sort((a, b) => {
          if (!a.startAt || !b.startAt) return 0;
          return a.startAt.getTime() - b.startAt.getTime();
        });

      if (sortedEvents.length > 0) {
        const nearestEvent = sortedEvents[0];
        mapCenter = [nearestEvent.lat, nearestEvent.lng];
      } else if (mapMarkers.length > 0) {
        // startAtがない場合は最初のマーカーを使用
        mapCenter = mapMarkers[0].position;
      } else if (moveHintMarkers.length > 0) {
        // 通常のマーカーがない場合はMoveHintを使用
        mapCenter = moveHintMarkers[0].position;
      }
    }
  } else {
    // 予定がない場合、候補者の都道府県の座標を使用
    const prefectureCoords = getPrefectureCoordinates(candidate.prefecture);
    if (prefectureCoords) {
      mapCenter = prefectureCoords;
    }
  }

  return (
    <>
      <PublicHeader />
      <div className="container mx-auto px-4 py-2">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← 候補者一覧に戻る
        </Link>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
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

        {/* 地図エリア（上部に配置） */}
        {allMarkers.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">地図</h2>
            <Card>
              <CardContent className="p-4">
                <CandidateMap center={mapCenter} markers={allMarkers} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* 実施中の演説予定 */}
        {liveEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-red-600">🔴 実施中</h2>
            <div className="space-y-4">
              {liveEvents.map((event) => (
                <Card key={event.id} className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{event.locationText}</span>
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800">
                            実施中
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">現在の状況を報告する</span>
                          <EventReportButtons
                            eventId={event.id}
                            eventLat={event.lat}
                            eventLng={event.lng}
                            eventStatus={event.status}
                          />
                        </div>
                      </div>
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
                    <div className="flex items-center gap-4 flex-wrap">
                      <p className="text-sm text-muted-foreground">
                        登録時刻: {formatJST(event.submittedAt)}
                      </p>
                      <ShareButtons
                        eventUrl={`/c/${candidate.slug}#event-${event.id}`}
                        candidateName={candidate.name}
                        locationText={event.locationText}
                        isLive={true}
                      />
                    </div>
                    {event.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        備考: {event.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 予定の演説予定 */}
        {plannedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">📅 予定</h2>
            <div className="space-y-4">
              {plannedEvents.map((event) => (
                <Card key={event.id} id={`event-${event.id}`}>
                  <CardHeader>
                    <CardTitle>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{event.locationText}</span>
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                            予定
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">現在の状況を報告する</span>
                          <EventReportButtons
                            eventId={event.id}
                            eventLat={event.lat}
                            eventLng={event.lng}
                            eventStatus={event.status}
                          />
                        </div>
                      </div>
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
                    <div className="flex items-center gap-4 flex-wrap">
                      <p className="text-sm text-muted-foreground">
                        登録時刻: {formatJST(event.submittedAt)}
                      </p>
                      <ShareButtons
                        eventUrl={`/c/${candidate.slug}#event-${event.id}`}
                        candidateName={candidate.name}
                        locationText={event.locationText}
                        isLive={false}
                        startAt={event.startAt ? formatJSTTime(event.startAt) : undefined}
                      />
                    </div>
                    {event.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        備考: {event.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* 終了した演説予定 */}
        {endedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-muted-foreground">終了</h2>
            <div className="space-y-4">
              {endedEvents.map((event) => (
                <Card key={event.id} className="opacity-60">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
                      <span>{event.locationText}</span>
                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                        終了
                      </span>
                    </CardTitle>
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

        {candidate.events.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            演説予定はまだ登録されていません。
          </p>
        )}

        {/* リクエスト送信フォーム */}
        <RequestForm candidateId={candidate.id} candidateName={candidate.name} />
      </main>
    </>
  );
}
