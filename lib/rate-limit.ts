import { NextRequest, NextResponse } from "next/server";

// メモリベースのレート制限ストア（本番環境ではRedisなどを推奨）
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * レート制限をチェック
 * @param identifier 識別子（APIキーIDなど）
 * @param limit 1分あたりのリクエスト数
 * @returns レート制限を超えている場合はtrue
 */
export function checkRateLimit(identifier: string, limit: number): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分
  const key = identifier;

  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    // 新しいウィンドウを開始
    const resetAt = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * 古いエントリをクリーンアップ（定期的に実行）
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// 5分ごとにクリーンアップを実行
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

/**
 * レート制限ミドルウェア
 */
export function withRateLimit(
  request: NextRequest,
  apiKey: { id: string; rateLimit: number },
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const rateLimit = checkRateLimit(apiKey.id, apiKey.rateLimit);

  if (!rateLimit.allowed) {
    const resetSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: "Too Many Requests",
        message: `レート制限に達しました。${resetSeconds}秒後に再試行してください。`,
        retryAfter: resetSeconds,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": apiKey.rateLimit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(rateLimit.resetAt).toISOString(),
          "Retry-After": resetSeconds.toString(),
        },
      }
    );
  }

  const response = await handler(request);

  // レート制限情報をヘッダーに追加
  response.headers.set("X-RateLimit-Limit", apiKey.rateLimit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());

  return response;
}
