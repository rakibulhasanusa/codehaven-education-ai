import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getExamMeta } from "@/lib/quiz";
import { getExamStatus } from "@/lib/exam-status";
import { ClipboardList, Plus, Timer, Radio, Trash2 } from "lucide-react";
import { DeleteQuizButton } from "./DeleteQuizButton";

export const dynamic = "force-dynamic";

// ── status styles ─────────────────────────────────────────────────────────────
const statusConfig = {
  live: {
    label: "Live",
    badge: "default" as const,
    dot: "bg-emerald-500",
    pulse: true,
  },
  upcoming: {
    label: "Upcoming",
    badge: "outline" as const,
    dot: "bg-amber-400",
    pulse: false,
  },
  closed: {
    label: "Closed",
    badge: "secondary" as const,
    dot: "bg-muted-foreground/40",
    pulse: false,
  },
  deleted: {
    label: "Deleted",
    badge: "secondary" as const,
    dot: "bg-muted-foreground/30",
    pulse: false,
  },
};

export default async function AdminQuizzesPage() {
  const quizzes = await getExamMeta();
  const now = new Date();

  const liveCnt     = quizzes.filter((q) => getExamStatus(q, now) === "live").length;
  const upcomingCnt = quizzes.filter((q) => getExamStatus(q, now) === "upcoming").length;
  const deletedCnt   = quizzes.filter((q) => q.isPublished === 0).length;

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-primary/8 shadow-sm">
            <ClipboardList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Quizzes</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Track timing and open status from one place.
            </p>
          </div>
        </div>

        <Button asChild size="sm" className="gap-1.5">
          <Link href="/admin/quizzes/create">
            <Plus className="h-4 w-4" />
            Create Quiz
          </Link>
        </Button>
      </div>

      {/* ── Quick stats ─────────────────────────────────────────── */}
      {quizzes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total",    value: quizzes.length, icon: ClipboardList, color: "text-primary"          },
            { label: "Live",     value: liveCnt,        icon: Radio,         color: "text-emerald-600"      },
            { label: "Upcoming", value: upcomingCnt,    icon: Timer,         color: "text-amber-600"        },
            { label: "Deleted",  value: deletedCnt,     icon: Trash2,        color: "text-muted-foreground" },
          ].map(({ label, value, icon: Icon, color }, index) => (
            <div key={`${label}-${index}`} className="premium-panel flex items-center gap-3 rounded-xl px-4 py-3">
              <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              <div>
                <p className="tabular-nums text-lg font-bold leading-none">{value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table card ──────────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <tr>
                {["Title", "Subject", "Topic", "Status", "Timing", "Duration", "Action"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No quizzes yet.{" "}
                    <Link href="/admin/quizzes/create" className="text-primary underline-offset-2 hover:underline">
                      Create one
                    </Link>
                    .
                  </td>
                </tr>
              ) : (
                quizzes.map((q) => {
                  const status = q.isPublished === 0 ? "deleted" : getExamStatus(q, now);
                  const sc = statusConfig[status] ?? statusConfig.closed;

                  return (
                    <tr key={q.id} className="group align-middle transition-colors hover:bg-muted/30">
                      {/* Title */}
                      <td className="px-4 py-3 font-medium text-foreground">
                        {q.title}
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[11px] font-normal">
                          {q.subjectName}
                        </Badge>
                      </td>

                      {/* Topic */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {q.topic ?? <span className="text-muted-foreground/40">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`relative flex h-2 w-2 shrink-0`}>
                            {sc.pulse && (
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            )}
                            <span className={`relative inline-flex h-2 w-2 rounded-full ${sc.dot}`} />
                          </span>
                          <Badge variant={sc.badge} className="text-[11px]">
                            {sc.label}
                          </Badge>
                        </span>
                      </td>

                      {/* Timing mode */}
                      <td className="px-4 py-3 text-muted-foreground">
                        {q.timingMode === "fixed_end_time" ? "Fixed end" : "Full duration"}
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Timer className="h-3 w-3 shrink-0" />
                            <span className="tabular-nums">{q.durationMinutes} min</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {q.isPublished === 0 ? (
                          <span className="text-xs text-muted-foreground">Deleted</span>
                        ) : (
                          <DeleteQuizButton quizId={q.id} quizTitle={q.title} />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
