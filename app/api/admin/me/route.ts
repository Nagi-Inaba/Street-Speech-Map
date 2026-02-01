import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultCandidateId: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ defaultCandidateId: user.defaultCandidateId });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  defaultCandidateId: z.string().nullable(),
});

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = patchSchema.parse(body);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { defaultCandidateId: data.defaultCandidateId },
    });
    return NextResponse.json({ defaultCandidateId: data.defaultCandidateId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
