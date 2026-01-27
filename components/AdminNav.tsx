"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac";

interface AdminNavProps {
  userRole?: string | null;
}

export default function AdminNav({ userRole }: AdminNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/candidates", label: "候補者" },
    { href: "/admin/events", label: "演説予定" },
    { href: "/admin/requests", label: "リクエスト" },
    { href: "/admin/settings", label: "設定" },
    // SiteAdminのみ表示
    ...(hasPermission({ role: userRole || "" }, "SiteAdmin")
      ? [{ href: "/admin/api-keys", label: "APIキー" }]
      : []),
  ];

  return (
    <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "transition-colors whitespace-nowrap text-sm sm:text-base",
              isActive
                ? "text-foreground font-medium border-b-2 border-primary pb-1"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

