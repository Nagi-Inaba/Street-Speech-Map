"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/rbac";
import { signOutAction } from "@/lib/auth-actions";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  userEmail?: string | null;
  userRole?: string | null;
}

function getNavItems(userRole: string) {
  return [
    { href: "/admin/candidates", label: "候補者" },
    { href: "/admin/events", label: "演説予定" },
    { href: "/admin/requests", label: "リクエスト" },
    { href: "/admin/settings", label: "設定" },
    ...(hasPermission({ role: userRole || "" }, "SiteAdmin")
      ? [{ href: "/admin/api-keys", label: "APIキー" }]
      : []),
  ];
}

export default function AdminHeader({ userEmail, userRole }: AdminHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = getNavItems(userRole ?? "");

  const navLinks = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      {items.map((item: { href: string; label: string }) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMenuOpen(false)}
            className={cn(
              "transition-colors whitespace-nowrap text-sm sm:text-base py-2 sm:py-0",
              isActive
                ? "text-foreground font-medium border-b-2 border-primary pb-1 sm:border-b-0 sm:border-b-2 sm:pb-1"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );

  const userBlock = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
      <div className="text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground break-all">{userEmail}</span>
          <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full whitespace-nowrap">
            {userRole}
          </span>
        </div>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          ログアウト
        </button>
      </form>
    </div>
  );

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* 1行目: 管理画面 + メニューボタン(モバイル) / 管理画面 + ナビ(デスクトップ) */}
          <div className="flex items-center justify-between sm:justify-start gap-4 sm:gap-6">
            <Link href="/admin" className="text-lg sm:text-xl font-bold text-primary shrink-0">
              管理画面
            </Link>
            <div className="hidden sm:flex sm:items-center sm:gap-4">
              {navLinks}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="sm:hidden shrink-0"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
          <div className="hidden sm:flex sm:items-center sm:gap-4">
            {userBlock}
          </div>
        </div>
        {/* モバイル: メニュー開いたときに表示 */}
        {menuOpen && (
          <div className="sm:hidden mt-4 pt-4 flex flex-col gap-4 border-t border-border">
            {navLinks}
            {userBlock}
          </div>
        )}
      </div>
    </nav>
  );
}
