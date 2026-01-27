import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import ApiKeysPageClient from "./page-client";

export default async function ApiKeysPage() {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  if (!hasPermission(session.user, "SiteAdmin")) {
    redirect("/admin");
  }

  const apiKeys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      rateLimit: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return <ApiKeysPageClient apiKeys={apiKeys} />;
}
