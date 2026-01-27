import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, getApiKeyFromRequest } from "@/lib/api-auth";
import { withRateLimit } from "@/lib/rate-limit";

/**
 * API認証とレート制限を適用するミドルウェア
 */
export function withApiMiddleware(
  request: NextRequest,
  handler: (request: NextRequest, apiKey: { id: string; name: string; rateLimit: number }) => Promise<NextResponse>
): Promise<NextResponse> {
  return withApiAuth(request, async (req, apiKey) => {
    return withRateLimit(req, apiKey, async (r) => {
      return handler(r, apiKey);
    });
  });
}

/**
 * CORSヘッダーを追加
 */
export function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");

  // 許可するオリジン（環境変数から取得、またはすべて許可）
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["*"];

  if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    response.headers.set("Access-Control-Max-Age", "86400");
  }

  return response;
}

/**
 * OPTIONSリクエスト（CORS preflight）を処理
 */
export function handleCorsPreflight(request: NextRequest): NextResponse | null {
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, request);
  }
  return null;
}
