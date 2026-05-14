import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/server";
import LogoutButton from "@/components/auth/LogoutButton";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8 md:py-10">
      <div className="premium-panel p-6 md:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="premium-kicker">Learner Workspace</p>
            <h1 className="premium-title mt-1 text-3xl font-bold tracking-tight">User Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Welcome, {user.name} ({user.phone})</p>
          </div>
          <LogoutButton />
        </div>
      </div>
      <div className="premium-panel p-6 md:p-7">
        <ChangePasswordForm />
      </div>
    </main>
  );
}
