import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const eventSchema = z.object({
  candidateId: z.string(),
  additionalCandidateIds: z.array(z.string()).optional().default([]),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  timeUnknown: z.boolean().default(false),
  locationText: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const events = await prisma.speechEvent.findMany({
    include: {
      candidate: true,
      additionalCandidates: {
        include: {
          candidate: true,
        },
      },
    },
    orderBy: [
      { startAt: "asc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    console.log("Received event data:", JSON.stringify(body, null, 2));
    const data = eventSchema.parse(body);
    console.log("Parsed event data:", JSON.stringify(data, null, 2));

    // 空文字列を除外してから処理
    const validAdditionalCandidateIds = (data.additionalCandidateIds || []).filter(
      (id) => id && id.trim() !== ""
    );

    // メイン候補者と合同演説者が重複していないかチェック
    const allCandidateIds = [data.candidateId, ...validAdditionalCandidateIds];
    const uniqueCandidateIds = [...new Set(allCandidateIds)];
    if (uniqueCandidateIds.length !== allCandidateIds.length) {
      return NextResponse.json(
        { error: "メイン候補者と合同演説者が重複しています" },
        { status: 400 }
      );
    }

    // 候補者の存在確認
    const candidate = await prisma.candidate.findUnique({
      where: { id: data.candidateId },
    });
    if (!candidate) {
      return NextResponse.json(
        { error: `候補者ID ${data.candidateId} が見つかりません` },
        { status: 400 }
      );
    }

    // 合同演説者の存在確認
    if (validAdditionalCandidateIds.length > 0) {
      const additionalCandidates = await prisma.candidate.findMany({
        where: { id: { in: validAdditionalCandidateIds } },
      });
      if (additionalCandidates.length !== validAdditionalCandidateIds.length) {
        const foundIds = new Set(additionalCandidates.map((c) => c.id));
        const missingIds = validAdditionalCandidateIds.filter((id) => !foundIds.has(id));
        return NextResponse.json(
          { error: `合同演説者のIDが見つかりません: ${missingIds.join(", ")}` },
          { status: 400 }
        );
      }
    }

    console.log("Creating event with data:", {
      candidateId: data.candidateId,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      timeUnknown: data.timeUnknown,
      locationText: data.locationText,
      lat: data.lat,
      lng: data.lng,
      notes: data.notes || null,
      additionalCandidatesCount: validAdditionalCandidateIds.filter((id) => id !== data.candidateId).length,
    });

    const event = await prisma.speechEvent.create({
      data: {
        candidateId: data.candidateId,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        timeUnknown: data.timeUnknown,
        locationText: data.locationText,
        lat: data.lat,
        lng: data.lng,
        notes: data.notes || null,
        status: "PLANNED",
        additionalCandidates: {
          create: validAdditionalCandidateIds
            .filter((id) => id !== data.candidateId)
            .map((candidateId) => ({
              candidateId,
            })),
        },
      },
      include: {
        candidate: true,
        additionalCandidates: {
          include: {
            candidate: true,
          },
        },
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    
    // Prismaエラーの場合、詳細なメッセージを返す
    if (error && typeof error === "object" && "code" in error) {
      const prismaError = error as { code?: string; message?: string };
      if (prismaError.code === "P2002") {
        return NextResponse.json(
          { error: "重複したデータが存在します" },
          { status: 400 }
        );
      }
      if (prismaError.code === "P2003") {
        return NextResponse.json(
          { error: "参照先の候補者が存在しません" },
          { status: 400 }
        );
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal Server Error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
