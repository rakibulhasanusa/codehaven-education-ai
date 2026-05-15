import { AdminSidebar } from "@/components/admin/sidebar";
import AdminBaseNavbar from "@/components/navbars/admin-base-navbar";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireAuth("admin");
  if (!guard.ok) {
    redirect(guard.status === 401 ? "/login" : "/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:py-10">
      <AdminBaseNavbar />

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AdminSidebar />
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
