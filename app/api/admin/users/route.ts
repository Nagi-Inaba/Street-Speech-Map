import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// GET: List all users (SiteAdmin only)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user, "SiteAdmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        region: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Random numeric ID (6 digits)
function generateUserId(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

// Random alphanumeric password (12 chars)
function generatePassword(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    const randomByte = crypto.randomBytes(1)[0];
    password += chars.charAt(randomByte % chars.length);
  }
  return password;
}

const createUserSchema = z.object({
  name: z.string().min(1, "名前は必須です"),
  role: z.enum(["SiteAdmin", "SiteStaff", "PartyAdmin", "RegionEditor"]),
  region: z.string().optional().nullable(),
  email: z.string().email().optional(),
});

// POST: Create a new admin user (SiteAdmin only)
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user, "SiteAdmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);

    // Generate unique userId
    let userId = generateUserId();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.user.findUnique({
        where: { userId },
      });
      if (!existing) break;
      userId = generateUserId();
      attempts++;
    }
    if (attempts >= 10) {
      return NextResponse.json(
        { error: "ユーザーIDの生成に失敗しました。再試行してください。" },
        { status: 500 }
      );
    }

    // Generate password
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate email if not provided
    const email = data.email || `admin-${userId}@example.com`;

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { error: "このメールアドレスは既に使用されています" },
        { status: 409 }
      );
    }

    const user = await prisma.user.create({
      data: {
        userId,
        email,
        passwordHash,
        name: data.name,
        role: data.role,
        region: data.region || null,
      },
      select: {
        id: true,
        userId: true,
        email: true,
        name: true,
        role: true,
        region: true,
        createdAt: true,
      },
    });

    // Return user info with plain-text password (shown once)
    return NextResponse.json({
      ...user,
      generatedPassword: password,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
