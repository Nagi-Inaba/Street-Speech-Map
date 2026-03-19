import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "home";
  const slug = searchParams.get("slug");

  let title = "チームみらい 街頭演説マップ";
  let subtitle = "候補者の街頭演説予定を地図で確認";

  if (type === "candidate" && slug) {
    const candidate = await prisma.candidate.findUnique({
      where: { slug },
      select: { name: true, region: true },
    });

    if (candidate) {
      title = candidate.name;
      subtitle = candidate.region
        ? `${candidate.region} — チームみらい 街頭演説マップ`
        : "チームみらい 街頭演説マップ";
    }
  } else if (type === "area") {
    title = "エリア別 街頭演説マップ";
    subtitle = "お近くの街頭演説をチェック";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "60px",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700, textAlign: "center", marginBottom: 20 }}>
          {title}
        </div>
        <div style={{ fontSize: 32, opacity: 0.85, textAlign: "center" }}>
          {subtitle}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400",
      },
    }
  );
}
