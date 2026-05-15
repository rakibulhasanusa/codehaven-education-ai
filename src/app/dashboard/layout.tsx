import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";
import UserBaseNavbar from "@/components/navbars/user-base-navbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const guard = await requireAuth("user");
  if (!guard.ok) {
    redirect(guard.status === 401 ? "/login" : "/admin");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:py-10">
      <UserBaseNavbar userName={guard.user.name} />
      <section className="min-w-0">{children}</section>
    </main>
  );
}
