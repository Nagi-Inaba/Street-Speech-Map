import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, canManageCandidate } from "@/lib/rbac";
import { z } from "zod";
const DEFAULT_LAT = 35.6812;
const DEFAULT_LNG = 139.7671;

const eventItemSchema = z.object({
  candidateId: z.string(),
  additionalCandidateIds: z.array(z.string()).optional().default([]),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  timeUnknown: z.boolean().default(false),
  locationText: z.string().min(1),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  notes: z.string().nullable().optional(),
  isPublic: z.boolean().optional().default(false),
});

const bulkSchema = z.object({
  events: z.array(eventItemSchema),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "RegionEditor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = bulkSchema.parse(body);

    if (data.events.length === 0) {
      return NextResponse.json({ error: "イベントが1件以上必要です" }, { status: 400 });
    }

    const candidateIds = [...new Set(data.events.map((e) => e.candidateId))];
    const candidates = await prisma.candidate.findMany({
      where: { id: { in: candidateIds } },
    });
    const candidateIdSet = new Set(candidates.map((c) => c.id));
    const missingCandidateIds = candidateIds.filter((id) => !candidateIdSet.has(id));
    if (missingCandidateIds.length > 0) {
      return NextResponse.json(
        { error: `候補者IDが見つかりません: ${missingCandidateIds.join(", ")}` },
        { status: 400 }
      );
    }

    // RegionEditor は自分の地域の候補者のイベントのみ一括作成可能
    const unauthorizedCandidates = candidates.filter(
      (c) => !canManageCandidate(session.user, c.region)
    );
    if (unauthorizedCandidates.length > 0) {
      return NextResponse.json(
        { error: `以下の候補者のイベントを管理する権限がありません: ${unauthorizedCandidates.map((c) => c.name).join(", ")}` },
        { status: 403 }
      );
    }

    // additionalCandidateIds に対してもRBACチェック
    const allAdditionalIds = [
      ...new Set(
        data.events.flatMap((e) =>
          (e.additionalCandidateIds || []).filter(
            (id) => id && id.trim() !== "" && id !== e.candidateId
          )
        )
      ),
    ];
    if (allAdditionalIds.length > 0) {
      const additionalCandidates = await prisma.candidate.findMany({
        where: { id: { in: allAdditionalIds } },
        select: { id: true, region: true, name: true },
      });
      const unauthorizedAdditional = additionalCandidates.filter(
        (c) => !canManageCandidate(session.user, c.region)
      );
      if (unauthorizedAdditional.length > 0) {
        return NextResponse.json(
          { error: `以下の合同演説候補者のイベントを管理する権限がありません: ${unauthorizedAdditional.map((c) => c.name).join(", ")}` },
          { status: 403 }
        );
      }
    }

    const created: { id: string; locationText: string }[] = [];
    const errors: { index: number; message: string }[] = [];

    for (let i = 0; i < data.events.length; i++) {
      const item = data.events[i];
      const validAdditionalCandidateIds = (item.additionalCandidateIds || []).filter(
        (id) => id && id.trim() !== "" && id !== item.candidateId
      );
      try {
        const normalizedLat = typeof item.lat === "number" && Number.isFinite(item.lat) ? item.lat : DEFAULT_LAT;
        const normalizedLng = typeof item.lng === "number" && Number.isFinite(item.lng) ? item.lng : DEFAULT_LNG;
        const event = await prisma.speechEvent.create({
          data: {
            candidateId: item.candidateId,
            startAt: item.startAt ? new Date(item.startAt) : null,
            endAt: item.endAt ? new Date(item.endAt) : null,
            timeUnknown: item.timeUnknown,
            locationText: item.locationText,
            lat: normalizedLat,
            lng: normalizedLng,
            notes: item.notes || null,
            status: "PLANNED",
            isPublic: item.isPublic ?? false,
            additionalCandidates: {
              create: validAdditionalCandidateIds.map((candidateId) => ({ candidateId })),
            },
          },
          include: {
            candidate: true,
          },
        });
        created.push({ id: event.id, locationText: event.locationText });
      } catch (err) {
        errors.push({
          index: i + 1,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (created.length > 0) {
      revalidatePath("/admin/events");
      revalidatePath("/c/[slug]", "page");
    }

    return NextResponse.json({
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
      createdIds: created.map((c) => c.id),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "バリデーションエラー", details: error.errors }, { status: 400 });
    }
    console.error("Bulk create error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
