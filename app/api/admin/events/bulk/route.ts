import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";
import { generateEventOgImage, generateCandidateOgImage } from "@/lib/og-image-generator";

const eventItemSchema = z.object({
  candidateId: z.string(),
  additionalCandidateIds: z.array(z.string()).optional().default([]),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  timeUnknown: z.boolean().default(false),
  locationText: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  notes: z.string().nullable().optional(),
  isPublic: z.boolean().optional().default(true),
});

const bulkSchema = z.object({
  events: z.array(eventItemSchema),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
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

    const created: { id: string; locationText: string }[] = [];
    const errors: { index: number; message: string }[] = [];

    for (let i = 0; i < data.events.length; i++) {
      const item = data.events[i];
      const validAdditionalCandidateIds = (item.additionalCandidateIds || []).filter(
        (id) => id && id.trim() !== "" && id !== item.candidateId
      );
      try {
        const event = await prisma.speechEvent.create({
          data: {
            candidateId: item.candidateId,
            startAt: item.startAt ? new Date(item.startAt) : null,
            endAt: item.endAt ? new Date(item.endAt) : null,
            timeUnknown: item.timeUnknown,
            locationText: item.locationText,
            lat: item.lat,
            lng: item.lng,
            notes: item.notes || null,
            status: "PLANNED",
            isPublic: item.isPublic ?? true,
            additionalCandidates: {
              create: validAdditionalCandidateIds.map((candidateId) => ({ candidateId })),
            },
          },
          include: {
            candidate: true,
          },
        });
        created.push({ id: event.id, locationText: event.locationText });
        try {
          await generateEventOgImage(event);
        } catch {
          // 続行
        }
      } catch (err) {
        errors.push({
          index: i + 1,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (created.length > 0) {
      const candidateWithEvents = await prisma.candidate.findUnique({
        where: { id: data.events[0].candidateId },
        include: {
          events: {
            where: { status: { in: ["PLANNED", "LIVE"] } },
            orderBy: [{ status: "asc" }, { startAt: "asc" }],
          },
        },
      });
      if (candidateWithEvents) {
        try {
          await generateCandidateOgImage(candidateWithEvents);
        } catch {
          // 続行
        }
      }
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
