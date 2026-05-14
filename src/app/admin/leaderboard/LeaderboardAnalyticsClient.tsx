"use client";

import { useMemo } from "react";
import {
  AreaChart,
  BarChart,
  EmbeddingVisualization,
  ForceDirectedGraph,
  LineChart,
  PieChart,
} from "@/components/charts/analytics-charts";
import { Badge } from "@/components/ui/badge";
import type { ChartPoint, GraphLink, GraphNode, PieSlice } from "@/lib/charts/chart-utils";

export type LeaderboardAttempt = {
  id: string;
  learnerName: string;
  examTitle: string;
  score: number;
  accuracyPercent: number;
  correct: number;
  wrong: number;
  skipped: number;
  timeTakenSeconds: number;
  createdAt: string;
};

export type QuestionInsight = {
  question: string;
  count: number;
};

function labelDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function avg(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
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
              background:
                "linear-gradient(135deg, oklch(0.49 0.17 250 / 0.08), oklch(0.49 0.17 250 / 0.03))",
              borderColor: "oklch(0.49 0.17 250 / 0.25)",
            }
          : undefined
      }
    >
      <span className="premium-kicker">{label}</span>
      <span
        className="text-2xl font-bold tracking-tight"
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

// ─── Chart wrapper card ────────────────────────────────────────────────────────
function ChartCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`premium-panel overflow-hidden transition-shadow duration-200 hover:shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border/60" />
      <span className="premium-kicker whitespace-nowrap text-[0.65rem]">{label}</span>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function LeaderboardAnalyticsClient({
  attempts,
  mostFailed,
  mostCorrect,
}: {
  attempts: LeaderboardAttempt[];
  mostFailed: QuestionInsight | null;
  mostCorrect: QuestionInsight | null;
}) {
  const analytics = useMemo(() => {
    const top = [...attempts]
      .sort((a, b) => b.score - a.score || b.accuracyPercent - a.accuracyPercent)
      .slice(0, 12);

    const trend: ChartPoint[] = [...attempts]
      .reverse()
      .slice(-24)
      .map((a) => ({ label: labelDate(a.createdAt), value: a.score }));

    const leaderboardBars: ChartPoint[] = top
      .slice(0, 8)
      .map((a) => ({ label: a.learnerName, value: a.score }));

    const answerMix: PieSlice[] = [
      { label: "Correct", value: attempts.reduce((s, r) => s + r.correct, 0) },
      { label: "Wrong", value: attempts.reduce((s, r) => s + r.wrong, 0) },
      { label: "Skipped", value: attempts.reduce((s, r) => s + r.skipped, 0) },
    ];

    const examMap = new Map<string, LeaderboardAttempt[]>();
    attempts.forEach((a) => examMap.set(a.examTitle, [...(examMap.get(a.examTitle) ?? []), a]));

    const examArea: ChartPoint[] = Array.from(examMap.entries()).map(([label, rows]) => ({
      label,
      value: avg(rows.map((r) => r.accuracyPercent)),
    }));

    const examNodes: GraphNode[] = Array.from(examMap.keys())
      .slice(0, 7)
      .map((exam) => ({
        id: `exam:${exam}`,
        label: exam,
        group: "Exam",
        value: examMap.get(exam)?.length ?? 0,
      }));

    const learnerNodes: GraphNode[] = top.slice(0, 10).map((a) => ({
      id: `learner:${a.id}`,
      label: a.learnerName,
      group: "Top Learner",
      value: a.score,
    }));

    const graphLinks: GraphLink[] = top.slice(0, 10).map((a) => ({
      source: `learner:${a.id}`,
      target: `exam:${a.examTitle}`,
      value: Math.max(1, Math.round(a.accuracyPercent / 35)),
    }));

    const embeddingNodes: GraphNode[] = attempts.slice(0, 90).map((a) => ({
      id: a.id,
      label: a.learnerName,
      group: a.examTitle,
      value: a.accuracyPercent,
    }));

    const totalCorrect = attempts.reduce((s, r) => s + r.correct, 0);
    const totalAnswered = attempts.reduce((s, r) => s + r.correct + r.wrong + r.skipped, 0);
    const overallAccuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
    const avgTime = avg(attempts.map((a) => a.timeTakenSeconds));

    return {
      top,
      trend,
      leaderboardBars,
      answerMix,
      examArea,
      graphNodes: [...examNodes, ...learnerNodes],
      graphLinks,
      embeddingNodes,
      totalParticipants: attempts.length,
      averageScore: avg(attempts.map((a) => a.score)),
      highestScore: Math.max(0, ...attempts.map((a) => a.score)),
      overallAccuracy,
      avgTime,
      totalExams: examMap.size,
    };
  }, [attempts]);

  return (
    <div className="space-y-7">
      {/* ── Hero header ─────────────────────────────────────────────── */}
      <div className="premium-panel overflow-hidden">
        {/* Top accent bar */}
        <div
          className="h-1 w-full"
          style={{
            background: "linear-gradient(90deg, oklch(0.49 0.17 250), oklch(0.67 0.13 165), oklch(0.72 0.15 78))",
          }}
        />

        <div className="p-6 pb-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[0.7rem] font-semibold uppercase tracking-wider">
                  Intelligence
                </Badge>
                <Badge
                  variant="secondary"
                  className="text-[0.7rem] font-semibold"
                  style={{
                    background: "oklch(0.49 0.17 250 / 0.1)",
                    color: "oklch(0.42 0.18 252)",
                    borderColor: "oklch(0.49 0.17 250 / 0.2)",
                  }}
                >
                  Live
                </Badge>
              </div>
              <h1 className="premium-title text-4xl font-extrabold tracking-tight lg:text-5xl">
                Leaderboard Analytics
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Rank movement, answer quality, force-directed relationships, and AI topic signal
                clusters — all in one view.
              </p>
            </div>

            {/* Quick action / timestamp pill */}
            <div
              className="rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground"
              style={{ background: "rgb(255 255 255 / 0.6)" }}
            >
              {analytics.totalParticipants} submissions indexed
            </div>
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Participants"
              value={analytics.totalParticipants}
              sub="submitted attempts"
              accent
            />
            <StatCard
              label="Avg Score"
              value={analytics.averageScore}
              sub="across all exams"
            />
            <StatCard
              label="Highest Score"
              value={analytics.highestScore}
              sub="personal best"
            />
            <StatCard
              label="Overall Accuracy"
              value={`${analytics.overallAccuracy}%`}
              sub="correct / total"
            />
            <StatCard
              label="Avg Time Taken"
              value={formatTime(analytics.avgTime)}
              sub={`${analytics.totalExams} exams`}
            />
          </div>
        </div>
      </div>

      {/* ── Performance charts ───────────────────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Performance"
          title="Score Distribution & Trends"
          description="Top performers and score trajectory over the latest submissions."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard>
            <BarChart
              data={analytics.leaderboardBars}
              title="Top Scores"
              subtitle="Highest submitted exam scores"
              valueLabel="score"
            />
          </ChartCard>
          <ChartCard>
            <LineChart
              data={analytics.trend}
              title="Score Trend"
              subtitle="Latest 24 submitted attempts"
              valueLabel="score"
            />
          </ChartCard>
        </div>
      </section>

      <Divider label="Answer Quality & Exam Intelligence" />

      {/* ── Answer mix + exam difficulty ─────────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Answer Quality"
          title="Response Mix & Exam Difficulty"
          description="How learners answered and which exams challenged them most."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ChartCard>
            <PieChart
              data={analytics.answerMix}
              title="Answer Mix"
              subtitle="Correct, wrong, and skipped totals"
            />
          </ChartCard>
          <ChartCard>
            <AreaChart
              data={analytics.examArea}
              title="Exam Difficulty Signal"
              subtitle="Average accuracy by exam"
              valueLabel="accuracy"
            />
          </ChartCard>
        </div>
      </section>

      <Divider label="AI Relationship Mapping" />

      {/* ── Relationship graphs ───────────────────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Relationship Mapping"
          title="Learner × Exam Graph & Embedding Clusters"
          description="Force-directed connections between top learners and their attempted exams. Embedding clusters reveal hidden performance patterns."
        />
        <div className="grid gap-5">
          <ChartCard>
            <ForceDirectedGraph
              nodes={analytics.graphNodes}
              links={analytics.graphLinks}
              title="Force Directed Graph"
              subtitle="Top learners connected with attempted exams"
            />
          </ChartCard>
          <ChartCard>
            <EmbeddingVisualization
              nodes={analytics.embeddingNodes}
              title="Embedding Visualization"
              subtitle="Attempt clusters by exam and performance"
            />
          </ChartCard>
        </div>
      </section>

      <Divider label="Question Signal Intelligence" />

      {/* ── Question insights ─────────────────────────────────────────── */}
      <section>
        <SectionHeading
          kicker="Question Signals"
          title="Strongest & Weakest Topics"
          description="Pinpoint which questions are trip-wires and which ones learners have mastered."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {/* Most Failed */}
          <div
            className="premium-panel group relative overflow-hidden transition-shadow duration-200 hover:shadow-lg"
            style={{ borderColor: "oklch(0.577 0.245 27.325 / 0.3)" }}
          >
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(ellipse at 10% 50%, oklch(0.577 0.245 27.325 / 0.06), transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <Badge
                  variant="destructive"
                  className="text-[0.68rem] font-bold uppercase tracking-widest"
                >
                  Weakest Signal
                </Badge>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold"
                  style={{
                    background: "oklch(0.577 0.245 27.325 / 0.1)",
                    color: "oklch(0.45 0.22 27)",
                  }}
                >
                  Most Failed
                </span>
              </div>
              <h3 className="mb-1 text-base font-bold text-foreground">Top Failed Question</h3>
              <p className="mb-4 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">
                {mostFailed?.question ?? "No wrong answers recorded yet."}
              </p>
              <div className="flex items-end gap-2">
                <span
                  className="text-5xl font-extrabold tabular-nums tracking-tighter"
                  style={{ color: "oklch(0.52 0.22 27)" }}
                >
                  {mostFailed?.count ?? 0}
                </span>
                <span className="mb-1.5 text-sm text-muted-foreground">failed attempts</span>
              </div>
            </div>
          </div>

          {/* Most Correct */}
          <div
            className="premium-panel group relative overflow-hidden transition-shadow duration-200 hover:shadow-lg"
            style={{ borderColor: "oklch(0.67 0.13 165 / 0.35)" }}
          >
            <div
              className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  "radial-gradient(ellipse at 10% 50%, oklch(0.67 0.13 165 / 0.08), transparent 60%)",
                pointerEvents: "none",
              }}
            />
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <Badge
                  className="text-[0.68rem] font-bold uppercase tracking-widest"
                  style={{
                    background: "oklch(0.67 0.13 165 / 0.15)",
                    color: "oklch(0.42 0.14 168)",
                    borderColor: "oklch(0.67 0.13 165 / 0.3)",
                  }}
                >
                  Strongest Signal
                </Badge>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold"
                  style={{
                    background: "oklch(0.67 0.13 165 / 0.1)",
                    color: "oklch(0.42 0.14 168)",
                  }}
                >
                  Most Correct
                </span>
              </div>
              <h3 className="mb-1 text-base font-bold text-foreground">Top Correct Question</h3>
              <p className="mb-4 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">
                {mostCorrect?.question ?? "No correct answers recorded yet."}
              </p>
              <div className="flex items-end gap-2">
                <span
                  className="text-5xl font-extrabold tabular-nums tracking-tighter"
                  style={{ color: "oklch(0.42 0.14 168)" }}
                >
                  {mostCorrect?.count ?? 0}
                </span>
                <span className="mb-1.5 text-sm text-muted-foreground">correct answers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer note ──────────────────────────────────────────────── */}
      <p className="pb-2 text-center text-xs text-muted-foreground/60">
        Analytics derived from the latest {analytics.totalParticipants} submitted attempts across{" "}
        {analytics.totalExams} exams.
      </p>
    </div>
  );
}