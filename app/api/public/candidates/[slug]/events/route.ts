import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiMiddleware, addCorsHeaders, handleCorsPreflight } from "@/lib/api-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // CORS preflight リクエストを処理
  const corsResponse = handleCorsPreflight(request);
  if (corsResponse) return corsResponse;

  return withApiMiddleware(request, async (req, apiKey) => {
    try {
      const { slug } = await params;

      const candidate = await prisma.candidate.findUnique({
        where: { slug },
        include: {
          events: {
            orderBy: [
              { startAt: "asc" },
              { createdAt: "desc" },
            ],
          },
        },
      });

      if (!candidate) {
        const response = NextResponse.json(
          { error: "Not Found", message: "指定された候補者が見つかりません。" },
          { status: 404 }
        );
        return addCorsHeaders(response, req);
      }

      const response = NextResponse.json(candidate.events);
      return addCorsHeaders(response, req);
    } catch (error) {
      console.error("Error fetching events:", error);
      const response = NextResponse.json(
        { error: "Internal Server Error", message: "イベント一覧の取得に失敗しました。" },
        { status: 500 }
      );
      return addCorsHeaders(response, req);
    }
  });
}
