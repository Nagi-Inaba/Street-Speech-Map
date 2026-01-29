import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import { generateFallbackEventOgImage } from "@/lib/og-image-generator";
import { getOgBlobUrl } from "@/lib/og-blob";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; eventId: string }> }
) {
  try {
    const { eventId } = await params;

    const blobUrl = await getOgBlobUrl(`og-images/event-${eventId}.png`);
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 302 });
    }

    // 事前生成された画像ファイルを読み込む
    const imagePath = join(process.cwd(), "public", "og-images", `event-${eventId}.png`);

    if (existsSync(imagePath)) {
      const imageBuffer = await readFile(imagePath);
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }

    // 画像が存在しない場合はフォールバック画像を生成
    const event = await prisma.speechEvent.findUnique({
      where: { id: eventId },
      include: {
        candidate: true,
      },
    });

    if (!event) {
      return new NextResponse("イベントが見つかりません", { status: 404 });
    }

    const fallbackImage = generateFallbackEventOgImage(event);
    const imageBuffer = await fallbackImage.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error serving OG image:", error);
    return new NextResponse("画像の読み込みに失敗しました", { status: 500 });
  }
}
