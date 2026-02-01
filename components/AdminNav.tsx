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
    { href: "/admin", label: "ダッシュボード" },
    { href: "/admin/events", label: "演説予定" },
    { href: "/admin/requests", label: "リクエスト" },
    { href: "/admin/settings", label: "設定" },
    // SiteAdminのみ表示
    ...(hasPermission({ role: userRole || "" }, "SiteAdmin")
      ? [{ href: "/admin/api-keys", label: "APIキー" }]
      : []),
  ];

  return (
    <div className="relative flex items-center gap-2 sm:gap-4 overflow-x-auto">
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(item.href + "/");
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
      {/* 右端のグラデーション（横スクロールできることを示す） */}
      <div
        className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden shrink-0"
        aria-hidden
      />
    </div>
  );
}

