import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { generateMapScreenshot } from "@/lib/map-screenshot";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // 地図スクリーンショットを生成（東京エリア全体）
    const mapImageDataUrl = await generateMapScreenshot(
      [35.6812, 139.7671], // 東京駅周辺
      10, // 東京エリア全体が入るズームレベル
      1000,
      630
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

          {/* タイトルテキスト（地図の上に重ねる） */}
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
            <div
              style={{
                fontSize: "56px",
                fontWeight: "bold",
                color: "#000000",
                textAlign: "center",
              }}
            >
              チームみらい
            </div>
            <div
              style={{
                fontSize: "48px",
                fontWeight: "bold",
                color: "#000000",
                marginTop: "20px",
                textAlign: "center",
              }}
            >
              街頭演説マップ
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );

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
