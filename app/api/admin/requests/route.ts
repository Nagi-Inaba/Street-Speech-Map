import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";

// リクエスト一覧取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get("candidateId");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "createdAt";
  const order = searchParams.get("order") || "desc";

  try {
    const requests = await prisma.publicRequest.findMany({
      where: {
        ...(candidateId && { candidateId }),
        ...(status && { status }),
      },
      include: {
        candidate: true,
      },
      orderBy: {
        [sort]: order,
      },
      take: 100,
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 一括承認・却下
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids, action } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids is required" }, { status: 400 });
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

    // リクエストを更新
    await prisma.publicRequest.updateMany({
      where: {
        id: { in: ids },
        status: "PENDING",
      },
      data: {
        status: newStatus,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    });

    // 承認されたリクエストを処理
    if (action === "approve") {
      const approvedRequests = await prisma.publicRequest.findMany({
        where: {
          id: { in: ids },
          status: "APPROVED",
        },
      });

      for (const req of approvedRequests) {
        // CREATE_EVENTの場合、新しい演説予定を作成
        if (req.type === "CREATE_EVENT" && req.candidateId) {
          const payload = JSON.parse(req.payload);
          await prisma.speechEvent.create({
            data: {
              candidateId: req.candidateId,
              status: "PLANNED",
              startAt: payload.startAt ? new Date(payload.startAt) : null,
              endAt: payload.endAt ? new Date(payload.endAt) : null,
              timeUnknown: payload.timeUnknown || false,
              locationText: payload.locationText,
              lat: payload.lat,
              lng: payload.lng,
            },
          });
        }

        // REPORT_MOVEの場合、場所を更新
        if (req.type === "REPORT_MOVE" && req.eventId) {
          const payload = JSON.parse(req.payload);
          const event = await prisma.speechEvent.findUnique({
            where: { id: req.eventId },
          });

          if (event) {
            // 変更履歴を記録
            await prisma.eventHistory.create({
              data: {
                eventId: req.eventId,
                fromLat: event.lat,
                fromLng: event.lng,
                fromText: event.locationText,
                fromStartAt: event.startAt,
                fromEndAt: event.endAt,
                toLat: payload.newLat,
                toLng: payload.newLng,
                toText: event.locationText, // 場所テキストは変更しない（管理画面で手動更新）
                toStartAt: event.startAt,
                toEndAt: event.endAt,
                reason: "場所変更報告の承認",
                changedByUserId: session.user.id,
              },
            });

            // 場所を更新
            await prisma.speechEvent.update({
              where: { id: req.eventId },
              data: {
                lat: payload.newLat,
                lng: payload.newLng,
              },
            });
          }
        }

        // REPORT_TIME_CHANGEの場合、時間を更新
        if (req.type === "REPORT_TIME_CHANGE" && req.eventId) {
          const payload = JSON.parse(req.payload);
          const event = await prisma.speechEvent.findUnique({
            where: { id: req.eventId },
          });

          if (event) {
            // 変更履歴を記録
            await prisma.eventHistory.create({
              data: {
                eventId: req.eventId,
                fromLat: event.lat,
                fromLng: event.lng,
                fromText: event.locationText,
                fromStartAt: event.startAt,
                fromEndAt: event.endAt,
                toLat: event.lat,
                toLng: event.lng,
                toText: event.locationText,
                toStartAt: payload.newStartAt ? new Date(payload.newStartAt) : null,
                toEndAt: payload.newEndAt ? new Date(payload.newEndAt) : null,
                reason: "時間変更報告の承認",
                changedByUserId: session.user.id,
              },
            });

            // 時間を更新
            await prisma.speechEvent.update({
              where: { id: req.eventId },
              data: {
                startAt: payload.newStartAt ? new Date(payload.newStartAt) : null,
                endAt: payload.newEndAt ? new Date(payload.newEndAt) : null,
                timeUnknown: !payload.newStartAt && !payload.newEndAt,
              },
            });
          }
        }
      }
    }

    // 同じdedupeKeyを持つ他のリクエストを重複としてマーク
    if (action === "approve") {
      const approvedRequests = await prisma.publicRequest.findMany({
        where: {
          id: { in: ids },
          status: "APPROVED",
          dedupeKey: { not: null },
        },
        select: { dedupeKey: true },
      });

      const dedupeKeys = approvedRequests
        .map((r) => r.dedupeKey)
        .filter((key): key is string => key !== null);

      if (dedupeKeys.length > 0) {
        await prisma.publicRequest.updateMany({
          where: {
            dedupeKey: { in: dedupeKeys },
            id: { notIn: ids },
            status: "PENDING",
          },
          data: {
            status: "DUPLICATE",
            reviewedAt: new Date(),
            reviewedByUserId: session.user.id,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing requests:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
