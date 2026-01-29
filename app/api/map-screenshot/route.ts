import { NextRequest, NextResponse } from "next/server";
import { generateMapScreenshot } from "@/lib/map-screenshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * 地図スクリーンショット生成API
 * GET /api/map-screenshot?center=lat,lng&zoom=13&width=800&height=600&markers=lat1,lng1,color1|lat2,lng2,color2
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const centerParam = searchParams.get("center");
    const zoomParam = searchParams.get("zoom");
    const widthParam = searchParams.get("width");
    const heightParam = searchParams.get("height");
    const markersParam = searchParams.get("markers");

    if (!centerParam) {
      return NextResponse.json({ error: "center parameter is required" }, { status: 400 });
    }

    const [lat, lng] = centerParam.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid center coordinates" }, { status: 400 });
    }

    const zoom = zoomParam ? parseInt(zoomParam, 10) : 13;
    const width = widthParam ? parseInt(widthParam, 10) : 800;
    const height = heightParam ? parseInt(heightParam, 10) : 600;

    let markers: Array<{ position: [number, number]; color?: string }> | undefined;
    if (markersParam) {
      markers = markersParam.split("|").map((markerStr) => {
        const parts = markerStr.split(",");
        const markerLat = parseFloat(parts[0]);
        const markerLng = parseFloat(parts[1]);
        const color = parts[2] || "blue";
        return {
          position: [markerLat, markerLng] as [number, number],
          color,
        };
      });
    }

    const { dataUrl } = await generateMapScreenshot(
      [lat, lng],
      zoom,
      width,
      height,
      markers
    );

    // Base64データURLからBufferを抽出
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error generating map screenshot:", error);
    return NextResponse.json(
      { error: "Failed to generate map screenshot" },
      { status: 500 }
    );
  }
}
