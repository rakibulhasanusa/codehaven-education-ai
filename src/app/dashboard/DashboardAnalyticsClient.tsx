"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AreaChart, BarChart, LineChart, PieChart } from "@/components/charts/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Maximize2 } from "lucide-react";
import type { ChartPoint, PieSlice } from "@/lib/charts/chart-utils";

type AttemptRow = {
  id: string;
  score: number;
  wrong: number;
  unanswered: number;
  accuracyPercent: number;
  avgTimePerQuestion: number;
  createdAt: string;
};

type SubjectMistake = { subject: string; wrong: number; correct: number; skipped: number };
type TopicMistake = { topic: string; subject: string; wrong: number };
type RangeKey = "7d" | "30d" | "90d" | "all";

function avg(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((s, v) => s + v, 0) / values.length);
}

function labelDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(d);
}

function inRange(createdAt: string, range: RangeKey) {
  if (range === "all") return true;
  const date = new Date(createdAt);
  const now = Date.now();
  const t = date.getTime();
  if (Number.isNaN(t)) return false;
  const diff = now - t;
  if (diff < 0) return false;
  if (range === "7d") return diff <= 7 * 24 * 60 * 60 * 1000;
  if (range === "30d") return diff <= 30 * 24 * 60 * 60 * 1000;
  return diff <= 90 * 24 * 60 * 60 * 1000;
}

function ChartCard({
  children,
  fullscreenContent,
  fullscreenTitle = "Chart",
}: {
  children: React.ReactNode;
  fullscreenContent?: React.ReactNode;
  fullscreenTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="premium-panel relative p-2">
      {fullscreenContent ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="absolute right-4 top-4 z-10 h-8 w-8 bg-background/80 backdrop-blur"
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
  );
}

export default function DashboardAnalyticsClient({
  userName,
  isAdmin,
  attempts,
  subjectMistakes,
  topicMistakes,
}: {
  userName: string;
  isAdmin: boolean;
  attempts: AttemptRow[];
  subjectMistakes: SubjectMistake[];
  topicMistakes: TopicMistake[];
}) {
  const [range, setRange] = useState<RangeKey>("all");
  const [activeSubject, setActiveSubject] = useState<string>("all");

  const data = useMemo(() => {
    const filteredAttempts = attempts.filter((a) => inRange(a.createdAt, range));
    const recentAttempts = [...filteredAttempts].slice(0, 30).reverse();
    const accuracyTrend: ChartPoint[] = recentAttempts.map((a) => ({
      label: labelDate(a.createdAt),
      value: a.accuracyPercent,
    }));
    const scoreMomentum: ChartPoint[] = recentAttempts.map((a) => ({
      label: labelDate(a.createdAt),
      value: a.score,
    }));

    const filteredSubjects = activeSubject === "all"
      ? subjectMistakes
      : subjectMistakes.filter((s) => s.subject === activeSubject);

    const subjectWrongBars: ChartPoint[] = filteredSubjects
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 10)
      .map((s) => ({ label: s.subject, value: s.wrong }));

    const filteredTopics = activeSubject === "all"
      ? topicMistakes
      : topicMistakes.filter((t) => t.subject === activeSubject);

    const topicWrongBars: ChartPoint[] = filteredTopics
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 12)
      .map((t) => ({ label: t.topic, value: t.wrong }));

    const totalCorrect = filteredSubjects.reduce((s, x) => s + x.correct, 0);
    const totalWrong = filteredSubjects.reduce((s, x) => s + x.wrong, 0);
    const totalSkipped = filteredSubjects.reduce((s, x) => s + x.skipped, 0);
    const answerMix: PieSlice[] = [
      { label: "Correct", value: totalCorrect },
      { label: "Wrong", value: totalWrong },
      { label: "Skipped", value: totalSkipped },
    ];

    return {
      accuracyTrend,
      scoreMomentum,
      subjectWrongBars,
      topicWrongBars,
      answerMix,
      totalAttempts: filteredAttempts.length,
      avgAccuracy: avg(filteredAttempts.map((a) => a.accuracyPercent)),
      avgScore: avg(filteredAttempts.map((a) => a.score)),
      avgTimePerQuestion: avg(filteredAttempts.map((a) => a.avgTimePerQuestion)),
      subjects: subjectMistakes.map((s) => s.subject),
    };
  }, [attempts, subjectMistakes, topicMistakes, range, activeSubject]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 md:py-10">
      <div className="premium-panel overflow-hidden p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="premium-kicker">Performance Console</p>
            <h1 className="premium-title text-3xl font-extrabold tracking-tight">{userName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/leaderboard">Leaderboard</Link>
            </Button>
            {isAdmin ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/admin">Admin Dashboard</Link>
              </Button>
            ) : null}
            <Badge variant="secondary" className="tabular-nums">
              {data.totalAttempts} Attempts
            </Badge>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={range === "7d" ? "default" : "outline"} onClick={() => setRange("7d")}>7d</Button>
          <Button size="sm" variant={range === "30d" ? "default" : "outline"} onClick={() => setRange("30d")}>30d</Button>
          <Button size="sm" variant={range === "90d" ? "default" : "outline"} onClick={() => setRange("90d")}>90d</Button>
          <Button size="sm" variant={range === "all" ? "default" : "outline"} onClick={() => setRange("all")}>All</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Avg Accuracy</p>
            <p className="text-2xl font-bold tabular-nums">{data.avgAccuracy}%</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Avg Score</p>
            <p className="text-2xl font-bold tabular-nums">{data.avgScore}</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Avg Time/Q</p>
            <p className="text-2xl font-bold tabular-nums">{data.avgTimePerQuestion}s</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Weak Topics</p>
            <p className="text-2xl font-bold tabular-nums">{data.topicWrongBars.length}</p>
          </div>
        </div>
      </div>

      <section className="premium-panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeSubject === "all" ? "default" : "outline"}
            onClick={() => setActiveSubject("all")}
          >
            All Subjects
          </Button>
          {data.subjects.map((subject) => (
            <Button
              key={subject}
              size="sm"
              variant={activeSubject === subject ? "default" : "outline"}
              onClick={() => setActiveSubject(subject)}
            >
              {subject}
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          fullscreenTitle="Mistakes by Subject"
          fullscreenContent={<BarChart data={data.subjectWrongBars} title="Mistakes by Subject" subtitle="" valueLabel="wrong" height={560} />}
        >
          <BarChart data={data.subjectWrongBars} title="Mistakes by Subject" subtitle="" valueLabel="wrong" />
        </ChartCard>
        <ChartCard
          fullscreenTitle="Mistake Hotspots"
          fullscreenContent={<BarChart data={data.topicWrongBars} title="Mistake Hotspots" subtitle="" valueLabel="wrong" height={560} />}
        >
          <BarChart data={data.topicWrongBars} title="Mistake Hotspots" subtitle="" valueLabel="wrong" />
        </ChartCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard
          fullscreenTitle="Accuracy Trend"
          fullscreenContent={<LineChart data={data.accuracyTrend} title="Accuracy Trend" subtitle="" valueLabel="%" height={560} />}
        >
          <LineChart data={data.accuracyTrend} title="Accuracy Trend" subtitle="" valueLabel="%" />
        </ChartCard>
        <ChartCard
          fullscreenTitle="Score Momentum"
          fullscreenContent={<AreaChart data={data.scoreMomentum} title="Score Momentum" subtitle="" valueLabel="score" height={560} />}
        >
          <AreaChart data={data.scoreMomentum} title="Score Momentum" subtitle="" valueLabel="score" />
        </ChartCard>
      </section>

      <section>
        <ChartCard
          fullscreenTitle="Answer Mix"
          fullscreenContent={<PieChart data={data.answerMix} title="Answer Mix" subtitle="" height={560} />}
        >
        <PieChart data={data.answerMix} title="Answer Mix" subtitle="" />
        </ChartCard>
      </section>
    </main>
  );
}
