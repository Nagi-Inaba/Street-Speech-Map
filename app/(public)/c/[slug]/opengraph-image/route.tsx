import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formatJSTWithoutYear } from "@/lib/time";
import { generateMapScreenshot } from "@/lib/map-screenshot";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const candidate = await prisma.candidate.findUnique({
      where: { slug },
      include: {
        events: {
          where: {
            status: {
              in: ["PLANNED", "LIVE"],
            },
          },
          orderBy: [
            { status: "asc" },
            { startAt: "asc" },
          ],
          take: 1,
        },
      },
    });

    if (!candidate) {
      const errorResponse = new ImageResponse(
        (
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#f3f4f6",
              fontSize: "48px",
              color: "#6b7280",
            }}
          >
            候補者が見つかりません
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      );
      errorResponse.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      errorResponse.headers.set("Content-Type", "image/png");
      return errorResponse;
    }

    const firstEvent = candidate.events[0];
    const isLive = firstEvent?.status === "LIVE";

    let dateTimeText = "時間未定";
    if (firstEvent?.startAt) {
      dateTimeText = formatJSTWithoutYear(firstEvent.startAt);
    }

    const statusText = isLive ? "実施中" : "予定";

    // 候補者のすべてのイベント位置を取得
    const eventPositions: Array<[number, number]> = candidate.events
      .filter((e) => e.status !== "ENDED")
      .map((e) => [e.lat, e.lng] as [number, number]);

    // 地図の中心位置を計算
    let mapCenter: [number, number] = [35.6812, 139.7671]; // デフォルト: 東京駅
    let zoom = 13;
    if (eventPositions.length > 0) {
      const centerLat = eventPositions.reduce((sum, [lat]) => sum + lat, 0) / eventPositions.length;
      const centerLng = eventPositions.reduce((sum, [, lng]) => sum + lng, 0) / eventPositions.length;
      mapCenter = [centerLat, centerLng];
      
      // ピン間の距離を計算して適切なズームレベルを決定
      const distances = eventPositions.map(([lat, lng]) => {
        const dLat = lat - centerLat;
        const dLng = lng - centerLng;
        return Math.sqrt(dLat * dLat + dLng * dLng);
      });
      const maxDistance = Math.max(...distances);
      
      if (maxDistance > 0.1) {
        zoom = 10;
      } else if (maxDistance > 0.05) {
        zoom = 11;
      } else if (maxDistance > 0.02) {
        zoom = 12;
      } else if (maxDistance > 0.01) {
        zoom = 13;
      } else {
        zoom = 14;
      }
    }

    // マーカーを準備
    const markers = eventPositions.map((pos) => ({
      position: pos,
      color: "blue" as const,
    }));

    // 地図スクリーンショットを生成（複数のピンが入る範囲）
    const mapImageDataUrl = await generateMapScreenshot(
      mapCenter,
      zoom,
      1000,
      630,
      markers
    );

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(to right, #64D8C6 0%, #64D8C6 50%, #bcecd3 100%)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "60px 80px",
            position: "relative",
          }}
        >
          {/* 地図画像を背景として使用 */}
          <div
            style={{
              position: "absolute",
              top: "60px",
              left: "80px",
              right: "80px",
              bottom: "60px",
              backgroundColor: "white",
              border: "4px solid #000000",
              borderRadius: "8px",
              overflow: "hidden",
              display: "flex",
            }}
          >
            <img
              src={mapImageDataUrl}
              alt="地図"
              width={1000}
              height={630}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </div>

          {/* 吹き出し風のテキストボックス（地図の上に重ねる） */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "white",
              padding: "40px 60px",
              borderRadius: "16px",
              border: "3px solid #000000",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
              maxWidth: "800px",
              zIndex: 10,
            }}
          >
            {/* ステータスバッジ */}
            {firstEvent && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "12px 32px",
                  borderRadius: "999px",
                  fontSize: "32px",
                  fontWeight: "bold",
                  marginBottom: "40px",
                  letterSpacing: "0.08em",
                  border: isLive ? "3px solid #16a34a" : "3px solid #f97316",
                  backgroundColor: isLive ? "#dcfce7" : "#fff7ed",
                  color: isLive ? "#166534" : "#9a3412",
                }}
              >
                {statusText}
              </div>
            )}

            {/* 候補者名（吹き出しに表示） */}
            <div
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: "#000000",
                marginBottom: firstEvent ? "32px" : "0",
                textAlign: "center",
              }}
            >
              {candidate.name}
            </div>

            {/* 場所名と時間（最初のイベントがある場合） */}
            {firstEvent && (
              <>
                <div
                  style={{
                    fontSize: "36px",
                    color: "#000000",
                    marginTop: "32px",
                    marginBottom: "24px",
                    textAlign: "center",
                    fontWeight: "600",
                  }}
                >
                  {firstEvent.locationText}
                </div>

                <div
                  style={{
                    fontSize: "28px",
                    color: "#000000",
                    textAlign: "center",
                  }}
                >
                  {dateTimeText}
                </div>
              </>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

  // キャッシュヘッダーを追加
  imageResponse.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    imageResponse.headers.set("Content-Type", "image/png");

    return imageResponse;
  } catch (error) {
    console.error("Error generating OG image:", error);
    const errorResponse = new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f4f6",
            fontSize: "48px",
            color: "#6b7280",
          }}
        >
          画像の生成に失敗しました
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
    errorResponse.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    errorResponse.headers.set("Content-Type", "image/png");
    return errorResponse;
  }
}

