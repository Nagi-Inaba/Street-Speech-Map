import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatJST, formatJSTTime, formatJSTWithoutYear } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import CandidateMap from "@/components/Map/CandidateMap";
import ShareButtons from "@/components/ShareButtons";
import RequestForm from "@/components/RequestForm";
import EventReportButtons from "@/components/EventReportButtons";
import PublicHeader from "@/components/PublicHeader";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}): Promise<Metadata> {
  const { slug, eventId } = await params;
  const baseUrl = getBaseUrl();

  const event = await prisma.speechEvent.findUnique({
    where: { id: eventId },
    include: {
      candidate: true,
    },
  });

  if (!event || event.candidate.slug !== slug) {
    return {
      title: "イベントが見つかりません",
    };
  }

  const isLive = event.status === "LIVE";
  const timeText = event.startAt
    ? formatJSTWithoutYear(event.startAt)
    : "時間未定";

  // タイトルと説明文を生成
  let title = `${event.candidate.name}さん 演説予定 - チームみらい 街頭演説マップ`;
  let description = `${event.candidate.name}さんは${timeText}から${event.locationText}付近で演説予定です。`;

  if (isLive) {
    title = `${event.candidate.name}さん 現在演説中 - チームみらい 街頭演説マップ`;
    description = `${event.candidate.name}さんは現在${event.locationText}付近で演説中です。`;
  }

  // OG画像のURL（個別イベント用）
  const ogImageUrl = `${baseUrl}/c/${slug}/events/${eventId}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/c/${slug}/events/${eventId}`,
      siteName: "チームみらい 街頭演説マップ",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${event.candidate.name} - ${event.locationText}`,
        },
      ],
      locale: "ja_JP",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string; eventId: string }>;
}) {
  const { slug, eventId } = await params;

  const event = await prisma.speechEvent.findUnique({
    where: { id: eventId },
    include: {
      candidate: true,
      moveHints: {
        where: {
          active: true,
        },
      },
    },
  });

  if (!event || event.candidate.slug !== slug) {
    notFound();
  }

  const isLive = event.status === "LIVE";
  const isPlanned = event.status === "PLANNED";
  const isEnded = event.status === "ENDED";

  // 地図用のマーカー
  // 吹き出しに候補者名、場所名、時間を表示
  let timeText = "時間未定";
  if (event.startAt) {
    timeText = formatJSTWithoutYear(event.startAt);
  }
  const popupContent = `
    <div style="color: black;">
      <div style="font-weight: bold; margin-bottom: 4px;">${event.candidate.name}</div>
      <div style="font-size: 12px; margin-bottom: 2px;">${timeText}</div>
      <div style="font-size: 12px;">${event.locationText}</div>
    </div>
  `;
  // 終了した演説は地図に表示しない
  const mapMarkers =
    isEnded
      ? []
      : [
          {
            id: event.id,
            position: [event.lat, event.lng] as [number, number],
            popup: popupContent,
            color: isLive ? "red" : "blue",
          },
        ];

  // MoveHint用のマーカー（終了時は表示しない）
  const moveHintMarkers = isEnded ? [] : event.moveHints.map((hint) => ({
    id: `move-hint-${hint.id}`,
    position: [hint.lat, hint.lng] as [number, number],
    popup: `推定位置（${hint.count}件の報告より）`,
    color: "orange" as const,
    isMoveHint: true,
  }));

  const allMarkers = [...mapMarkers, ...moveHintMarkers];
  const mapCenter: [number, number] = [event.lat, event.lng];

  return (
    <>
      <PublicHeader />
      <div className="container mx-auto px-4 py-2">
        <Link href={`/c/${slug}`} className="text-muted-foreground hover:text-foreground text-sm">
          ← {event.candidate.name}の演説予定一覧を見る
        </Link>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          {event.candidate.imageUrl && (
            <div className="relative w-32 h-32 mb-4 rounded-full overflow-hidden">
              <Image
                src={event.candidate.imageUrl}
                alt={event.candidate.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">{event.candidate.name}</h1>
        </div>

        {/* 地図エリア */}
        {allMarkers.length > 0 && (
          <section id="event-map" className="mb-8 scroll-mt-4">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">地図</h2>
            <Card>
              <CardContent className="p-2 sm:p-4">
                <CandidateMap center={mapCenter} markers={allMarkers} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* 場所変更報告がある場合の注意喚起 */}
        {(isLive || isPlanned) && event.moveHints.length > 0 && (
          <section className="mb-6">
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4">
                <p className="text-sm text-amber-900 mb-3">
                  場所変更報告で演説場所が変更になった可能性があります。最新の情報は候補者のXをご確認ください。
                </p>
                <p className="text-sm font-medium text-amber-900 mb-2">移動した可能性のある場所：</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-amber-900">
                  {event.moveHints.map((hint) => (
                    <li key={hint.id}>
                      こちらに移動した可能性があります（{hint.count}件の報告より）
                      <a href="#event-map" className="ml-1 text-amber-700 underline hover:no-underline">
                        地図で見る
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        {/* イベント詳細 */}
        <section className="mb-8">
          <Card
            className={
              isLive
                ? "border-red-200 bg-red-50"
                : isEnded
                ? "opacity-60"
                : ""
            }
          >
            <CardHeader>
              <CardTitle>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="break-words">{event.locationText}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                        isLive
                          ? "bg-red-100 text-red-800"
                          : isEnded
                          ? "bg-gray-100 text-gray-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {isLive ? "実施中" : isEnded ? "終了" : "予定"}
                    </span>
                  </div>
                  {(isLive || isPlanned) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground">現在の状況を報告する</span>
                      <EventReportButtons
                        eventId={event.id}
                        eventLat={event.lat}
                        eventLng={event.lng}
                        eventStatus={event.status}
                        eventStartAt={event.startAt}
                        eventEndAt={event.endAt}
                      />
                    </div>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                {event.timeUnknown
                  ? "時間未定"
                  : event.startAt
                  ? `${formatJST(event.startAt)}${
                      event.endAt ? ` - ${formatJSTTime(event.endAt)}` : ""
                    }`
                  : "時間未定"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <p className="text-sm text-muted-foreground">
                  登録時刻: {formatJST(event.submittedAt)}
                </p>
                {(isLive || isPlanned) && (
                  <ShareButtons
                    eventUrl={`/c/${slug}/events/${eventId}`}
                    candidateName={event.candidate.name}
                    locationText={event.locationText}
                    isLive={isLive}
                    startAt={event.startAt ? formatJSTWithoutYear(event.startAt) : undefined}
                  />
                )}
              </div>
              {event.notes && (
                <p className="text-sm text-muted-foreground mt-2">備考: {event.notes}</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* リクエスト送信フォーム */}
        <RequestForm candidateId={event.candidate.id} candidateName={event.candidate.name} />
      </main>
    </>
  );
}
