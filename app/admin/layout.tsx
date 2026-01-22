import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

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
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-xl font-bold text-primary">
                管理画面
              </Link>
              <div className="flex items-center gap-4">
                <Link 
                  href="/admin/candidates" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  候補者
                </Link>
                <Link 
                  href="/admin/events" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  イベント
                </Link>
                <Link 
                  href="/admin/requests" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  リクエスト
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">{session.user?.email}</span>
                <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  {session.user?.role}
                </span>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button 
                  type="submit" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
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
