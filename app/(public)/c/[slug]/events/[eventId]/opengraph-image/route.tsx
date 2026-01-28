import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formatJSTWithoutYear } from "@/lib/time";
import { generateMapScreenshot } from "@/lib/map-screenshot";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; eventId: string }> }
) {
  try {
    const { slug, eventId } = await params;

    const event = await prisma.speechEvent.findUnique({
      where: { id: eventId },
      include: {
        candidate: true,
      },
    });

    if (!event || event.candidate.slug !== slug) {
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
            イベントが見つかりません
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

    const isLive = event.status === "LIVE";

    let dateTimeText = "時間未定";
    if (event.startAt) {
      dateTimeText = formatJSTWithoutYear(event.startAt);
    }

    const statusText = isLive ? "実施中" : "予定";

    // 地図スクリーンショットを生成（ピン位置のクローズアップ）
    // エラー時は地図なしで続行
    let mapImageDataUrl: string | null = null;
    try {
      mapImageDataUrl = await Promise.race([
        generateMapScreenshot(
          [event.lat, event.lng],
          16, // クローズアップ用にズームレベル16
          1000,
          630,
          [{ position: [event.lat, event.lng], color: isLive ? "red" : "blue" }]
        ),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ]);
    } catch (error) {
      console.error("Failed to generate map screenshot:", error);
      // 地図なしで続行
    }

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
          {mapImageDataUrl && (
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
          )}

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

            {/* 候補者名 */}
            <div
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: "#000000",
                marginBottom: "32px",
                textAlign: "center",
              }}
            >
              {event.candidate.name}
            </div>

            {/* 場所名 */}
            <div
              style={{
                fontSize: "36px",
                color: "#000000",
                marginBottom: "24px",
                textAlign: "center",
                fontWeight: "600",
              }}
            >
              {event.locationText}
            </div>

            {/* 時間 */}
            <div
              style={{
                fontSize: "28px",
                color: "#000000",
                textAlign: "center",
              }}
            >
              {dateTimeText}
            </div>
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
