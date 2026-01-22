import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const updateEventSchema = z.object({
  candidateId: z.string(),
  status: z.enum(["PLANNED", "LIVE", "ENDED"]),
  startAt: z.string().nullable().optional(),
  endAt: z.string().nullable().optional(),
  timeUnknown: z.boolean().default(false),
  locationText: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// イベント取得
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

// イベント更新
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

    // 既存のイベントを取得（変更履歴用）
    const existingEvent = await prisma.speechEvent.findUnique({
      where: { id },
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

    // イベントを更新
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
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// イベント削除
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
    await prisma.speechEvent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
