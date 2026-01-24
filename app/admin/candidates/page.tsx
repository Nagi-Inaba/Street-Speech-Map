import { prisma } from "@/lib/db";
import CandidatesPageClient from "./page-client";
import { sortCandidatesByRegion } from "@/lib/sort-candidates";

export default async function CandidatesPage() {
  const candidates = await prisma.candidate.findMany();
  const sortedCandidates = sortCandidatesByRegion(candidates);

  return <CandidatesPageClient candidates={sortedCandidates} />;
}
