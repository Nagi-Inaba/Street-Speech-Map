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
    const { showCandidateInfo, candidateLabel, showEvents } = body;

    if (typeof showCandidateInfo !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (candidateLabel !== undefined && typeof candidateLabel !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (showEvents !== undefined && typeof showEvents !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const updateData: any = {
      showCandidateInfo,
    };
    
    // candidateLabelが指定されている場合のみ更新
    if (candidateLabel !== undefined) {
      updateData.candidateLabel = candidateLabel || "候補者";
    }

    // showEventsが指定されている場合のみ更新
    if (showEvents !== undefined) {
      updateData.showEvents = showEvents;
    }

    const settings = await prisma.siteSettings.upsert({
      where: { id: "site-settings" },
      update: updateData,
      create: {
        id: "site-settings",
        showCandidateInfo,
        candidateLabel: candidateLabel || "候補者",
        showEvents: showEvents !== undefined ? showEvents : true,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

