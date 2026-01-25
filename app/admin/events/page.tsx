import { prisma } from "@/lib/db";
import EventsPageClient from "./page-client";

export default async function EventsPage() {
  try {
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

    // 確認件数を追加し、安全にデータを変換
    const eventsWithCheckCount = events.map((event) => {
      // additionalCandidatesを安全に処理
      const safeAdditionalCandidates = (event.additionalCandidates || [])
        .filter((ec) => ec && ec.candidate && ec.candidate.id && ec.candidate.name)
        .map((ec) => ({
          id: ec.id,
          candidateId: ec.candidateId,
          candidate: {
            id: ec.candidate.id,
            name: ec.candidate.name,
            slug: ec.candidate.slug,
          },
        }));

      return {
        id: event.id,
        candidateId: event.candidateId,
        candidate: {
          id: event.candidate.id,
          name: event.candidate.name,
          slug: event.candidate.slug,
        },
        status: event.status,
        startAt: event.startAt,
        endAt: event.endAt,
        timeUnknown: event.timeUnknown,
        locationText: event.locationText,
        lat: event.lat,
        lng: event.lng,
        notes: event.notes,
        submittedAt: event.submittedAt,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        checkCount: event.reports.length,
        additionalCandidates: safeAdditionalCandidates,
      };
    });

    return <EventsPageClient events={eventsWithCheckCount} candidates={candidates} />;
  } catch (error) {
    console.error("Error in EventsPage:", error);
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">エラーが発生しました</h1>
        <p className="text-muted-foreground">
          演説予定の読み込み中にエラーが発生しました。しばらくしてから再度お試しください。
        </p>
        <pre className="mt-4 p-4 bg-gray-100 rounded text-xs overflow-auto">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>
    );
  }
}
