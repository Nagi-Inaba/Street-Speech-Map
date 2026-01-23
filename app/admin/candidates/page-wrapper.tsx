import { prisma } from "@/lib/db";
import CandidatesPage from "./page";

export default async function CandidatesPageWrapper() {
  const candidates = await prisma.candidate.findMany({
    orderBy: { name: "asc" },
  });

  return <CandidatesPage candidates={candidates} />;
}

