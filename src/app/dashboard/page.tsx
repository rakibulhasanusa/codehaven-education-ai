import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/server";
import LogoutButton from "@/components/auth/LogoutButton";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Wifi } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const initials =
    user.name
      ?.split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "U";

  return (
    <main className="relative mx-auto w-full max-w-4xl space-y-6 px-4 py-10 md:py-14">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-28 left-1/2 -z-10 h-80 w-80 -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, oklch(0.62 0.18 250 / 0.22) 0%, transparent 70%)",
          filter: "blur(56px)",
        }}
      />

      {/* ── Profile Card ───────────────────────────────── */}
      <Card className="premium-panel overflow-hidden border-0 p-0 shadow-none">
        {/* Animated top bar */}
        <div
          className="h-[3px] w-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.49 0.17 250), oklch(0.62 0.13 165), oklch(0.72 0.15 78), oklch(0.49 0.17 250))",
            backgroundSize: "300% 100%",
            animation: "shimmer 3.5s linear infinite",
          }}
        />

        <CardHeader className="p-0">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            {/* Avatar + identity */}
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-extrabold text-white"
                style={{
                  background:
                    "linear-gradient(145deg, oklch(0.55 0.18 250), oklch(0.45 0.17 260))",
                  boxShadow: "0 8px 24px -8px oklch(0.49 0.17 250 / 0.55)",
                }}
              >
                {initials}
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white"
                  style={{ background: "oklch(0.67 0.13 165)" }}
                />
              </div>

              <div>
                <p className="premium-kicker mb-0.5">Learner Workspace</p>
                <h1 className="premium-title text-2xl font-extrabold tracking-tight md:text-[1.75rem]">
                  {user.name}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Wifi
                    className="h-3.5 w-3.5"
                    style={{ color: "oklch(0.67 0.13 165)" }}
                  />
                  {user.phone}
                </p>
              </div>
            </div>

            {/* Badges + logout */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant="secondary"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "oklch(0.49 0.17 250 / 0.1)",
                  color: "oklch(0.38 0.15 250)",
                  border: "1px solid oklch(0.49 0.17 250 / 0.2)",
                }}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                BCS Candidate
              </Badge>

              <Badge
                variant="secondary"
                className="gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: "oklch(0.67 0.13 165 / 0.12)",
                  color: "oklch(0.35 0.1 165)",
                  border: "1px solid oklch(0.67 0.13 165 / 0.22)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "oklch(0.67 0.13 165)" }}
                />
                Active
              </Badge>

              <LogoutButton />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Security Card ──────────────────────────────── */}
      <Card className="premium-panel border-0 shadow-none">
        <CardContent className="p-6 md:p-8">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}