import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(request: NextRequest) {
  try {
    // 事前生成された画像ファイルを読み込む
    const imagePath = join(process.cwd(), "public", "og-images", "area.png");

    if (!existsSync(imagePath)) {
      // 画像が存在しない場合は404を返す
      return new NextResponse("OGP画像が見つかりません", { status: 404 });
    }

    const imageBuffer = await readFile(imagePath);

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error serving OG image:", error);
    return new NextResponse("画像の読み込みに失敗しました", { status: 500 });
  }
}
