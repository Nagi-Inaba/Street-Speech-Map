import { prisma } from "@/lib/db";
import EventsPageClient from "./page-client";

export default async function EventsPage() {
  const events = await prisma.speechEvent.findMany({
    include: {
      candidate: true,
      reports: {
        where: {
          kind: "check",
        },
      },
    },
    orderBy: [
      { startAt: "asc" },
      { createdAt: "desc" },
    ],
  });

  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
  });

  // 確認件数を追加
  const eventsWithCheckCount = events.map((event) => ({
    ...event,
    checkCount: event.reports.length,
  }));

  return <EventsPageClient events={eventsWithCheckCount} candidates={candidates} />;
}
