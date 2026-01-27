import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formatJSTWithoutYear } from "@/lib/time";

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
          }}
        >
          {/* 白背景の中央部分（横は完全に白背景） */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "white",
              width: "100%",
              height: "100%",
              padding: "60px 80px",
              border: "2px solid #000000",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#000000",
                color: "#ffffff",
                padding: "12px 32px",
                borderRadius: "8px",
                fontSize: "32px",
                fontWeight: "bold",
                marginBottom: "60px",
              }}
            >
              {statusText}
            </div>

            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#000000",
                marginBottom: "60px",
                textAlign: "center",
              }}
            >
              {event.candidate.name}
            </div>

            <div
              style={{
                fontSize: "48px",
                color: "#000000",
                marginBottom: "60px",
                textAlign: "center",
              }}
            >
              {event.locationText}
            </div>

            <div
              style={{
                fontSize: "40px",
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
