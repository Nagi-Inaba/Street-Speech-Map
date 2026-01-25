import { prisma } from "@/lib/db";
import EventsPageClient from "./page-client";

export default async function EventsPage() {
  const events = await prisma.speechEvent.findMany({
    include: {
      candidate: true,
      additionalCandidates: {
        include: {
          candidate: true,
        },
      },
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

  // 確認件数を追加し、Dateオブジェクトをシリアライズ可能な形式に変換
  const eventsWithCheckCount = events.map((event) => ({
    ...event,
    startAt: event.startAt ? new Date(event.startAt) : null,
    endAt: event.endAt ? new Date(event.endAt) : null,
    submittedAt: new Date(event.submittedAt),
    createdAt: new Date(event.createdAt),
    updatedAt: new Date(event.updatedAt),
    checkCount: event.reports.length,
    additionalCandidates: event.additionalCandidates
      .filter((ec) => ec.candidate !== null) // nullのcandidateを除外
      .map((ec) => ({
        ...ec,
        candidate: ec.candidate, // candidateが存在することを確認済み
      })),
  }));

  return <EventsPageClient events={eventsWithCheckCount} candidates={candidates} />;
}
