import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/upstash";

/**
 * レート制限をチェック（Upstash Redis ベース）
 * @param identifier 識別子（APIキーID、IP+hash など）
 * @param limit 1分あたりのリクエスト数
 */
export async function checkRateLimit(identifier: string, limit: number): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const redis = getRedis();

  if (!redis) {
    console.warn("[rate-limit] Upstash not configured — allowing all requests (dev mode)");
    return { allowed: true, remaining: limit, resetAt: Date.now() + 60_000 };
  }

  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, "1 m"),
    prefix: "ratelimit",
  });

  const result = await ratelimit.limit(identifier);

  return {
    allowed: result.success,
    remaining: result.remaining,
    resetAt: result.reset,
  };
}

/**
 * レート制限ミドルウェア
 */
export async function withRateLimit(
  request: NextRequest,
  apiKey: { id: string; rateLimit: number },
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const rateLimit = await checkRateLimit(apiKey.id, apiKey.rateLimit);

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

  response.headers.set("X-RateLimit-Limit", apiKey.rateLimit.toString());
  response.headers.set("X-RateLimit-Remaining", rateLimit.remaining.toString());
  response.headers.set("X-RateLimit-Reset", new Date(rateLimit.resetAt).toISOString());

  return response;
}
