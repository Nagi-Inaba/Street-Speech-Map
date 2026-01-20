import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { slug },
    include: {
      events: {
        orderBy: [
          { startAt: "asc" },
          { createdAt: "desc" },
        ],
      },
    },
  });

  if (!candidate) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(candidate.events);
}
