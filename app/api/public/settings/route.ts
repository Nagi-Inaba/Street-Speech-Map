import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 公開設定取得（認証不要）
export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "site-settings" },
      select: {
        showCandidateInfo: true,
        candidateLabel: true,
        showEvents: true,
        shareTemplateLive: true,
        shareTemplatePlanned: true,
      },
    });

    // 設定が存在しない場合はデフォルト値
    if (!settings) {
      return NextResponse.json({
        showCandidateInfo: true,
        candidateLabel: "候補者",
        showEvents: true,
        shareTemplateLive: "{候補者名}さんが現在{場所}で街頭演説を行っています #チームみらい #{候補者名}",
        shareTemplatePlanned: "{時間}から{候補者名}さんの街頭演説が{場所}で予定されています #チームみらい #{候補者名}",
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return NextResponse.json(
      {
        showCandidateInfo: true,
        candidateLabel: "候補者",
        showEvents: true,
        shareTemplateLive: "{候補者名}さんが現在{場所}で街頭演説を行っています #チームみらい #{候補者名}",
        shareTemplatePlanned: "{時間}から{候補者名}さんの街頭演説が{場所}で予定されています #チームみらい #{候補者名}",
      },
      { status: 200 }
    );
  }
}
