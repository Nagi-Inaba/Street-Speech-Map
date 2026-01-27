import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { hashApiKey } from "@/lib/api-auth";
import { z } from "zod";
import crypto from "crypto";

const createApiKeySchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  rateLimit: z.number().int().min(1).max(10000).default(100),
});

// APIキー一覧取得
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteAdmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
        createdByUserId: true,
      },
    });

    return NextResponse.json(apiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "APIキー一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}

// APIキー作成
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteAdmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createApiKeySchema.parse(body);

    // APIキーを生成（32文字のランダム文字列）
    const apiKey = crypto.randomBytes(16).toString("hex");
    const keyHash = hashApiKey(apiKey);

    const apiKeyRecord = await prisma.apiKey.create({
      data: {
        name: validated.name,
        keyHash,
        rateLimit: validated.rateLimit,
        isActive: true,
        createdByUserId: session.user.id,
      },
    });

    // APIキーは一度だけ表示（ハッシュは保存済み）
    return NextResponse.json({
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      apiKey, // この時だけ返す
      rateLimit: apiKeyRecord.rateLimit,
      createdAt: apiKeyRecord.createdAt,
      warning: "このAPIキーは一度だけ表示されます。必ず安全な場所に保存してください。",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation Error", message: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Internal Server Error", message: "APIキーの作成に失敗しました。" },
      { status: 500 }
    );
  }
}
