import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const updateEventSchema = z.object({
  candidateId: z.string(),
  additionalCandidateIds: z.array(z.string()).optional().default([]),
  status: z.enum(["PLANNED", "LIVE", "ENDED"]),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  timeUnknown: z.boolean().default(false),
  locationText: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  notes: z.string().nullable().optional(),
});

// 演説予定取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const event = await prisma.speechEvent.findUnique({
      where: { id },
      include: {
        candidate: true,
        additionalCandidates: {
          include: {
            candidate: true,
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 演説予定更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateEventSchema.parse(body);

    // 既存の演説予定を取得（変更履歴用とキャッシュ無効化用）
    const existingEvent = await prisma.speechEvent.findUnique({
      where: { id },
      include: {
        candidate: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // 変更履歴を記録
    await prisma.eventHistory.create({
      data: {
        eventId: id,
        fromLat: existingEvent.lat,
        fromLng: existingEvent.lng,
        fromText: existingEvent.locationText,
        fromStartAt: existingEvent.startAt,
        fromEndAt: existingEvent.endAt,
        toLat: data.lat,
        toLng: data.lng,
        toText: data.locationText,
        toStartAt: data.startAt ? new Date(data.startAt) : null,
        toEndAt: data.endAt ? new Date(data.endAt) : null,
        reason: "管理画面から編集",
        changedByUserId: session.user.id,
      },
    });

    // メイン候補者と合同演説者が重複していないかチェック
    const allCandidateIds = [data.candidateId, ...(data.additionalCandidateIds || [])];
    const uniqueCandidateIds = [...new Set(allCandidateIds)];
    if (uniqueCandidateIds.length !== allCandidateIds.length) {
      return NextResponse.json(
        { error: "メイン候補者と合同演説者が重複しています" },
        { status: 400 }
      );
    }

    // 既存の合同演説者を削除
    await prisma.eventCandidate.deleteMany({
      where: { eventId: id },
    });

    // 演説予定を更新
    const event = await prisma.speechEvent.update({
      where: { id },
      data: {
        candidateId: data.candidateId,
        status: data.status,
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        timeUnknown: data.timeUnknown,
        locationText: data.locationText,
        lat: data.lat,
        lng: data.lng,
        notes: data.notes || null,
        additionalCandidates: {
          create: (data.additionalCandidateIds || [])
            .filter((id) => id && id !== data.candidateId)
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

    // OGP画像とページのキャッシュを無効化
    const candidateSlug = event.candidate.slug;
    revalidatePath(`/c/${candidateSlug}`);
    revalidatePath(`/c/${candidateSlug}/opengraph-image`);
    revalidatePath(`/c/${candidateSlug}/events/${id}`);
    revalidatePath(`/c/${candidateSlug}/events/${id}/opengraph-image`);
    
    // 候補者が変更された場合、旧候補者のページも無効化
    if (existingEvent.candidateId !== data.candidateId) {
      const oldCandidate = await prisma.candidate.findUnique({
        where: { id: existingEvent.candidateId },
      });
      if (oldCandidate) {
        revalidatePath(`/c/${oldCandidate.slug}`);
        revalidatePath(`/c/${oldCandidate.slug}/opengraph-image`);
      }
    }

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ステータスのみ更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = z.object({
      status: z.enum(["PLANNED", "LIVE", "ENDED"]),
    }).parse(body);

    // 既存の演説予定を取得（キャッシュ無効化用）
    const existingEvent = await prisma.speechEvent.findUnique({
      where: { id },
      include: {
        candidate: true,
      },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // ステータス変更履歴を記録
    await prisma.eventHistory.create({
      data: {
        eventId: id,
        fromLat: existingEvent.lat,
        fromLng: existingEvent.lng,
        fromText: existingEvent.locationText,
        fromStartAt: existingEvent.startAt,
        fromEndAt: existingEvent.endAt,
        toLat: existingEvent.lat,
        toLng: existingEvent.lng,
        toText: existingEvent.locationText,
        toStartAt: existingEvent.startAt,
        toEndAt: existingEvent.endAt,
        reason: `ステータス変更: ${existingEvent.status} → ${status}`,
        changedByUserId: session.user.id,
      },
    });

    // ステータスのみ更新
    const event = await prisma.speechEvent.update({
      where: { id },
      data: { status },
      include: {
        candidate: true,
      },
    });

    // OGP画像とページのキャッシュを無効化
    const candidateSlug = event.candidate.slug;
    revalidatePath(`/c/${candidateSlug}`);
    revalidatePath(`/c/${candidateSlug}/opengraph-image`);
    revalidatePath(`/c/${candidateSlug}/events/${id}`);
    revalidatePath(`/c/${candidateSlug}/events/${id}/opengraph-image`);

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating event status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 演説予定削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteAdmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // 削除前に候補者情報を取得（キャッシュ無効化用）
    const event = await prisma.speechEvent.findUnique({
      where: { id },
      include: {
        candidate: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.speechEvent.delete({
      where: { id },
    });

    // OGP画像とページのキャッシュを無効化
    const candidateSlug = event.candidate.slug;
    revalidatePath(`/c/${candidateSlug}`);
    revalidatePath(`/c/${candidateSlug}/opengraph-image`);
    revalidatePath(`/c/${candidateSlug}/events/${id}`);
    revalidatePath(`/c/${candidateSlug}/events/${id}/opengraph-image`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
