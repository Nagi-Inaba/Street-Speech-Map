import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";

// 設定取得
export async function GET() {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: "site-settings" },
    });

    // 設定が存在しない場合はデフォルト値で作成
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: "site-settings",
          showCandidateInfo: true,
          candidateLabel: "候補者",
          showEvents: true,
          shareTemplateLive: "{候補者名}さんが現在{場所}で街頭演説を行っています #チームみらい #{候補者名}",
          shareTemplatePlanned: "{時間}から{候補者名}さんの街頭演説が{場所}で予定されています #チームみらい #{候補者名}",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 設定更新
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { showCandidateInfo, candidateLabel, showEvents, shareTemplateLive, shareTemplatePlanned } = body;

    if (typeof showCandidateInfo !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (candidateLabel !== undefined && typeof candidateLabel !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (showEvents !== undefined && typeof showEvents !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (shareTemplateLive !== undefined && typeof shareTemplateLive !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (shareTemplatePlanned !== undefined && typeof shareTemplatePlanned !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updateData: any = {
      showCandidateInfo,
    };
    
    // candidateLabelが指定されている場合のみ更新（空文字列も許可）
    if (candidateLabel !== undefined) {
      updateData.candidateLabel = candidateLabel;
    }

    // showEventsが指定されている場合のみ更新
    if (showEvents !== undefined) {
      updateData.showEvents = showEvents;
    }

    // shareTemplateLiveが指定されている場合のみ更新
    if (shareTemplateLive !== undefined) {
      updateData.shareTemplateLive = shareTemplateLive;
    }

    // shareTemplatePlannedが指定されている場合のみ更新
    if (shareTemplatePlanned !== undefined) {
      updateData.shareTemplatePlanned = shareTemplatePlanned;
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: "site-settings" },
      update: updateData,
      create: {
        id: "site-settings",
        showCandidateInfo,
        candidateLabel: candidateLabel !== undefined ? candidateLabel : "候補者",
        showEvents: showEvents !== undefined ? showEvents : true,
        shareTemplateLive: shareTemplateLive !== undefined ? shareTemplateLive : "{候補者名}さんが現在{場所}で街頭演説を行っています #チームみらい #{候補者名}",
        shareTemplatePlanned: shareTemplatePlanned !== undefined ? shareTemplatePlanned : "{時間}から{候補者名}さんの街頭演説が{場所}で予定されています #チームみらい #{候補者名}",
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

