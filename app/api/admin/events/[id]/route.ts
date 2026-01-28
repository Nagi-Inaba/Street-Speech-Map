import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";
import { generateEventOgImage, generateCandidateOgImage } from "@/lib/og-image-generator";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

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

    // OGP画像を再生成（時間や場所が変更された場合）
    const needsRegenerate = 
      existingEvent.lat !== data.lat ||
      existingEvent.lng !== data.lng ||
      existingEvent.locationText !== data.locationText ||
      existingEvent.startAt?.getTime() !== (data.startAt ? new Date(data.startAt).getTime() : null) ||
      existingEvent.status !== data.status;

    if (needsRegenerate) {
      try {
        // イベントのOGP画像を再生成
        await generateEventOgImage(event);
        console.log(`OGP画像を再生成しました: event-${event.id}.png`);
      } catch (error) {
        console.error("OGP画像の再生成に失敗しました:", error);
        // エラーでも処理は続行
      }

      // 候補者ページのOGP画像も再生成（イベントが変更されたため）
      try {
        const candidateWithEvents = await prisma.candidate.findUnique({
          where: { id: event.candidateId },
          include: {
            events: {
              where: {
                status: {
                  in: ["PLANNED", "LIVE"],
                },
              },
              orderBy: [
                { status: "asc" },
                { startAt: "asc" },
              ],
            },
          },
        });
        if (candidateWithEvents) {
          await generateCandidateOgImage(candidateWithEvents);
          console.log(`候補者OGP画像を再生成しました: candidate-${candidateWithEvents.slug}.png`);
        }
      } catch (error) {
        console.error("候補者OGP画像の再生成に失敗しました:", error);
        // エラーでも処理は続行
      }
    }

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

    // OGP画像を再生成（ステータスが変更された場合）
    const needsRegenerate = existingEvent.status !== status;

    if (needsRegenerate) {
      try {
        // イベントのOGP画像を再生成
        await generateEventOgImage(event);
        console.log(`OGP画像を再生成しました: event-${event.id}.png`);
      } catch (error) {
        console.error("OGP画像の再生成に失敗しました:", error);
        // エラーでも処理は続行
      }

      // 候補者ページのOGP画像も再生成
      try {
        const candidateWithEvents = await prisma.candidate.findUnique({
          where: { id: event.candidateId },
          include: {
            events: {
              where: {
                status: {
                  in: ["PLANNED", "LIVE"],
                },
              },
              orderBy: [
                { status: "asc" },
                { startAt: "asc" },
              ],
            },
          },
        });
        if (candidateWithEvents) {
          await generateCandidateOgImage(candidateWithEvents);
          console.log(`候補者OGP画像を再生成しました: candidate-${candidateWithEvents.slug}.png`);
        }
      } catch (error) {
        console.error("候補者OGP画像の再生成に失敗しました:", error);
        // エラーでも処理は続行
      }
    }

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

    // OGP画像ファイルを削除
    const imagePath = join(process.cwd(), "public", "og-images", `event-${id}.png`);
    if (existsSync(imagePath)) {
      try {
        await unlink(imagePath);
        console.log(`OGP画像を削除しました: event-${id}.png`);
      } catch (error) {
        console.error("OGP画像の削除に失敗しました:", error);
        // エラーでも処理は続行
      }
    }

    // 候補者ページのOGP画像も再生成（イベントが削除されたため）
    try {
      const candidateWithEvents = await prisma.candidate.findUnique({
        where: { id: event.candidateId },
        include: {
          events: {
            where: {
              status: {
                in: ["PLANNED", "LIVE"],
              },
            },
            orderBy: [
              { status: "asc" },
              { startAt: "asc" },
            ],
          },
        },
      });
      if (candidateWithEvents) {
        await generateCandidateOgImage(candidateWithEvents);
        console.log(`候補者OGP画像を再生成しました: candidate-${candidateWithEvents.slug}.png`);
      }
    } catch (error) {
      console.error("候補者OGP画像の再生成に失敗しました:", error);
      // エラーでも処理は続行
    }

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
