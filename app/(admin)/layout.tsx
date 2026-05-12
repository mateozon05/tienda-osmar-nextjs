import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata = { title: "Admin – Distribuidora Osmar" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  const isAdmin = session?.role === "admin" || session?.role === "superadmin";
  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="admin-layout">
      <AdminSidebar role={session!.role} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
