import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, canManageCandidate } from "@/lib/rbac";
import { z } from "zod";

const candidateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["SINGLE", "PROPORTIONAL", "SUPPORT", "PARTY_LEADER"]).nullable().optional(),
  prefecture: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  imageUrl: z.union([z.string().url(), z.string().length(0), z.null()]).optional(),
  showEvents: z.boolean().optional(),
  xAccountUrl: z.union([z.string().url(), z.string().length(0), z.null()]).optional(),
});

// 候補者取得
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
    const candidate = await prisma.candidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // RegionEditor は自分の地域の候補者のみ閲覧可能
    if (!canManageCandidate(session.user, candidate.region)) {
      return NextResponse.json({ error: "この候補者を管理する権限がありません" }, { status: 403 });
    }

    return NextResponse.json(candidate);
  } catch (error) {
    console.error("Error fetching candidate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 候補者更新
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
    // 既存候補者の地域を確認して権限チェック
    const existingCandidate = await prisma.candidate.findUnique({
      where: { id },
    });
    if (!existingCandidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    if (!canManageCandidate(session.user, existingCandidate.region)) {
      return NextResponse.json({ error: "この候補者を管理する権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const data = candidateSchema.parse(body);

    // 更新先の地域も権限チェック（地域変更時）
    if (data.region !== existingCandidate.region && !canManageCandidate(session.user, data.region)) {
      return NextResponse.json({ error: "変更先の地域を管理する権限がありません" }, { status: 403 });
    }

    // slugの重複チェック（自分自身を除く）
    const existing = await prisma.candidate.findUnique({
      where: { slug: data.slug },
    });

    if (existing && existing.id !== id) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type || "",
        prefecture: data.prefecture || null,
        region: data.region || null,
        imageUrl: data.imageUrl || null,
        showEvents: data.showEvents !== undefined ? data.showEvents : false,
        xAccountUrl: data.xAccountUrl && data.xAccountUrl.trim() ? data.xAccountUrl.trim() : null,
      },
    });

    return NextResponse.json(candidate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating candidate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// 候補者削除
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
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { defaultCandidateId: id },
        data: { defaultCandidateId: null },
      }),
      prisma.candidate.delete({
        where: { id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

