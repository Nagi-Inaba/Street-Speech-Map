import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import Link from "next/link";
import { signOut } from "@/app/api/auth/[...nextauth]/route";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-xl font-bold">
                管理画面
              </Link>
              <Link href="/admin/candidates" className="text-muted-foreground hover:text-foreground">
                候補者
              </Link>
              <Link href="/admin/events" className="text-muted-foreground hover:text-foreground">
                イベント
              </Link>
              <Link href="/admin/requests" className="text-muted-foreground hover:text-foreground">
                リクエスト
              </Link>
              <Link href="/admin/rival-events" className="text-muted-foreground hover:text-foreground">
                他党イベント
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {session.user?.email} ({session.user?.role})
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
