import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Vercel Cronからのリクエストかどうかを確認
function isAuthorized(request: NextRequest): boolean {
  // Vercel Cronは特定のヘッダーを送信する
  // 本番環境ではVercel Cronからのみアクセス可能にする
  // 開発環境では手動実行を許可するため、環境変数でチェック
  if (process.env.NODE_ENV === "development") {
    // 開発環境では認証キーをチェック（オプション）
    const authHeader = request.headers.get("authorization");
    return authHeader === `Bearer ${process.env.CRON_SECRET || "dev-secret"}`;
  }

  // 本番環境ではVercel Cronからのリクエストのみ許可
  // Vercel Cronは特定のヘッダーを送信するが、セキュリティのため
  // 環境変数でCRON_SECRETを設定して認証することを推奨
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // CRON_SECRETが設定されていない場合は警告を出して実行を許可
  // 本番環境では必ずCRON_SECRETを設定すること
  console.warn("[Cron] CRON_SECRET is not set. This is insecure in production.");
  return true;
}

// 自動承認バッチ処理
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // REPORT_STARTまたはREPORT_ENDタイプのPENDINGリクエストを取得
    const pendingRequests = await prisma.publicRequest.findMany({
      where: {
        type: {
          in: ["REPORT_START", "REPORT_END"],
        },
        status: "PENDING",
        eventId: { not: null },
      },
      include: {
        candidate: true,
      },
    });

    let approvedCount = 0;
    let errorCount = 0;

    for (const req of pendingRequests) {
      if (!req.eventId) continue;

      try {
        // 該当イベントの報告件数を確認
        const reportKind = req.type === "REPORT_START" ? "start" : "end";
        const reportCount = await prisma.publicReport.count({
          where: {
            eventId: req.eventId,
            kind: reportKind,
          },
        });

        // 2件以上の場合、自動承認
        if (reportCount >= 2) {
          // イベントの現在のステータスを取得
          const event = await prisma.speechEvent.findUnique({
            where: { id: req.eventId },
          });

          if (!event) {
            console.error(`[Cron] Event not found: ${req.eventId}`);
            errorCount++;
            continue;
          }

          let newStatus: string | null = null;
          
          if (reportKind === "start" && event.status === "PLANNED") {
            newStatus = "LIVE";
          } else if (reportKind === "end" && (event.status === "PLANNED" || event.status === "LIVE")) {
            newStatus = "ENDED";
          }

          if (newStatus) {
            // ステータス変更履歴を記録
            await prisma.eventHistory.create({
              data: {
                eventId: req.eventId,
                fromLat: event.lat,
                fromLng: event.lng,
                fromText: event.locationText,
                fromStartAt: event.startAt,
                fromEndAt: event.endAt,
                toLat: event.lat,
                toLng: event.lng,
                toText: event.locationText,
                toStartAt: event.startAt,
                toEndAt: event.endAt,
                reason: `自動承認: ${reportCount}件の${reportKind === "start" ? "開始" : "終了"}報告により`,
              },
            });

            // ステータスを更新
            await prisma.speechEvent.update({
              where: { id: req.eventId },
              data: { status: newStatus },
            });
          }

          // リクエストを承認
          await prisma.publicRequest.update({
            where: { id: req.id },
            data: {
              status: "APPROVED",
              reviewedAt: new Date(),
            },
          });

          approvedCount++;
        }
      } catch (error) {
        console.error(`[Cron] Error processing request ${req.id}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingRequests.length,
      approved: approvedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("[Cron] Error in auto-approve:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

