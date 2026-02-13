import { NextResponse } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/rbac";

const TIMEZONE = "Asia/Tokyo";
const CSV_HEADERS = [
  "event_id",
  "candidate_id",
  "candidate_name",
  "candidate_slug",
  "additional_candidate_ids",
  "additional_candidate_names",
  "status",
  "status_label",
  "time_unknown",
  "start_at_jst",
  "end_at_jst",
  "location_text",
  "lat",
  "lng",
  "notes",
  "is_public",
  "submitted_at_jst",
  "created_at_jst",
  "updated_at_jst",
] as const;

function statusLabel(status: string): string {
  switch (status) {
    case "LIVE":
      return "実施中";
    case "ENDED":
      return "終了";
    default:
      return "予定";
  }
}

function formatJstDateTime(value: Date | null): string {
  if (!value) return "";
  return formatInTimeZone(value, TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

function escapeCsv(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function toCsvRow(values: Array<string | number | boolean | null | undefined>): string {
  return values
    .map((value) => {
      if (value === null || value === undefined) return "";
      if (typeof value === "boolean") return value ? "true" : "false";
      return escapeCsv(String(value));
    })
    .join(",");
}

export async function GET() {
  const session = await auth();
  if (!session || !hasPermission(session.user, "SiteStaff")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const events = await prisma.speechEvent.findMany({
      include: {
        candidate: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        additionalCandidates: {
          include: {
            candidate: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { startAt: "asc" },
        { createdAt: "desc" },
      ],
    });

    const lines: string[] = [toCsvRow([...CSV_HEADERS])];

    for (const event of events) {
      const additionalCandidateIds = event.additionalCandidates.map((item) => item.candidateId).join("|");
      const additionalCandidateNames = event.additionalCandidates
        .map((item) => item.candidate.name)
        .join("|");

      lines.push(
        toCsvRow([
          event.id,
          event.candidate.id,
          event.candidate.name,
          event.candidate.slug,
          additionalCandidateIds,
          additionalCandidateNames,
          event.status,
          statusLabel(event.status),
          event.timeUnknown,
          formatJstDateTime(event.startAt),
          formatJstDateTime(event.endAt),
          event.locationText,
          event.lat,
          event.lng,
          event.notes ?? "",
          event.isPublic,
          formatJstDateTime(event.submittedAt),
          formatJstDateTime(event.createdAt),
          formatJstDateTime(event.updatedAt),
        ])
      );
    }

    const csv = `\uFEFF${lines.join("\r\n")}`;
    const timestamp = formatInTimeZone(new Date(), TIMEZONE, "yyyyMMdd-HHmmss");
    const filename = `street-speech-events-${timestamp}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to export events CSV:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
