import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDedupeKey, getTimeSlot } from "@/lib/dedupe";
import { z } from "zod";
import crypto from "crypto";

const requestSchema = z.object({
  type: z.enum([
    "CREATE_EVENT",
    "UPDATE_EVENT",
    // REPORT_START/REPORT_ENDは/api/public/reportsを使用（自動処理のため）
    "REPORT_MOVE",
    "REPORT_TIME_CHANGE",
    "CREATE_RIVAL_EVENT",
    "UPDATE_RIVAL_EVENT",
  ]),
  candidateId: z.string().optional(),
  eventId: z.string().optional(),
  rivalEventId: z.string().optional(),
  payload: z.record(z.any()),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

/**
 * レポーターのハッシュを生成（個人特定を避ける）
 */
function generateReporterHash(request: NextRequest): string {
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";
  const salt = process.env.REPORTER_HASH_SALT || "default-salt-change-in-production";
  
  const hash = crypto
    .createHash("sha256")
    .update(`${salt}:${ip}:${ua}`)
    .digest("hex");
  
  return hash.substring(0, 32); // 32文字に制限
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = requestSchema.parse(body);

    // レート制限（簡易実装）
    const reporterHash = generateReporterHash(request);
    const recentCount = await prisma.publicRequest.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000), // 1分以内
        },
      },
    });

    if (recentCount > 10) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    // CREATE_EVENTの場合、latとlngをpayloadにも含める（過去のリクエストとの互換性のため）
    let finalPayload = { ...data.payload };
    if (data.type === "CREATE_EVENT" && data.lat !== undefined && data.lng !== undefined) {
      // payloadにlatとlngがない場合、またはnull/undefinedの場合、トップレベルの値を追加
      if (finalPayload.lat === undefined || finalPayload.lat === null) {
        finalPayload.lat = data.lat;
      }
      if (finalPayload.lng === undefined || finalPayload.lng === null) {
        finalPayload.lng = data.lng;
      }
    }

    // 重複判定キーの生成
    let dedupeKey: string | null = null;
    if (data.type === "CREATE_EVENT" && data.candidateId && data.lat && data.lng) {
      const date = finalPayload.startAt
        ? new Date(finalPayload.startAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const hour = finalPayload.startAt
        ? new Date(finalPayload.startAt).getHours()
        : null;
      const timeSlot = getTimeSlot(hour);

      dedupeKey = generateDedupeKey({
        candidateId: data.candidateId,
        date,
        timeSlot,
        lat: data.lat,
        lng: data.lng,
      });
    }

    const publicRequest = await prisma.publicRequest.create({
      data: {
        type: data.type,
        candidateId: data.candidateId || null,
        eventId: data.eventId || null,
        rivalEventId: data.rivalEventId || null,
        payload: JSON.stringify(finalPayload),
        dedupeKey,
        status: "PENDING",
      },
    });

    return NextResponse.json(publicRequest);
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
