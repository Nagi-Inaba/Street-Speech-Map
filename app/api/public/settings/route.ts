import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 公開側用の設定取得（認証不要）
export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "site-settings" },
    });

    // 設定が存在しない場合はデフォルト値（表示する）を返す
    if (!settings) {
      return NextResponse.json({
        showCandidateInfo: true,
      });
    }

    return NextResponse.json({
      showCandidateInfo: settings.showCandidateInfo,
      candidateLabel: settings.candidateLabel ?? "候補者",
      showEvents: settings.showEvents ?? true,
    });
  } catch (error) {
    console.error("Error fetching public settings:", error);
    // エラー時は表示する（デフォルト）
    return NextResponse.json({
      showCandidateInfo: true,
      candidateLabel: "候補者",
      showEvents: true,
    });
  }
}

