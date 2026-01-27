import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import AdminNav from "@/components/AdminNav";

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
    <div className="min-h-screen">
      <nav className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <Link href="/admin" className="text-lg sm:text-xl font-bold text-primary">
                管理画面
              </Link>
              <AdminNav userRole={session.user?.role} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground break-all">{session.user?.email}</span>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full whitespace-nowrap">
                    {session.user?.role}
                  </span>
                </div>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button 
                  type="submit" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-4 sm:py-8">{children}</main>
    </div>
  );
}
