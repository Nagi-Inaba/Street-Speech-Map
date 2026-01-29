import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { generateFallbackHomeOgImage } from "@/lib/og-image-generator";
import { getOgBlobUrl } from "@/lib/og-blob";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // Blobに存在する場合はそちらを優先（デプロイ後の順次生成/更新用）
    const blobUrl = await getOgBlobUrl("og-images/home.png");
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 302 });
    }

    // 事前生成された画像ファイルを読み込む
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

    // 画像が存在しない場合はフォールバック画像を生成
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
