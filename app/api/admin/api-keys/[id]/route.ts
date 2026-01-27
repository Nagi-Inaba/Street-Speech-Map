import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateApiKeySchema = z.object({
  name: z.string().min(1).optional(),
  rateLimit: z.number().int().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

// APIキー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteAdmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateApiKeySchema.parse(body);

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      rateLimit: apiKey.rateLimit,
      isActive: apiKey.isActive,
      updatedAt: apiKey.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation Error", message: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Error updating API key:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "APIキーの更新に失敗しました。" },
      { status: 500 }
    );
  }
}

// APIキー削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteAdmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    await prisma.apiKey.delete({
      where: { id },
    });

    return NextResponse.json({ message: "APIキーを削除しました。" });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "APIキーの削除に失敗しました。" },
      { status: 500 }
    );
  }
}
