import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { formatJSTWithoutYear } from "@/lib/time";

export const runtime = "nodejs";
export const revalidate = 60; // 60秒間キャッシュ

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
            { status: "asc" }, // LIVEを先に
            { startAt: "asc" },
          ],
          take: 1, // 最初の1件のみ取得
        },
      },
    });

    if (!candidate) {
      // 候補者が見つからない場合、デフォルト画像を返す
      return new ImageResponse(
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
    }

    const firstEvent = candidate.events[0];
    const isLive = firstEvent?.status === "LIVE";

    // 日時のテキストを生成
    let dateTimeText = "時間未定";
    if (firstEvent?.startAt) {
      dateTimeText = formatJSTWithoutYear(firstEvent.startAt);
    }

    // カードの背景色（実施中は赤系、予定は青系）
    const bgColor = isLive ? "#fee2e2" : "#dbeafe";
    const borderColor = isLive ? "#ef4444" : "#3b82f6";
    const statusText = isLive ? "実施中" : "予定";
    const statusColor = isLive ? "#dc2626" : "#2563eb";

    return new ImageResponse(
        (
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: bgColor,
              border: `8px solid ${borderColor}`,
              padding: "60px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {/* ステータスバッジ */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: statusColor,
                color: "white",
                padding: "12px 32px",
                borderRadius: "8px",
                fontSize: "32px",
                fontWeight: "bold",
                marginBottom: "40px",
              }}
            >
              {statusText}
            </div>

            {/* 候補者名 */}
            <div
              style={{
                fontSize: "72px",
                fontWeight: "bold",
                color: "#1f2937",
                marginBottom: "40px",
                textAlign: "center",
              }}
            >
              {candidate.name}
            </div>

            {/* 演説場所 */}
            {firstEvent && (
              <div
                style={{
                  fontSize: "48px",
                  color: "#4b5563",
                  marginBottom: "40px",
                  textAlign: "center",
                }}
              >
                {firstEvent.locationText}
              </div>
            )}

            {/* 日時 */}
            <div
              style={{
                fontSize: "40px",
                color: "#6b7280",
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
  } catch (error) {
    console.error("Error generating OG image:", error);
    // エラー時もデフォルト画像を返す
    return new ImageResponse(
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
  }
}

