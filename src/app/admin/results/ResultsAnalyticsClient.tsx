"use client";

import { useMemo } from "react";
import {
  AreaChart,
  BarChart,
  EmbeddingVisualization,
  ForceDirectedGraph,
  LineChart,
  PieChart,
  RealtimeChart,
} from "@/components/charts/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ChartPoint, GraphLink, GraphNode, PieSlice } from "@/lib/charts/chart-utils";

export type ResultAnalyticsRow = {
  id: string;
  learnerName: string;
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  totalQuestions: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
  status: string;
  createdAt: string;
  examTitle: string;
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function formatTime(seconds: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Accuracy badge ────────────────────────────────────────────────────────────
function AccuracyPill({ value }: { value: number }) {
  const good = value >= 70;
  const mid = value >= 40;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
      style={{
        background: good
          ? "oklch(0.67 0.13 165 / 0.12)"
          : mid
            ? "oklch(0.72 0.15 78 / 0.14)"
            : "oklch(0.577 0.245 27.325 / 0.1)",
        color: good
          ? "oklch(0.38 0.13 168)"
          : mid
            ? "oklch(0.42 0.14 75)"
            : "oklch(0.45 0.22 27)",
      }}
    >
      {value}%
    </span>
  );
}

// ─── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const submitted = status === "submitted";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.67rem] font-semibold uppercase tracking-wider"
      style={{
        background: submitted ? "oklch(0.67 0.13 165 / 0.1)" : "oklch(0.72 0.15 78 / 0.12)",
        color: submitted ? "oklch(0.38 0.13 168)" : "oklch(0.46 0.14 75)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: submitted ? "oklch(0.55 0.13 165)" : "oklch(0.62 0.14 78)",
        }}
      />
      {status}
    </span>
  );
}

// ─── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="premium-stat flex flex-col gap-1 transition-shadow duration-200 hover:shadow-md"
      style={
        accent
          ? {
              background: "linear-gradient(135deg, oklch(0.49 0.17 250 / 0.08), oklch(0.49 0.17 250 / 0.03))",
              borderColor: "oklch(0.49 0.17 250 / 0.25)",
            }
          : undefined
      }
    >
      <span className="premium-kicker">{label}</span>
      <span
        className="text-2xl font-bold tracking-tight tabular-nums"
        style={{ color: accent ? "oklch(0.42 0.18 252)" : "var(--foreground)" }}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

// ─── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-0.5">
      <span className="premium-kicker">{kicker}</span>
      <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
        {title}
      </h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border/60" />
      <span className="premium-kicker whitespace-nowrap text-[0.65rem]">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

// ─── Chart wrapper ─────────────────────────────────────────────────────────────
function ChartCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`premium-panel overflow-hidden transition-shadow duration-200 hover:shadow-lg ${className}`}>
      {children}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ResultsAnalyticsClient({ results }: { results: ResultAnalyticsRow[] }) {
  const analytics = useMemo(() => {
    const submitted = results.filter((row) => row.status === "submitted");
    const chronological = [...submitted].reverse();
    const latest = submitted.slice(0, 20);

    const trend: ChartPoint[] = chronological.slice(-24).map((row) => ({
      label: formatDateLabel(row.createdAt),
      value: row.accuracyPercent,
    }));

    const examMap = new Map<string, ResultAnalyticsRow[]>();
    const dayMap = new Map<string, number>();
    submitted.forEach((row) => {
      examMap.set(row.examTitle, [...(examMap.get(row.examTitle) ?? []), row]);
      const key = formatDateLabel(row.createdAt);
      dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
    });

    const examBars: ChartPoint[] = Array.from(examMap.entries())
      .map(([label, rows]) => ({ label, value: average(rows.map((r) => r.accuracyPercent)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const realtime: ChartPoint[] = Array.from(dayMap.entries()).map(([label, value]) => ({ label, value }));

    const distribution: PieSlice[] = [
      { label: "Correct", value: submitted.reduce((s, r) => s + r.correct, 0) },
      { label: "Wrong", value: submitted.reduce((s, r) => s + r.wrong, 0) },
      { label: "Skipped", value: submitted.reduce((s, r) => s + r.skipped, 0) },
    ];

    const topLearners = [...submitted].sort((a, b) => b.score - a.score).slice(0, 8);
    const graphNodes: GraphNode[] = [
      ...Array.from(examMap.keys())
        .slice(0, 6)
        .map((exam) => ({ id: `exam:${exam}`, label: exam, group: "Exam", value: examMap.get(exam)?.length ?? 0 })),
      ...topLearners.map((row) => ({
        id: `learner:${row.id}`,
        label: row.learnerName,
        group: "Learner",
        value: row.score,
      })),
    ];
    const graphLinks: GraphLink[] = topLearners.map((row) => ({
      source: `learner:${row.id}`,
      target: `exam:${row.examTitle}`,
      value: Math.max(1, Math.round(row.accuracyPercent / 35)),
    }));
    const embeddingNodes: GraphNode[] = submitted.slice(0, 80).map((row) => ({
      id: row.id,
      label: row.learnerName,
      group: row.examTitle,
      value: row.accuracyPercent,
    }));

    const totalCorrect = submitted.reduce((s, r) => s + r.correct, 0);
    const totalAnswered = submitted.reduce((s, r) => s + r.correct + r.wrong + r.skipped, 0);
    const overallAccuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const avgTime = average(submitted.map((r) => r.timeTakenSeconds));

    return {
      submitted,
      latest,
      trend,
      examBars,
      realtime,
      distribution,
      graphNodes,
      graphLinks,
      embeddingNodes,
      averageAccuracy: average(submitted.map((r) => r.accuracyPercent)),
      bestScore: Math.max(0, ...submitted.map((r) => r.score)),
      overallAccuracy,
      avgTime,
      totalExams: examMap.size,
    };
  }, [results]);

  return (
    <div className="space-y-7">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="premium-panel overflow-hidden">
        <div
          className="h-1 w-full"
          style={{
            background:
              "linear-gradient(90deg, oklch(0.67 0.13 165), oklch(0.49 0.17 250), oklch(0.72 0.15 78))",
          }}
        />
        <div className="p-6 pb-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[0.7rem] font-semibold uppercase tracking-wider">
                  Result Intelligence
                </Badge>
                <Badge
                  className="text-[0.7rem] font-semibold"
                  style={{
                    background: "oklch(0.67 0.13 165 / 0.12)",
                    color: "oklch(0.38 0.13 168)",
                    borderColor: "oklch(0.67 0.13 165 / 0.25)",
                  }}
                >
                  Live
                </Badge>
              </div>
              <h1 className="premium-title text-4xl font-extrabold tracking-tight lg:text-5xl">
                Results Analytics
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Live exam performance, answer distribution, score momentum, and learner–exam
                relationship mapping — all from submitted attempts.
              </p>
            </div>
            <div
              className="rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground"
              style={{ background: "rgb(255 255 255 / 0.6)" }}
            >
              {analytics.submitted.length} attempts indexed
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard label="Attempts" value={analytics.submitted.length} sub="submitted" accent />
            <StatCard label="Avg Accuracy" value={`${analytics.averageAccuracy}%`} sub="per attempt" />
            <StatCard label="Best Score" value={analytics.bestScore} sub="individual high" />
            <StatCard label="Overall Accuracy" value={`${analytics.overallAccuracy}%`} sub="correct / total" />
            <StatCard label="Avg Time" value={formatTime(analytics.avgTime)} sub={`${analytics.totalExams} exams`} />
          </div>
        </div>
      </div>

      {/* ── Trend + exam performance ─────────────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Performance"
          title="Score Trend & Exam Difficulty"
          description="Accuracy over time and per-exam averages across all submitted attempts."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard>
            <LineChart data={analytics.trend} title="Accuracy Trend" subtitle="Submitted attempts over time" valueLabel="accuracy" />
          </ChartCard>
          <ChartCard>
            <BarChart data={analytics.examBars} title="Exam Performance" subtitle="Average accuracy by exam" valueLabel="avg accuracy" />
          </ChartCard>
        </div>
      </section>

      <Divider label="Answer Quality & Submission Flow" />

      {/* ── Distribution + area + realtime ───────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Answer Quality"
          title="Distribution, Momentum & Submission Volume"
          description="How learners answered, score momentum, and daily submission cadence."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard>
            <PieChart data={analytics.distribution} title="Answer Distribution" subtitle="Correct, wrong, and skipped answers" />
          </ChartCard>
          <ChartCard>
            <AreaChart data={analytics.trend} title="Performance Area" subtitle="Recent score momentum" valueLabel="accuracy" />
          </ChartCard>
          <ChartCard className="xl:col-span-2">
            <RealtimeChart data={analytics.realtime} title="Realtime Submission Flow" subtitle="Daily attempt volume" />
          </ChartCard>
        </div>
      </section>

      <Divider label="AI Relationship Mapping" />

      {/* ── Graphs ───────────────────────────────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Relationship Mapping"
          title="Learner × Exam Graph & Embedding Clusters"
          description="Force-directed connections between learners and their exams, plus performance cluster projections."
        />
        <div className="grid gap-5">
          <ChartCard>
            <EmbeddingVisualization nodes={analytics.embeddingNodes} title="Embedding Visualization" subtitle="Learner attempts projected into stable SVG clusters" />
          </ChartCard>
          <ChartCard>
            <ForceDirectedGraph nodes={analytics.graphNodes} links={analytics.graphLinks} title="AI Relationship Graph" subtitle="Learners connected to exams by performance" />
          </ChartCard>
        </div>
      </section>

      <Divider label="Latest Submissions" />

      {/* ── Results table ─────────────────────────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Recent Activity"
          title="Latest Results"
          description="The 20 most recently submitted quiz attempts."
        />

        <div className="premium-panel overflow-hidden">
          {/* Table header accent */}
          <div
            className="px-5 py-3"
            style={{
              background:
                "linear-gradient(90deg, oklch(0.49 0.17 250 / 0.05), oklch(0.67 0.13 165 / 0.04))",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Submission Log</span>
              <span className="text-xs text-muted-foreground">
                Showing {Math.min(analytics.latest.length, 20)} of {analytics.submitted.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Learner", "Exam", "Score", "Accuracy", "Time", "Status"].map((h) => (
                    <TableHead
                      key={h}
                      className="text-[0.7rem] font-bold uppercase tracking-wider"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {analytics.latest.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No submitted results found.
                    </TableCell>
                  </TableRow>
                ) : (
                  analytics.latest.map((row, i) => (
                    <TableRow
                      key={row.id}
                      className="transition-colors duration-100 hover:bg-muted/40"
                      style={
                        i % 2 === 0
                          ? { background: "rgb(255 255 255 / 0.45)" }
                          : { background: "transparent" }
                      }
                    >
                      <TableCell className="font-semibold">{row.learnerName}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {row.examTitle}
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums font-bold">{row.score}</span>
                      </TableCell>
                      <TableCell>
                        <AccuracyPill value={row.accuracyPercent} />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatTime(row.timeTakenSeconds)}
                      </TableCell>
                      <TableCell>
                        <StatusPill status={row.status} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <p className="pb-2 text-center text-xs text-muted-foreground/60">
        Analytics derived from {analytics.submitted.length} submitted attempts across{" "}
        {analytics.totalExams} exams.
      </p>
    </div>
  );
}