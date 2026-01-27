import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";

/**
 * APIキーをハッシュ化
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

/**
 * APIキーを検証
 */
export async function verifyApiKey(apiKey: string | null): Promise<{
  valid: boolean;
  apiKeyRecord?: { id: string; name: string; rateLimit: number };
}> {
  if (!apiKey) {
    return { valid: false };
  }

  const keyHash = hashApiKey(apiKey);
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKeyRecord || !apiKeyRecord.isActive) {
    return { valid: false };
  }

  // 最終使用時刻を更新
  await prisma.apiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    apiKeyRecord: {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      rateLimit: apiKeyRecord.rateLimit,
    },
  };
}

/**
 * リクエストからAPIキーを取得
 */
export function getApiKeyFromRequest(request: NextRequest): string | null {
  // 1. Authorization ヘッダーから取得 (Bearer token形式)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 2. X-API-Key ヘッダーから取得
  const apiKeyHeader = request.headers.get("x-api-key");
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // 3. クエリパラメータから取得（非推奨だが互換性のため）
  const { searchParams } = new URL(request.url);
  const apiKeyParam = searchParams.get("api_key");
  if (apiKeyParam) {
    return apiKeyParam;
  }

  return null;
}

/**
 * API認証ミドルウェア
 */
export async function withApiAuth(
  request: NextRequest,
  handler: (request: NextRequest, apiKey: { id: string; name: string; rateLimit: number }) => Promise<NextResponse>
): Promise<NextResponse> {
  const apiKey = getApiKeyFromRequest(request);
  const verification = await verifyApiKey(apiKey);

  if (!verification.valid || !verification.apiKeyRecord) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "有効なAPIキーが必要です。Authorization ヘッダーまたは X-API-Key ヘッダーにAPIキーを設定してください。",
      },
      { status: 401 }
    );
  }

  return handler(request, verification.apiKeyRecord);
}
