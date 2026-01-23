import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDedupeKey, getTimeSlot } from "@/lib/dedupe";
import { z } from "zod";
import crypto from "crypto";

const requestSchema = z.object({
  type: z.enum([
    "CREATE_EVENT",
    "UPDATE_EVENT",
    "REPORT_START",
    "REPORT_END",
    "REPORT_MOVE",
    "REPORT_TIME_CHANGE",
  ]),
  candidateId: z.string().optional(),
  eventId: z.string().optional(),
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

    // 重複判定キーの生成
    let dedupeKey: string | null = null;
    if (data.type === "CREATE_EVENT" && data.candidateId && data.lat && data.lng) {
      const date = data.payload.startAt
        ? new Date(data.payload.startAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const hour = data.payload.startAt
        ? new Date(data.payload.startAt).getHours()
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
        payload: JSON.stringify(data.payload),
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
