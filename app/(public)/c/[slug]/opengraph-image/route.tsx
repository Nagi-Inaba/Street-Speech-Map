import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import { generateFallbackCandidateOgImage } from "@/lib/og-image-generator";
import { getOgBlobUrl, hasBlobToken } from "@/lib/og-blob";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const blobUrl = await getOgBlobUrl(`og-images/candidate-${slug}.png`);
    if (blobUrl) {
      return NextResponse.redirect(blobUrl, { status: 302 });
    }

    if (!hasBlobToken()) {
      const imagePath = join(process.cwd(), "public", "og-images", `candidate-${slug}.png`);
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

    // フォールバック画像を生成
    const candidate = await prisma.candidate.findUnique({
      where: { slug },
      include: {
        events: {
          where: {
            isPublic: true,
            status: {
              in: ["PLANNED", "LIVE"],
            },
          },
          orderBy: [
            { status: "asc" },
            { startAt: "asc" },
          ],
        },
      },
    });

    if (!candidate) {
      return new NextResponse("候補者が見つかりません", { status: 404 });
    }

    const fallbackImage = generateFallbackCandidateOgImage(candidate);
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
