import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withApiMiddleware, addCorsHeaders, handleCorsPreflight } from "@/lib/api-middleware";

export async function GET(request: NextRequest) {
  // CORS preflight リクエストを処理
  const corsResponse = handleCorsPreflight(request);
  if (corsResponse) return corsResponse;

  return withApiMiddleware(request, async (req, apiKey) => {
    try {
      const candidates = await prisma.candidate.findMany({
        orderBy: { name: "asc" },
      });

      const response = NextResponse.json(candidates);
      return addCorsHeaders(response, req);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      const response = NextResponse.json(
        { error: "Internal Server Error", message: "候補者一覧の取得に失敗しました。" },
        { status: 500 }
      );
      return addCorsHeaders(response, req);
    }
  });
}
