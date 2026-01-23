import { prisma } from "@/lib/db";
import CandidatesPageClient from "./page-client";

export default async function CandidatesPage() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
  });

  return <CandidatesPageClient candidates={candidates} />;
}
