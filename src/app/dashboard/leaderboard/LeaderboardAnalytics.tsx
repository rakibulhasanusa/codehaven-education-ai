"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AreaChart,
  BarChart,
  EmbeddingVisualization,
  ForceDirectedGraph,
  LineChart,
  PieChart,
} from "@/components/charts/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export type Period = "daily" | "weekly" | "monthly" | "all";
export type ExamOption = { id: number; title: string };

function avg(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function bucketedTrend(attempts: LeaderboardAttempt[]) {
  const byDay = new Map<string, number[]>();
  attempts.forEach((a) => {
    const date = new Date(a.createdAt);
    const key = Number.isNaN(date.getTime())
      ? "Unknown"
      : new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(date);
    byDay.set(key, [...(byDay.get(key) ?? []), a.score]);
  });
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([day, scores]) => ({ label: day.slice(5), value: avg(scores) }));
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
  fullscreenContent,
  fullscreenTitle = "Chart",
}: {
  children: React.ReactNode;
  className?: string;
  fullscreenContent?: React.ReactNode;
  fullscreenTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        className={`premium-panel relative overflow-hidden transition-shadow duration-200 hover:shadow-lg ${className}`}
      >
        {fullscreenContent ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="absolute right-3 top-3 z-10 h-8 w-8 bg-background/80 backdrop-blur"
                aria-label={`Open ${fullscreenTitle} in fullscreen`}
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[96vw] p-4 sm:max-w-[92vw]">
              <DialogHeader>
                <DialogTitle>{fullscreenTitle}</DialogTitle>
              </DialogHeader>
              <div className="max-h-[84vh] overflow-auto">{fullscreenContent}</div>
            </DialogContent>
          </Dialog>
        ) : null}
        {children}
      </div>
    </>
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

function InsightCard({
  title,
  label,
  badge,
  description,
  count,
  accentStyle,
  glowStyle,
  valueStyle,
}: {
  title: string;
  label: string;
  badge: React.ReactNode;
  description: string;
  count: number;
  accentStyle: React.CSSProperties;
  glowStyle: React.CSSProperties;
  valueStyle: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="premium-panel group relative overflow-hidden transition-shadow duration-200 hover:shadow-lg"
      style={accentStyle}
    >
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ ...glowStyle, pointerEvents: "none" }}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="absolute right-3 top-3 z-10 h-8 w-8 bg-background/80 backdrop-blur"
            aria-label={`Open ${title} in fullscreen`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[96vw] p-4 sm:max-w-[92vw]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="premium-panel p-6">
            <div className="mb-3 flex items-center justify-between">{badge}</div>
            <h3 className="mb-2 text-xl font-bold text-foreground">{label}</h3>
            <p className="mb-6 text-base leading-relaxed text-muted-foreground">{description}</p>
            <div className="text-6xl font-extrabold tabular-nums tracking-tighter" style={valueStyle}>
              {count}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">{badge}</div>
        <h3 className="mb-1 text-base font-bold text-foreground">{label}</h3>
        <p className="mb-4 min-h-[2.5rem] text-sm leading-relaxed text-muted-foreground">{description}</p>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-extrabold tabular-nums tracking-tighter" style={valueStyle}>
            {count}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function LeaderboardAnalyticsClient({
  attempts,
  mostFailed,
  mostCorrect,
  period,
  examOptions,
  selectedExamId,
}: {
  attempts: LeaderboardAttempt[];
  mostFailed: QuestionInsight | null;
  mostCorrect: QuestionInsight | null;
  period: Period;
  examOptions: ExamOption[];
  selectedExamId: number | null;
}) {
  const [rankLimit, setRankLimit] = useState<100 | 200 | 500>(100);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateUrl(next: { period?: Period; examId?: number | null }) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next.period) params.set("period", next.period);
    if (next.examId) params.set("examId", String(next.examId));
    router.replace(`${pathname}?${params.toString()}`);
  }

  const analytics = useMemo(() => {
    const sortedByRank = [...attempts]
      .sort((a, b) => b.score - a.score || b.accuracyPercent - a.accuracyPercent)
      .slice(0, rankLimit);
    const top = sortedByRank.slice(0, 12);

    const trend: ChartPoint[] = bucketedTrend(attempts);

    const leaderboardBars: ChartPoint[] = top
      .slice(0, 15)
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

    const embeddingNodes: GraphNode[] = attempts.slice(0, 220).map((a) => ({
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
      rankedRows: sortedByRank,
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
  }, [attempts, rankLimit]);

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
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Rank Window:</span>
            <Button size="sm" variant={period === "daily" ? "default" : "outline"} onClick={() => updateUrl({ period: "daily" })}>Daily</Button>
            <Button size="sm" variant={period === "weekly" ? "default" : "outline"} onClick={() => updateUrl({ period: "weekly" })}>Weekly</Button>
            <Button size="sm" variant={period === "monthly" ? "default" : "outline"} onClick={() => updateUrl({ period: "monthly" })}>Monthly</Button>
            <Button size="sm" variant={period === "all" ? "default" : "outline"} onClick={() => updateUrl({ period: "all" })}>All Time</Button>
            <div className="ml-auto w-full sm:w-72">
              {examOptions.length > 0 ? (
                <Select
                  value={selectedExamId ? String(selectedExamId) : String(examOptions[0].id)}
                  onValueChange={(v) => updateUrl({ examId: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {examOptions.map((exam) => (
                      <SelectItem key={exam.id} value={String(exam.id)}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  No exams available
                </div>
              )}
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
          <ChartCard
            fullscreenTitle="Top Scores"
            fullscreenContent={
              <BarChart
                data={analytics.leaderboardBars}
                title="Top Scores"
                subtitle="Highest submitted exam scores"
                valueLabel="score"
                height={560}
              />
            }
          >
            <BarChart
              data={analytics.leaderboardBars}
              title="Top Scores"
              subtitle="Highest submitted exam scores"
              valueLabel="score"
            />
          </ChartCard>
          <ChartCard
            fullscreenTitle="Score Trend"
            fullscreenContent={
              <LineChart
                data={analytics.trend}
                title="Score Trend"
                subtitle="Daily average score (up to 30 days)"
                valueLabel="score"
                height={560}
              />
            }
          >
              <LineChart
                data={analytics.trend}
                title="Score Trend"
                subtitle="Daily average score (up to 30 days)"
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
          <ChartCard
            fullscreenTitle="Answer Mix"
            fullscreenContent={
              <PieChart
                data={analytics.answerMix}
                title="Answer Mix"
                subtitle="Correct, wrong, and skipped totals"
                height={560}
              />
            }
          >
            <PieChart
              data={analytics.answerMix}
              title="Answer Mix"
              subtitle="Correct, wrong, and skipped totals"
            />
          </ChartCard>
          <ChartCard
            fullscreenTitle="Exam Difficulty Signal"
            fullscreenContent={
              <AreaChart
                data={analytics.examArea}
                title="Exam Difficulty Signal"
                subtitle="Average accuracy by exam"
                valueLabel="accuracy"
                height={560}
              />
            }
          >
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
          <ChartCard
            fullscreenTitle="Force Directed Graph"
            fullscreenContent={
              <ForceDirectedGraph
                nodes={analytics.graphNodes}
                links={analytics.graphLinks}
                title="Force Directed Graph"
                subtitle="Top learners connected with attempted exams"
                height={620}
              />
            }
          >
            <ForceDirectedGraph
              nodes={analytics.graphNodes}
              links={analytics.graphLinks}
              title="Force Directed Graph"
              subtitle="Top learners connected with attempted exams"
            />
          </ChartCard>
          <ChartCard
            fullscreenTitle="Embedding Visualization"
            fullscreenContent={
              <EmbeddingVisualization
                nodes={analytics.embeddingNodes}
                title="Embedding Visualization"
                subtitle="Attempt clusters by exam and performance"
                height={620}
              />
            }
          >
            <EmbeddingVisualization
              nodes={analytics.embeddingNodes}
              title="Embedding Visualization"
              subtitle="Attempt clusters by exam and performance"
            />
          </ChartCard>
        </div>
      </section>

      <Divider label="Leaderboard Ranking" />

      <section>
        <SectionHeading
          kicker="Ranking"
          title={`Top ${rankLimit} Exam Performers`}
          description="Ranked by score first, then accuracy percentage."
        />
        <div className="mb-3 flex items-center justify-end">
          <Select value={String(rankLimit)} onValueChange={(v) => setRankLimit(Number(v) as 100 | 200 | 500)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">Top 100</SelectItem>
              <SelectItem value="200">Top 200</SelectItem>
              <SelectItem value="500">Top 500</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="premium-panel overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learner</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Exam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accuracy</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {analytics.rankedRows.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-semibold tabular-nums">#{idx + 1}</td>
                    <td className="px-4 py-3">{row.learnerName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.examTitle}</td>
                    <td className="px-4 py-3 tabular-nums">{row.score}</td>
                    <td className="px-4 py-3 tabular-nums">{row.accuracyPercent}%</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatTime(row.timeTakenSeconds)}</td>
                  </tr>
                ))}
                {analytics.rankedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No submitted attempts yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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
          <InsightCard
            title="Top Failed Question"
            label="Top Failed Question"
            description={mostFailed?.question ?? "No wrong answers recorded yet."}
            count={mostFailed?.count ?? 0}
            accentStyle={{ borderColor: "oklch(0.577 0.245 27.325 / 0.3)" }}
            glowStyle={{ background: "radial-gradient(ellipse at 10% 50%, oklch(0.577 0.245 27.325 / 0.06), transparent 60%)" }}
            valueStyle={{ color: "oklch(0.52 0.22 27)" }}
            badge={
              <>
                <Badge variant="destructive" className="text-[0.68rem] font-bold uppercase tracking-widest">Weakest Signal</Badge>
                <span className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold" style={{ background: "oklch(0.577 0.245 27.325 / 0.1)", color: "oklch(0.45 0.22 27)" }}>
                  Most Failed
                </span>
              </>
            }
          />

          <InsightCard
            title="Top Correct Question"
            label="Top Correct Question"
            description={mostCorrect?.question ?? "No correct answers recorded yet."}
            count={mostCorrect?.count ?? 0}
            accentStyle={{ borderColor: "oklch(0.67 0.13 165 / 0.35)" }}
            glowStyle={{ background: "radial-gradient(ellipse at 10% 50%, oklch(0.67 0.13 165 / 0.08), transparent 60%)" }}
            valueStyle={{ color: "oklch(0.42 0.14 168)" }}
            badge={
              <>
                <Badge className="text-[0.68rem] font-bold uppercase tracking-widest" style={{ background: "oklch(0.67 0.13 165 / 0.15)", color: "oklch(0.42 0.14 168)", borderColor: "oklch(0.67 0.13 165 / 0.3)" }}>
                  Strongest Signal
                </Badge>
                <span className="rounded-full px-2.5 py-0.5 text-[0.68rem] font-semibold" style={{ background: "oklch(0.67 0.13 165 / 0.1)", color: "oklch(0.42 0.14 168)" }}>
                  Most Correct
                </span>
              </>
            }
          />
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
