import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminHeader from "@/components/AdminHeader";

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
    <div className="min-h-screen min-w-0 overflow-x-hidden">
      <AdminHeader
        userEmail={session.user?.email}
        userRole={session.user?.role}
      />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
