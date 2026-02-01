import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatJST, formatJSTTime, formatJSTDay, formatJSTWithoutYear } from "@/lib/time";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import CandidateMap from "@/components/Map/CandidateMap";
import ShareButtons from "@/components/ShareButtons";
import RequestForm from "@/components/RequestForm";
import EventReportButtons from "@/components/EventReportButtons";
import { getPrefectureCoordinates } from "@/lib/constants";
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
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = getBaseUrl();

  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    include: {
      events: {
        where: {
          isPublic: true,
          status: {
            in: ["PLANNED", "LIVE"],
          },
        },
        orderBy: [
          { status: "asc" }, // LIVEを先に
          { startAt: "asc" },
        ],
        take: 1, // 最初の1件のみ取得
      },
    },
  });

  if (!candidate) {
    return {
      title: "候補者が見つかりません",
    };
  }

  const liveEvents = candidate.events.filter((e) => e.status === "LIVE");
  const plannedEvents = candidate.events.filter((e) => e.status === "PLANNED");
  const firstEvent = candidate.events[0];

  // タイトルと説明文を生成
  let title = `${candidate.name} - チームみらい 街頭演説マップ`;
  let description = `${candidate.name}さんの街頭演説予定・実施中・終了を地図で可視化`;

  if (liveEvents.length > 0 && firstEvent) {
    title = `${candidate.name}さん 現在演説中 - チームみらい 街頭演説マップ`;
    description = `${candidate.name}さんは現在${firstEvent.locationText}付近で演説中です。`;
  } else if (plannedEvents.length > 0 && firstEvent) {
    const timeText = firstEvent.startAt
      ? formatJSTWithoutYear(firstEvent.startAt)
      : "時間未定";
    title = `${candidate.name}さん 演説予定 - チームみらい 街頭演説マップ`;
    description = `${candidate.name}さんは${timeText}から${firstEvent.locationText}付近で演説予定です。`;
  }

  // OG画像のURL（動的に生成されたカード画像を使用）
  const ogImageUrl = `${baseUrl}/c/${candidate.slug}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/c/${candidate.slug}`,
      siteName: "チームみらい 街頭演説マップ",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: candidate.name,
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

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [candidate, settings] = await Promise.all([
    prisma.candidate.findUnique({
      where: { slug },
      include: {
        events: {
          where: { isPublic: true },
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
    }),
    prisma.siteSettings.findUnique({
      where: { id: "site-settings" },
    }),
  ]);

  if (!candidate) {
    notFound();
  }

  const showCandidateInfo = settings?.showCandidateInfo ?? true;
  const candidateLabel = settings?.candidateLabel !== undefined ? settings.candidateLabel : "候補者";
  // サイト全体の設定と候補者個別の設定の両方がONの時だけ表示
  const showEvents = (settings?.showEvents ?? true) && (candidate.showEvents ?? false);

  const plannedEvents = candidate.events.filter((e) => e.status === "PLANNED");
  const liveEvents = candidate.events.filter((e) => e.status === "LIVE");
  // 終了は「直近で終了」が上になるよう endAt 降順（なければ startAt 降順）
  const endedEvents = candidate.events
    .filter((e) => e.status === "ENDED")
    .sort((a, b) => {
      const aTime = a.endAt?.getTime() ?? a.startAt?.getTime() ?? 0;
      const bTime = b.endAt?.getTime() ?? b.startAt?.getTime() ?? 0;
      return bTime - aTime;
    });

  // 地図用のマーカー（通常のイベントピン）
  // 吹き出しに候補者名、場所名、時間を表示
  const mapMarkers = candidate.events
    .filter((e) => e.status !== "ENDED")
    .map((event) => {
      let timeText = "時間未定";
      if (event.startAt) {
        const day = formatJSTDay(event.startAt);
        const time = formatJSTTime(event.startAt);
        timeText = `${day} ${time}`;
      }
      const popupContent = `
        <div style="color: black;">
          <div style="font-weight: bold; margin-bottom: 4px;">${candidate.name}</div>
          <div style="font-size: 12px; margin-bottom: 2px;">${timeText}</div>
          <div style="font-size: 12px;">${event.locationText}</div>
        </div>
      `;
      return {
        id: event.id,
        position: [event.lat, event.lng] as [number, number],
        popup: popupContent,
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

  // 場所変更報告があるか（予定・実施中のいずれかに active な MoveHint がある）
  const hasAnyMoveHints =
    candidate.events
      .filter((e) => e.status === "PLANNED" || e.status === "LIVE")
      .some((e) => (e.moveHints?.length ?? 0) > 0) ?? false;

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
          ← 一覧に戻る
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
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">{candidate.name}</h1>
            {candidate.xAccountUrl && (
              <a
                href={candidate.xAccountUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                候補者X
              </a>
            )}
          </div>
          {(() => {
            // 党首の場合は常に「党首」と表示
            if (candidate.type === "PARTY_LEADER") {
              return <p className="text-muted-foreground">党首</p>;
            }
            // その他の場合は設定に従って表示
            if (showCandidateInfo) {
              if (candidate.type === "SINGLE" && candidate.region) {
                return <p className="text-muted-foreground">{candidate.region}</p>;
              }
              if (candidate.type === "PROPORTIONAL" && candidate.region) {
                return <p className="text-muted-foreground">{candidate.region}</p>;
              }
              if (candidate.type === "SUPPORT") {
                return <p className="text-muted-foreground">応援弁士</p>;
              }
            }
            return null;
          })()}
        </div>

        {/* 地図エリア（上部に配置） */}
        {showEvents && allMarkers.length > 0 && (
          <section id="event-map" className="mb-8 scroll-mt-4">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">地図</h2>
            <Card>
              <CardContent className="p-2 sm:p-4">
                <CandidateMap center={mapCenter} markers={allMarkers} />
              </CardContent>
            </Card>
          </section>
        )}

        {/* 地図と予定の間の注意書き（白背景・黒字・左線で目を引く） */}
        {showEvents && (allMarkers.length > 0 || candidate.events.length > 0) && (
          <section className="mb-6">
            <div className="bg-white border border-border rounded-lg px-4 py-3 shadow-sm border-l-4 border-l-amber-500">
              <p className="text-sm font-medium text-foreground">
                予定は変更になる場合があります。最新の情報は候補者のXをご確認ください。
              </p>
            </div>
          </section>
        )}

        {/* 場所変更報告がある場合の注意喚起 */}
        {showEvents && hasAnyMoveHints && (() => {
          const moveHintList = candidate.events
            .filter((e) => e.status === "PLANNED" || e.status === "LIVE")
            .flatMap((e) => (e.moveHints ?? []).map((h) => ({ lat: h.lat, lng: h.lng, count: h.count })));
          return (
            <section className="mb-6">
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <p className="text-sm text-amber-900 mb-3">
                    場所変更報告で演説場所が変更になった可能性があります。最新の情報は候補者のXをご確認ください。
                  </p>
                  <p className="text-sm font-medium text-amber-900 mb-2">移動した可能性のある場所：</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-900">
                    {moveHintList.map((hint, i) => (
                      <li key={`${hint.lat}-${hint.lng}-${i}`}>
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
          );
        })()}

        {/* 実施中の演説予定 */}
        {showEvents && liveEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-red-600">🔴 実施中</h2>
            <div className="space-y-4">
              {liveEvents.map((event) => (
                <Card key={event.id} className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="break-words">{event.locationText}</span>
                          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 whitespace-nowrap">
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
                            eventStartAt={event.startAt}
                            eventEndAt={event.endAt}
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <p className="text-sm text-muted-foreground">
                        登録時刻: {formatJST(event.submittedAt)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        最終更新: {formatJST(event.updatedAt)}
                      </p>
                      <ShareButtons
                        eventUrl={`/c/${candidate.slug}/events/${event.id}`}
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
        {showEvents && plannedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">📅 予定</h2>
            <div className="space-y-4">
              {plannedEvents.map((event) => (
                <Card key={event.id} id={`event-${event.id}`}>
                  <CardHeader>
                    <CardTitle>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="break-words">{event.locationText}</span>
                          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 whitespace-nowrap">
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
                            eventStartAt={event.startAt}
                            eventEndAt={event.endAt}
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
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <p className="text-sm text-muted-foreground">
                        登録時刻: {formatJST(event.submittedAt)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        最終更新: {formatJST(event.updatedAt)}
                      </p>
                      <ShareButtons
                        eventUrl={`/c/${candidate.slug}/events/${event.id}`}
                        candidateName={candidate.name}
                        locationText={event.locationText}
                        isLive={false}
                        startAt={event.startAt ? formatJSTWithoutYear(event.startAt) : undefined}
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

        {/* リクエスト送信フォーム（終了した演説より上に表示） */}
        <RequestForm candidateId={candidate.id} candidateName={candidate.name} />

        {/* 終了した演説予定 */}
        {showEvents && endedEvents.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-muted-foreground">終了</h2>
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
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      最終更新: {formatJST(event.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {showEvents && candidate.events.length === 0 && (
          <p className="text-muted-foreground text-center py-12">
            演説予定はまだ登録されていません。
          </p>
        )}
        
        {!showEvents && (
          <p className="text-muted-foreground text-center py-12">
            演説予定の表示は現在非表示になっています。
          </p>
        )}
      </main>
    </>
  );
}
