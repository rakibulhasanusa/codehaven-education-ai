import { AdminSidebar } from "@/components/admin/sidebar";
import LogoutButton from "@/components/auth/LogoutButton";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:py-8">
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="premium-kicker">MCQ AI</p>
          <h1 className="premium-title mt-1 text-3xl font-bold tracking-tight">Administration</h1>
        </div>
        <div className="sm:self-start">
          <LogoutButton />
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminSidebar />
        <section className="flex-1 min-w-0">{children}</section>
      </div>
    </main>
  );
}
