import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { generateFallbackHomeOgImage } from "@/lib/og-image-generator";
import { getOgBlobUrl, hasBlobToken } from "@/lib/og-blob";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    const blobUrl = await getOgBlobUrl("og-images/home.png");
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 302 });
    }

    // Blob運用でない場合のみローカルファイルを参照（ローカル開発用）
    if (!hasBlobToken()) {
      const imagePath = join(process.cwd(), "public", "og-images", "home.png");
      if (existsSync(imagePath)) {
        const imageBuffer = await readFile(imagePath);
        return new NextResponse(imageBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        });
      }
    }

    // Blob/ローカルに無い場合はフォールバック画像を生成
    const fallbackImage = generateFallbackHomeOgImage();
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
