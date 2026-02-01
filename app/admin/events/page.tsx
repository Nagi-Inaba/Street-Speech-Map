import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import EventsPageClient from "./page-client";
import { sortCandidatesByRegion } from "@/lib/sort-candidates";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  try {
    const session = await auth();
    let defaultCandidateId: string | null = null;
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { defaultCandidateId: true },
      });
      defaultCandidateId = user?.defaultCandidateId ?? null;
    }
    // EventCandidateテーブルが存在するか確認
    let events;
    try {
      events = await prisma.speechEvent.findMany({
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
    } catch (error: any) {
      // EventCandidateテーブルが存在しない場合、additionalCandidatesなしで取得
      if (error?.message?.includes("EventCandidate") || error?.message?.includes("does not exist")) {
        events = await prisma.speechEvent.findMany({
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
      } else {
        throw error;
      }
    }

    const candidates = await prisma.candidate.findMany();
    const sortedCandidates = sortCandidatesByRegion(candidates);

    // 確認件数を追加し、安全にデータを変換
    const eventsWithCheckCount = events.map((event) => {
      // additionalCandidatesを安全に処理（テーブルが存在しない場合は空配列）
      const safeAdditionalCandidates = ('additionalCandidates' in event && event.additionalCandidates)
        ? (event.additionalCandidates as any[])
            .filter((ec) => ec && ec.candidate && ec.candidate.id && ec.candidate.name)
            .map((ec) => ({
              id: ec.id,
              candidateId: ec.candidateId,
              candidate: {
                id: ec.candidate.id,
                name: ec.candidate.name,
                slug: ec.candidate.slug,
              },
            }))
        : [];

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
        isPublic: event.isPublic,
        submittedAt: event.submittedAt,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        checkCount: event.reports.length,
        additionalCandidates: safeAdditionalCandidates,
      };
    });

    return (
      <EventsPageClient
        events={eventsWithCheckCount}
        candidates={sortedCandidates}
        defaultCandidateId={defaultCandidateId ?? undefined}
      />
    );
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
