import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission, canManageCandidate } from "@/lib/rbac";
import { z } from "zod";

const updateRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "DUPLICATE"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "RegionEditor")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // リクエストの候補者情報を取得して権限チェック
    const existingRequest = await prisma.publicRequest.findUnique({
      where: { id },
      include: { candidate: true },
    });
    if (!existingRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (!canManageCandidate(session.user, existingRequest.candidate?.region)) {
      return NextResponse.json({ error: "このリクエストを管理する権限がありません" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateRequestSchema.parse(body);

    const publicRequest = await prisma.publicRequest.update({
      where: { id },
      data: {
        status: data.status,
        reviewedAt: new Date(),
        reviewedByUserId: session.user.id,
      },
    });

    return NextResponse.json(publicRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
