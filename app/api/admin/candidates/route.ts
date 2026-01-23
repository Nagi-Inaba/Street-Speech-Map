import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

const candidateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  type: z.enum(["SINGLE", "PROPORTIONAL"]),
  prefecture: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  imageUrl: z.union([z.string().url(), z.string().length(0), z.null()]).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(candidates);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = candidateSchema.parse(body);

    const candidate = await prisma.candidate.create({
      data: {
        name: data.name,
        slug: data.slug,
        type: data.type,
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
