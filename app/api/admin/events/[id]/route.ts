import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, canManageCandidate } from "@/lib/rbac";
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
  isPublic: z.boolean().optional(),
});

// 演説予定取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "RegionEditor")) {
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

    // RegionEditor は自分の地域の候補者のイベントのみ閲覧可能
    if (!canManageCandidate(session.user, event.candidate.region)) {
      return NextResponse.json({ error: "このイベントを管理する権限がありません" }, { status: 403 });
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
  if (!session || !hasPermission(session.user, "RegionEditor")) {
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

    // RegionEditor は自分の地域の候補者のイベントのみ更新可能
    if (!canManageCandidate(session.user, existingEvent.candidate.region)) {
      return NextResponse.json({ error: "このイベントを管理する権限がありません" }, { status: 403 });
    }

    // バリデーション: メイン候補者と合同演説者が重複していないかチェック（DB更新前）
    const allCandidateIds = [data.candidateId, ...(data.additionalCandidateIds || [])];
    const uniqueCandidateIds = [...new Set(allCandidateIds)];
    if (uniqueCandidateIds.length !== allCandidateIds.length) {
      return NextResponse.json(
        { error: "メイン候補者と合同演説者が重複しています" },
        { status: 400 }
      );
    }

    // 新しいcandidateId・additionalCandidateIdsに対してもRBACチェック
    const targetCandidateIds = [
      data.candidateId,
      ...(data.additionalCandidateIds || []),
    ].filter((cid) => cid && cid.trim() !== "");
    const uniqueTargetIds = [...new Set(targetCandidateIds)];

    if (uniqueTargetIds.length > 0) {
      const targetCandidates = await prisma.candidate.findMany({
        where: { id: { in: uniqueTargetIds } },
        select: { id: true, region: true, name: true },
      });

      const unauthorizedTargets = targetCandidates.filter(
        (c) => !canManageCandidate(session.user, c.region)
      );
      if (unauthorizedTargets.length > 0) {
        return NextResponse.json(
          { error: `以下の候補者のイベントを管理する権限がありません: ${unauthorizedTargets.map((c) => c.name).join(", ")}` },
          { status: 403 }
        );
      }
    }

    // トランザクション: 変更履歴の記録・合同演説者の削除・イベント更新を一括実行
    const additionalCandidateIds = (data.additionalCandidateIds || []).filter(
      (cid) => cid && cid !== data.candidateId
    );

    const [, , event] = await prisma.$transaction([
      // 変更履歴を記録
      prisma.eventHistory.create({
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
      }),
      // 既存の合同演説者を削除
      prisma.eventCandidate.deleteMany({
        where: { eventId: id },
      }),
      // 演説予定を更新
      prisma.speechEvent.update({
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
          ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
          additionalCandidates: {
            create: additionalCandidateIds.map((candidateId) => ({
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
      }),
    ]);

    // ページのキャッシュを無効化
    const candidateSlug = event.candidate.slug;
    revalidatePath(`/c/${candidateSlug}`);
    revalidatePath(`/c/${candidateSlug}/events/${id}`);

    // 候補者が変更された場合、旧候補者のページも無効化
    if (existingEvent.candidateId !== data.candidateId) {
      const oldCandidate = await prisma.candidate.findUnique({
        where: { id: existingEvent.candidateId },
      });
      if (oldCandidate) {
        revalidatePath(`/c/${oldCandidate.slug}`);
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
  if (!session || !hasPermission(session.user, "RegionEditor")) {
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

    // RegionEditor は自分の地域の候補者のイベントのみステータス変更可能
    if (!canManageCandidate(session.user, existingEvent.candidate.region)) {
      return NextResponse.json({ error: "このイベントを管理する権限がありません" }, { status: 403 });
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

    // ページのキャッシュを無効化
    const candidateSlug = event.candidate.slug;
    revalidatePath(`/c/${candidateSlug}`);
    revalidatePath(`/c/${candidateSlug}/events/${id}`);

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

    // ページのキャッシュを無効化
    const candidateSlug = event.candidate.slug;
    revalidatePath(`/c/${candidateSlug}`);
    revalidatePath(`/c/${candidateSlug}/events/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
