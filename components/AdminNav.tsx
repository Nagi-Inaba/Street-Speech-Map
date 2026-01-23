"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function AdminNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/candidates", label: "候補者" },
    { href: "/admin/events", label: "演説予定" },
    { href: "/admin/requests", label: "リクエスト" },
  ];

  return (
    <div className="flex items-center gap-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "transition-colors",
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

