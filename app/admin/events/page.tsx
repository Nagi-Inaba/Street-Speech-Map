import { prisma } from "@/lib/db";
import EventsPageClient from "./page-client";

export default async function EventsPage() {
  const events = await prisma.speechEvent.findMany({
    include: {
      candidate: true,
    },
    orderBy: [
      { startAt: "asc" },
      { createdAt: "desc" },
    ],
  });

  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
  });

  return <EventsPageClient events={events} candidates={candidates} />;
}
