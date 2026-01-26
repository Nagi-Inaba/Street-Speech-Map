import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { generateMoveHints } from "@/lib/move-hint";

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
  const groupByEvent = searchParams.get("groupByEvent") === "true";

  try {
    const requests = await prisma.publicRequest.findMany({
      where: {
        ...(candidateId && { candidateId }),
        ...(status && { status }),
        // groupByEventの場合でも、すべてのリクエストを取得（後でグループ化）
      },
      include: {
        candidate: true,
      },
      orderBy: {
        [sort]: order,
      },
      take: 1000,
    });

    // eventIdでグループ化する場合
    if (groupByEvent) {
      // eventIdでグループ化
      const groupedByEvent = new Map<string, typeof requests>();
      for (const req of requests) {
        if (req.eventId) {
          if (!groupedByEvent.has(req.eventId)) {
            groupedByEvent.set(req.eventId, []);
          }
          groupedByEvent.get(req.eventId)!.push(req);
        }
      }

      // PublicReportも取得（演説中・演説終了の報告）
      // 候補者フィルターがある場合、その候補者のイベントのみを取得
      let eventFilter: any = {};
      if (candidateId) {
        eventFilter.candidateId = candidateId;
      }

      // すべてのイベント（候補者フィルター適用）を取得してPublicReportを含める
      const eventsWithReports = await prisma.speechEvent.findMany({
        where: {
          ...eventFilter,
        },
        include: {
          candidate: true,
          reports: {
            where: {
              kind: {
                in: ["start", "end", "move"], // "check"は除外
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 100, // 最新100件まで
          },
        },
      });

      // PublicReportをPublicRequest形式に変換
      // statusフィルターが指定されている場合、APPROVEDのPublicReportは除外
      const reportRequests: typeof requests = [];
      eventsWithReports.forEach((event) => {
        event.reports.forEach((report) => {
          // kind: "start" -> type: "REPORT_START"
          // kind: "end" -> type: "REPORT_END"
          // kind: "move" -> type: "REPORT_MOVE"
          let requestType = "";
          if (report.kind === "start") requestType = "REPORT_START";
          else if (report.kind === "end") requestType = "REPORT_END";
          else if (report.kind === "move") requestType = "REPORT_MOVE";
          else return; // "check"はスキップ

          // statusフィルターが指定されている場合、フィルターに一致するもののみを含める
          // PublicReportは常にAPPROVEDなので、status=PENDINGやstatus=REJECTEDの場合は除外
          // statusが空文字列（すべて）の場合は含める
          if (status && status !== "" && status !== "APPROVED") {
            return;
          }

          // PublicRequest形式に変換
          reportRequests.push({
            id: `report_${report.id}`,
            type: requestType,
            status: "APPROVED", // PublicReportは既に処理済み
            candidateId: event.candidateId,
            candidate: event.candidate,
            eventId: event.id,
            rivalEventId: null,
            payload: JSON.stringify({
              lat: report.lat,
              lng: report.lng,
            }),
            dedupeKey: null,
            createdAt: report.createdAt,
            reviewedAt: null,
            reviewedByUserId: null,
          } as typeof requests[0]);
        });
      });

      // すべてのリクエストを統合
      const allRequests = [...requests, ...reportRequests];

      // eventIdで再グループ化（eventIdがないリクエストも含める）
      const allGroupedByEvent = new Map<string, typeof allRequests>();
      const requestsWithoutEventId: typeof allRequests = [];
      
      for (const req of allRequests) {
        if (req.eventId) {
          if (!allGroupedByEvent.has(req.eventId)) {
            allGroupedByEvent.set(req.eventId, []);
          }
          allGroupedByEvent.get(req.eventId)!.push(req);
        } else {
          // eventIdがないリクエスト（例：CREATE_EVENT）も含める
          requestsWithoutEventId.push(req);
        }
      }

      // すべてのイベントIDを取得
      const allEventIdsSet = new Set<string>();
      allRequests.forEach((req) => {
        if (req.eventId) allEventIdsSet.add(req.eventId);
      });
      eventsWithReports.forEach((event) => {
        if (event.reports.length > 0) {
          allEventIdsSet.add(event.id);
        }
      });

      // イベント情報を取得
      const events = await prisma.speechEvent.findMany({
        where: {
          ...eventFilter,
          ...(allEventIdsSet.size > 0 && { id: { in: Array.from(allEventIdsSet) } }),
        },
        include: {
          candidate: true,
        },
      });

      // イベントごとにリクエストをまとめる
      type EventWithRequestsResult = {
        event: {
          id: string | null;
          locationText: string;
          startAt: Date | null;
          endAt: Date | null;
          status: string | null;
          candidate: (typeof events)[0]["candidate"] | null;
        };
        requests: typeof allRequests;
        requestsByType: {
          CREATE_EVENT: typeof allRequests;
          UPDATE_EVENT: typeof allRequests;
          REPORT_START: typeof allRequests;
          REPORT_END: typeof allRequests;
          REPORT_MOVE: typeof allRequests;
          REPORT_TIME_CHANGE: typeof allRequests;
        };
      };

      const result: EventWithRequestsResult[] = events.map((event) => {
        const eventRequests = allGroupedByEvent.get(event.id) || [];
        // リクエストタイプごとにグループ化
        const requestsByType = {
          CREATE_EVENT: eventRequests.filter((r) => r.type === "CREATE_EVENT"),
          UPDATE_EVENT: eventRequests.filter((r) => r.type === "UPDATE_EVENT"),
          REPORT_START: eventRequests.filter((r) => r.type === "REPORT_START"),
          REPORT_END: eventRequests.filter((r) => r.type === "REPORT_END"),
          REPORT_MOVE: eventRequests.filter((r) => r.type === "REPORT_MOVE"),
          REPORT_TIME_CHANGE: eventRequests.filter((r) => r.type === "REPORT_TIME_CHANGE"),
        };

        return {
          event: {
            id: event.id,
            locationText: event.locationText,
            startAt: event.startAt,
            endAt: event.endAt,
            status: event.status,
            candidate: event.candidate,
          },
          requests: eventRequests,
          requestsByType,
        };
      });

      // eventIdがないリクエストも結果に含める（特別なイベントとして扱う）
      if (requestsWithoutEventId.length > 0) {
        // eventIdがないリクエストをタイプごとにグループ化
        const requestsByType = {
          CREATE_EVENT: requestsWithoutEventId.filter((r) => r.type === "CREATE_EVENT"),
          UPDATE_EVENT: requestsWithoutEventId.filter((r) => r.type === "UPDATE_EVENT"),
          REPORT_START: [] as typeof requestsWithoutEventId,
          REPORT_END: [] as typeof requestsWithoutEventId,
          REPORT_MOVE: [] as typeof requestsWithoutEventId,
          REPORT_TIME_CHANGE: [] as typeof requestsWithoutEventId,
        };

        result.push({
          event: {
            id: null, // eventIdがないことを示す
            locationText: "イベント未作成",
            startAt: null,
            endAt: null,
            status: null,
            candidate: requestsWithoutEventId[0]?.candidate || null,
          },
          requests: requestsWithoutEventId,
          requestsByType,
        });
      }

      return NextResponse.json(result);
    }

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

    // 却下の場合は即座に更新
    if (action === "reject") {
      const updateResult = await prisma.publicRequest.updateMany({
        where: {
          id: { in: ids },
          status: "PENDING",
        },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          reviewedByUserId: session.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        updatedCount: updateResult.count,
      });
    }

    // 承認の場合は、処理が成功した場合のみ承認済みにする
    // まず、リクエストを取得
    const pendingRequests = await prisma.publicRequest.findMany({
      where: {
        id: { in: ids },
        status: "PENDING",
      },
    });

    if (pendingRequests.length === 0) {
      return NextResponse.json(
        {
          error: "処理対象のリクエストが見つかりません",
          details: {
            notFound: ids.filter(
              (id) => !pendingRequests.some((r) => r.id === id)
            ),
            alreadyProcessed: ids.filter((id) =>
              pendingRequests.some((r) => r.id === id && r.status !== "PENDING")
            ),
          },
        },
        { status: 400 }
      );
    }

    const processingErrors: Array<{ requestId: string; type: string; error: string }> = [];
    const successfullyProcessedIds: string[] = [];

    // 各リクエストを処理
    for (const req of pendingRequests) {
      try {
        let processed = false;

        // CREATE_EVENTの場合、新しい演説予定を作成
        if (req.type === "CREATE_EVENT" && req.candidateId) {
          const payload = JSON.parse(req.payload);
          
          // 必須フィールドの検証（詳細なエラーメッセージ）
          const missingFields: string[] = [];
          if (!payload.locationText) missingFields.push("場所 (locationText)");
          if (payload.lat === undefined || payload.lat === null) missingFields.push("緯度 (lat)");
          if (payload.lng === undefined || payload.lng === null) missingFields.push("経度 (lng)");
          
          if (missingFields.length > 0) {
            // 過去のリクエストでlat/lngがpayloadに含まれていない場合の説明を追加
            const errorMessage = missingFields.includes("緯度 (lat)") || missingFields.includes("経度 (lng)")
              ? `必須フィールドが不足しています: ${missingFields.join(", ")}\n\n注意: このリクエストは過去に送信されたもので、地図の位置情報が保存されていません。管理画面で手動で位置を指定するか、リクエストを却下してください。`
              : `必須フィールドが不足しています: ${missingFields.join(", ")}`;
            throw new Error(errorMessage);
          }

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
          processed = true;
        }

        // REPORT_START/REPORT_ENDは自動処理されるため、手動承認は不要
        // （PublicReportとして5件以上で自動的にステータスが更新される）
        if (req.type === "REPORT_START" || req.type === "REPORT_END") {
          throw new Error(
            "開始/終了報告は自動処理されます。公開側の「演説中」「演説終了」ボタンから報告してください。"
          );
        }

        // REPORT_MOVEの場合、場所を更新
        if (req.type === "REPORT_MOVE" && req.eventId) {
          const payload = JSON.parse(req.payload);
          const event = await prisma.speechEvent.findUnique({
            where: { id: req.eventId },
          });

          if (!event) {
            throw new Error("イベントが見つかりません");
          }

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

          // MoveHintを生成
          await generateMoveHints(req.eventId);
          processed = true;
        }

        // REPORT_TIME_CHANGEの場合、時間を更新
        if (req.type === "REPORT_TIME_CHANGE" && req.eventId) {
          const payload = JSON.parse(req.payload);
          const event = await prisma.speechEvent.findUnique({
            where: { id: req.eventId },
          });

          if (!event) {
            throw new Error("イベントが見つかりません");
          }

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
          processed = true;
        }

        // 処理が成功した場合のみ、承認済みにする
        if (processed) {
          successfullyProcessedIds.push(req.id);
        }
      } catch (error: any) {
        console.error(`Error processing request ${req.id}:`, error);
        processingErrors.push({
          requestId: req.id,
          type: req.type,
          error: error.message || "処理に失敗しました",
        });
      }
    }

    // 成功したリクエストのみを承認済みに更新
    if (successfullyProcessedIds.length > 0) {
      await prisma.publicRequest.updateMany({
        where: {
          id: { in: successfullyProcessedIds },
          status: "PENDING",
        },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedByUserId: session.user.id,
        },
      });
    }

    // 同じdedupeKeyを持つ他のリクエストを重複としてマーク
    if (successfullyProcessedIds.length > 0) {
      const approvedRequests = await prisma.publicRequest.findMany({
        where: {
          id: { in: successfullyProcessedIds },
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
            id: { notIn: successfullyProcessedIds },
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

    // レスポンスを返す
    if (processingErrors.length > 0) {
      return NextResponse.json(
        {
          success: true,
          updatedCount: successfullyProcessedIds.length,
          warnings: processingErrors,
          message: `${successfullyProcessedIds.length}件のリクエストを承認しましたが、${processingErrors.length}件の処理でエラーが発生しました`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      updatedCount: successfullyProcessedIds.length,
    });
  } catch (error) {
    console.error("Error processing requests:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json(
      { error: "リクエストの処理中にエラーが発生しました", details: errorMessage },
      { status: 500 }
    );
  }
}
