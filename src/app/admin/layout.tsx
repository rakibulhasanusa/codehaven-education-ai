import { AdminSidebar } from "@/components/admin/sidebar";
import LogoutButton from "@/components/auth/LogoutButton";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireAuth("admin");
  if (!guard.ok) {
    redirect(guard.status === 401 ? "/login" : "/dashboard");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:py-10">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="mb-2 flex items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <p className="premium-kicker mb-1">MCQ AI</p>
          <h1 className="premium-title text-3xl font-bold tracking-tight">
            Administration
          </h1>
        </div>
        <LogoutButton />
      </header>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <AdminSidebar />
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
