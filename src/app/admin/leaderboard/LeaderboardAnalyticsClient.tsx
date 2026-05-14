"use client";

import { useMemo } from "react";
import { AreaChart, BarChart, EmbeddingVisualization, ForceDirectedGraph, LineChart, PieChart } from "@/components/charts/analytics-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

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
    const top = [...attempts].sort((a, b) => b.score - a.score || b.accuracyPercent - a.accuracyPercent).slice(0, 12);
    const trend: ChartPoint[] = [...attempts].reverse().slice(-24).map((attempt) => ({ label: labelDate(attempt.createdAt), value: attempt.score }));
    const leaderboardBars: ChartPoint[] = top.slice(0, 8).map((attempt) => ({ label: attempt.learnerName, value: attempt.score }));
    const answerMix: PieSlice[] = [
      { label: "Correct", value: attempts.reduce((sum, row) => sum + row.correct, 0) },
      { label: "Wrong", value: attempts.reduce((sum, row) => sum + row.wrong, 0) },
      { label: "Skipped", value: attempts.reduce((sum, row) => sum + row.skipped, 0) },
    ];

    const examMap = new Map<string, LeaderboardAttempt[]>();
    attempts.forEach((attempt) => examMap.set(attempt.examTitle, [...(examMap.get(attempt.examTitle) ?? []), attempt]));
    const examArea: ChartPoint[] = Array.from(examMap.entries()).map(([label, rows]) => ({ label, value: avg(rows.map((row) => row.accuracyPercent)) }));
    const examNodes: GraphNode[] = Array.from(examMap.keys()).slice(0, 7).map((exam) => ({
      id: `exam:${exam}`,
      label: exam,
      group: "Exam",
      value: examMap.get(exam)?.length ?? 0,
    }));
    const learnerNodes: GraphNode[] = top.slice(0, 10).map((attempt) => ({
      id: `learner:${attempt.id}`,
      label: attempt.learnerName,
      group: "Top Learner",
      value: attempt.score,
    }));
    const graphLinks: GraphLink[] = top.slice(0, 10).map((attempt) => ({
      source: `learner:${attempt.id}`,
      target: `exam:${attempt.examTitle}`,
      value: Math.max(1, Math.round(attempt.accuracyPercent / 35)),
    }));
    const embeddingNodes: GraphNode[] = attempts.slice(0, 90).map((attempt) => ({
      id: attempt.id,
      label: attempt.learnerName,
      group: attempt.examTitle,
      value: attempt.accuracyPercent,
    }));

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
      averageScore: avg(attempts.map((attempt) => attempt.score)),
      highestScore: Math.max(0, ...attempts.map((attempt) => attempt.score)),
    };
  }, [attempts]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <Badge variant="outline">Leaderboard Intelligence</Badge>
          <div className="mt-2 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <CardTitle className="premium-title text-3xl font-bold tracking-tight">Leaderboard Analytics</CardTitle>
            <CardDescription className="mt-2">Rank movement, answer quality, AI relationship mapping, and topic signal visualization.</CardDescription>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md border bg-background/60 p-3"><p className="text-muted-foreground">Participants</p><p className="text-xl font-semibold">{analytics.totalParticipants}</p></div>
            <div className="rounded-md border bg-background/60 p-3"><p className="text-muted-foreground">Average</p><p className="text-xl font-semibold">{analytics.averageScore}</p></div>
            <div className="rounded-md border bg-background/60 p-3"><p className="text-muted-foreground">Highest</p><p className="text-xl font-semibold">{analytics.highestScore}</p></div>
          </div>
        </div>
        </CardHeader>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <BarChart data={analytics.leaderboardBars} title="Top Scores" subtitle="Highest submitted exam scores" valueLabel="score" />
        <LineChart data={analytics.trend} title="Score Trend" subtitle="Latest submitted attempts" valueLabel="score" />
        <PieChart data={analytics.answerMix} title="Leaderboard Answer Mix" subtitle="Correct, wrong, and skipped totals" />
        <AreaChart data={analytics.examArea} title="Exam Difficulty Signal" subtitle="Average accuracy by exam" valueLabel="accuracy" />
        <ForceDirectedGraph nodes={analytics.graphNodes} links={analytics.graphLinks} title="Force Directed Graph" subtitle="Top learners connected with attempted exams" className="xl:col-span-2" />
        <EmbeddingVisualization nodes={analytics.embeddingNodes} title="Embedding Visualization" subtitle="Attempt clusters by exam and performance" className="xl:col-span-2" />
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Badge variant="warning">Weakest Signal</Badge>
            <CardTitle>Most Failed Question</CardTitle>
            <CardDescription>{mostFailed?.question ?? "No wrong answers recorded yet."}</CardDescription>
          </CardHeader>
          <CardContent><p className="text-3xl font-semibold">{mostFailed?.count ?? 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Badge variant="success">Strongest Signal</Badge>
            <CardTitle>Most Correct Question</CardTitle>
            <CardDescription>{mostCorrect?.question ?? "No correct answers recorded yet."}</CardDescription>
          </CardHeader>
          <CardContent><p className="text-3xl font-semibold">{mostCorrect?.count ?? 0}</p></CardContent>
        </Card>
      </section>
    </div>
  );
}
