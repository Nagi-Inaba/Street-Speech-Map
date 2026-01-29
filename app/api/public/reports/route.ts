import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";
import { generateMoveHints } from "@/lib/move-hint";

const reportSchema = z.object({
  eventId: z.string(),
  kind: z.enum(["start", "end", "move", "check"]),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/**
 * レポーターのハッシュを生成
 */
function generateReporterHash(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const salt = process.env.REPORTER_HASH_SALT || "default-salt-change-in-production";
  
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}:${ip}:${ua}`)
    .digest("hex");
  
  return hash.substring(0, 32);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = reportSchema.parse(body);

    const reporterHash = generateReporterHash(request);

    // 既存の報告をチェック（ユニーク制約）
    const existing = await prisma.publicReport.findUnique({
      where: {
        eventId_kind_reporterHash: {
          eventId: data.eventId,
          kind: data.kind,
          reporterHash,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Already reported" },
        { status: 409 }
      );
    }

    const report = await prisma.publicReport.create({
      data: {
        eventId: data.eventId,
        kind: data.kind,
        lat: data.lat || null,
        lng: data.lng || null,
        reporterHash,
      },
    });

    // 2件の報告があったら自動的にステータスを変更
    if (data.kind === "start" || data.kind === "end") {
      const reportCount = await prisma.publicReport.count({
        where: {
          eventId: data.eventId,
          kind: data.kind,
        },
      });

      if (reportCount >= 2) {
        // イベントの現在のステータスを取得
        const event = await prisma.speechEvent.findUnique({
          where: { id: data.eventId },
        });

        if (event) {
          let newStatus: string | null = null;
          
          if (data.kind === "start" && event.status === "PLANNED") {
            newStatus = "LIVE";
          } else if (data.kind === "end" && (event.status === "PLANNED" || event.status === "LIVE")) {
            newStatus = "ENDED";
          }

          if (newStatus) {
            // ステータス変更履歴を記録
            await prisma.eventHistory.create({
              data: {
                eventId: data.eventId,
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
                reason: `自動ステータス変更: ${reportCount}件の${data.kind === "start" ? "開始" : "終了"}報告により`,
              },
            });

            // ステータスを更新
            await prisma.speechEvent.update({
              where: { id: data.eventId },
              data: { status: newStatus },
            });
          }
        }
      }
    }

    // 場所変更報告の場合、MoveHintを生成
    if (data.kind === "move" && data.lat && data.lng) {
      await generateMoveHints(data.eventId);
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
