import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formatJSTWithoutYear } from "@/lib/time";

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
            border: "8px solid #000000",
            padding: "60px",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "white",
                color: "#000000",
                padding: "12px 32px",
                borderRadius: "8px",
                fontSize: "32px",
                fontWeight: "bold",
                marginBottom: "40px",
              }}
            >
              {statusText}
            </div>

            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#000000",
                marginBottom: "40px",
                textAlign: "center",
              }}
            >
              {candidate.name}
            </div>

            {firstEvent && (
              <div
                style={{
                  fontSize: "48px",
                  color: "#000000",
                  marginBottom: "40px",
                  textAlign: "center",
                }}
              >
                {firstEvent.locationText}
              </div>
            )}

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

