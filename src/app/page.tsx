import Link from "next/link";
import { getAuthUser } from "@/lib/auth/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const metrics = [
  { label: "Practice Questions", value: "50K+" },
  { label: "Active Learners", value: "12K+" },
  { label: "Avg Completion", value: "89%" },
  { label: "Weekly Attempts", value: "90K+" },
];

const features = [
  {
    title: "Smart Exam Engine",
    desc: "Timed exams with live ranking, anti-cheat controls, and exam-window logic.",
  },
  {
    title: "Insightful Analytics",
    desc: "See score trends, weak subjects, answer quality, and focused improvement paths.",
  },
  {
    title: "Role-Based Workspaces",
    desc: "Separate premium experiences for visitors, learners, and administrators.",
  },
];

const flows = [
  { step: "01", title: "Create / Publish", text: "Admins build exam sets, assign timings, and publish controlled sessions." },
  { step: "02", title: "Attempt / Track", text: "Users take smart exams, submit on timer, and get instant ranking + result review." },
  { step: "03", title: "Analyze / Improve", text: "Performance signals reveal weak subjects, topic mistakes, and next actions." },
];

export default async function Home() {
  const user = await getAuthUser();
  const isAdmin = user?.role === "admin";

  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-72 w-[70rem] blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.67 0.13 165 / 0.22), transparent 60%)",
        }}
      />

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 md:pt-12">
        <div className="premium-panel overflow-hidden rounded-3xl p-6 sm:p-8 md:p-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Badge variant="outline" className="text-[0.7rem] font-semibold uppercase tracking-wider">
              MCQ AI Platform
            </Badge>
            <div className="flex items-center gap-2">
              {!user ? (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href="/smart-exam">Start Practice</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                  {isAdmin ? (
                    <Button asChild size="sm">
                      <Link href="/admin">Admin Panel</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link href="/exam">Live Exams</Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <h1 className="premium-title max-w-4xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Premium Exam SaaS for Smart Practice, Live Ranking, and Performance Growth
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Modern exam operations with role-based workspaces, powerful analytics, and clean
            professional workflows for learners and admins.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <div key={m.label} className="premium-stat rounded-xl border border-border/60 bg-background/75 p-4">
                <p className="text-2xl font-black tabular-nums">{m.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="premium-panel rounded-2xl p-5">
              <p className="premium-kicker mb-2">Feature</p>
              <h2 className="text-lg font-bold">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="premium-panel rounded-3xl p-6 sm:p-8">
          <p className="premium-kicker mb-3">How It Works</p>
          <div className="grid gap-4 md:grid-cols-3">
            {flows.map((flow) => (
              <div key={flow.step} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-xs font-bold tracking-widest text-primary">{flow.step}</p>
                <h3 className="mt-1 text-lg font-bold">{flow.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{flow.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="premium-panel rounded-2xl p-6">
            <p className="premium-kicker mb-2">For Learners</p>
            <h2 className="text-2xl font-bold tracking-tight">Focused User Workspace</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Personalized dashboard, smart-exam practice, result review, and leaderboard participation.
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm"><Link href="/dashboard">Open Dashboard</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/smart-exam">Try Smart Exam</Link></Button>
            </div>
          </div>
          <div className="premium-panel rounded-2xl p-6">
            <p className="premium-kicker mb-2">For Admins</p>
            <h2 className="text-2xl font-bold tracking-tight">Advanced Control Center</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Question bank management, user administration, exam lifecycle controls, and deep analytics.
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild size="sm"><Link href="/admin">Go To Admin Panel</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/admin/quizzes/create">Create Quiz</Link></Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
