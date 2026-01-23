import { prisma } from "@/lib/db";

/**
 * 2点間の距離を計算（ハーバーサイン公式）
 * 単位: メートル
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // 地球の半径（メートル）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * クラスタリングアルゴリズム（簡易版）
 * 近い位置の報告をグループ化
 */
function clusterReports(
  reports: Array<{ lat: number; lng: number; createdAt: Date }>,
  maxDistance: number = 100
): Array<{ lat: number; lng: number; count: number; lastReportAt: Date }> {
  if (reports.length === 0) return [];

  const clusters: Array<{
    lat: number;
    lng: number;
    count: number;
    reports: Array<{ lat: number; lng: number; createdAt: Date }>;
    lastReportAt: Date;
  }> = [];

  for (const report of reports) {
    if (!report.lat || !report.lng) continue;

    // 既存のクラスターに属するかチェック
    let foundCluster = false;
    for (const cluster of clusters) {
      const distance = calculateDistance(
        report.lat,
        report.lng,
        cluster.lat,
        cluster.lng
      );

      if (distance <= maxDistance) {
        // クラスターに追加
        cluster.reports.push(report);
        cluster.count = cluster.reports.length;
        // クラスターの中心位置を再計算（平均）
        cluster.lat =
          cluster.reports.reduce((sum, r) => sum + r.lat, 0) / cluster.reports.length;
        cluster.lng =
          cluster.reports.reduce((sum, r) => sum + r.lng, 0) / cluster.reports.length;
        // 最新の報告時刻を更新
        if (report.createdAt > cluster.lastReportAt) {
          cluster.lastReportAt = report.createdAt;
        }
        foundCluster = true;
        break;
      }
    }

    // 新しいクラスターを作成
    if (!foundCluster) {
      clusters.push({
        lat: report.lat,
        lng: report.lng,
        count: 1,
        reports: [report],
        lastReportAt: report.createdAt,
      });
    }
  }

  return clusters.map((cluster) => ({
    lat: cluster.lat,
    lng: cluster.lng,
    count: cluster.count,
    lastReportAt: cluster.lastReportAt,
  }));
}

/**
 * MoveHintを生成・更新
 */
export async function generateMoveHints(eventId: string): Promise<void> {
  try {
    // 該当イベントの場所変更報告を取得
    const moveReports = await prisma.publicReport.findMany({
      where: {
        eventId,
        kind: "move",
        lat: { not: null },
        lng: { not: null },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (moveReports.length === 0) {
      // 報告がない場合、既存のMoveHintを非アクティブ化
      await prisma.moveHint.updateMany({
        where: {
          eventId,
          active: true,
        },
        data: {
          active: false,
        },
      });
      return;
    }

    // 報告データを準備
    const reports = moveReports
      .filter((r) => r.lat !== null && r.lng !== null)
      .map((r) => ({
        lat: r.lat!,
        lng: r.lng!,
        createdAt: r.createdAt,
      }));

    // クラスタリング
    const clusters = clusterReports(reports, 100); // 100m以内を同じクラスターとする

    // 既存のMoveHintを取得（非アクティブ化する前に取得）
    const existingHints = await prisma.moveHint.findMany({
      where: {
        eventId,
        active: true,
      },
    });

    // 既存のMoveHintを非アクティブ化
    await prisma.moveHint.updateMany({
      where: {
        eventId,
        active: true,
      },
      data: {
        active: false,
      },
    });

    // 新しいMoveHintを作成
    for (const cluster of clusters) {
      // 既存のMoveHintと近い位置かチェック（50m以内）
      let existingHint = null;
      for (const hint of existingHints) {
        const distance = calculateDistance(
          cluster.lat,
          cluster.lng,
          hint.lat,
          hint.lng
        );
        if (distance <= 50) {
          existingHint = hint;
          break;
        }
      }

      if (existingHint) {
        // 既存のMoveHintを更新
        await prisma.moveHint.update({
          where: { id: existingHint.id },
          data: {
            lat: cluster.lat,
            lng: cluster.lng,
            count: cluster.count,
            lastReportAt: cluster.lastReportAt,
            active: true,
          },
        });
      } else {
        // 新しいMoveHintを作成
        await prisma.moveHint.create({
          data: {
            eventId,
            lat: cluster.lat,
            lng: cluster.lng,
            count: cluster.count,
            lastReportAt: cluster.lastReportAt,
            active: true,
          },
        });
      }
    }
  } catch (error) {
    console.error(`[MoveHint] Error generating move hints for event ${eventId}:`, error);
    throw error;
  }
}
