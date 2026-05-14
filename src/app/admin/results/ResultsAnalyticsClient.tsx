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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

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
      .map(([label, rows]) => ({ label, value: average(rows.map((row) => row.accuracyPercent)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    const realtime: ChartPoint[] = Array.from(dayMap.entries()).map(([label, value]) => ({ label, value }));
    const distribution: PieSlice[] = [
      { label: "Correct", value: submitted.reduce((sum, row) => sum + row.correct, 0) },
      { label: "Wrong", value: submitted.reduce((sum, row) => sum + row.wrong, 0) },
      { label: "Skipped", value: submitted.reduce((sum, row) => sum + row.skipped, 0) },
    ];

    const topLearners = [...submitted].sort((a, b) => b.score - a.score).slice(0, 8);
    const graphNodes: GraphNode[] = [
      ...Array.from(examMap.keys()).slice(0, 6).map((exam) => ({ id: `exam:${exam}`, label: exam, group: "Exam", value: examMap.get(exam)?.length ?? 0 })),
      ...topLearners.map((row) => ({ id: `learner:${row.id}`, label: row.learnerName, group: "Learner", value: row.score })),
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
      averageAccuracy: average(submitted.map((row) => row.accuracyPercent)),
      bestScore: Math.max(0, ...submitted.map((row) => row.score)),
    };
  }, [results]);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-4">
          <Badge variant="outline">Result Intelligence</Badge>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <CardTitle className="premium-title text-3xl font-bold tracking-tight">Results Analytics</CardTitle>
            <CardDescription className="mt-2 max-w-2xl">
              Live exam performance, answer distribution, score movement, and learner-exam relationships.
            </CardDescription>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-md border bg-background/60 p-3"><p className="text-muted-foreground">Attempts</p><p className="text-xl font-semibold">{analytics.submitted.length}</p></div>
            <div className="rounded-md border bg-background/60 p-3"><p className="text-muted-foreground">Avg</p><p className="text-xl font-semibold">{analytics.averageAccuracy}%</p></div>
            <div className="rounded-md border bg-background/60 p-3"><p className="text-muted-foreground">Best</p><p className="text-xl font-semibold">{analytics.bestScore}</p></div>
          </div>
        </div>
        </CardHeader>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        <LineChart data={analytics.trend} title="Accuracy Trend" subtitle="Submitted attempts over time" valueLabel="accuracy" />
        <BarChart data={analytics.examBars} title="Exam Performance" subtitle="Average accuracy by exam" valueLabel="avg accuracy" />
        <AreaChart data={analytics.trend} title="Performance Area" subtitle="Recent score momentum" valueLabel="accuracy" />
        <PieChart data={analytics.distribution} title="Answer Distribution" subtitle="Correct, wrong, and skipped answers" />
        <RealtimeChart data={analytics.realtime} title="Realtime Submission Flow" subtitle="Daily attempt volume, ready for polling data" />
        <EmbeddingVisualization nodes={analytics.embeddingNodes} title="Embedding Visualization" subtitle="Learner attempts projected into a stable SVG cluster" />
        <ForceDirectedGraph nodes={analytics.graphNodes} links={analytics.graphLinks} title="AI Relationship Graph" subtitle="Learners connected to exams by performance" className="xl:col-span-2" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Latest Results</CardTitle>
          <CardDescription>Most recent submitted quiz attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.latest.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No submitted results found.
                  </TableCell>
                </TableRow>
              ) : null}
              {analytics.latest.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.learnerName}</TableCell>
                  <TableCell>{row.examTitle}</TableCell>
                  <TableCell>{row.score}</TableCell>
                  <TableCell>{row.accuracyPercent}%</TableCell>
                  <TableCell>{Math.round((row.timeTakenSeconds || 0) / 60)} min</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
