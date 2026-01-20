import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";
import crypto from "crypto";

const reportSchema = z.object({
  eventId: z.string(),
  kind: z.enum(["start", "end", "move"]),
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
