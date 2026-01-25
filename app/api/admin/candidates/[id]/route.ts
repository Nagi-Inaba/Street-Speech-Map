import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const candidateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["SINGLE", "PROPORTIONAL", "SUPPORT", "PARTY_LEADER"]).nullable().optional(),
  prefecture: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  imageUrl: z.union([z.string().url(), z.string().length(0), z.null()]).optional(),
});

// 候補者取得
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
    const candidate = await prisma.candidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
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
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = candidateSchema.parse(body);

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
    await prisma.candidate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting candidate:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

