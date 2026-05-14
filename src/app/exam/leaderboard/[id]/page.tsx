"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { Badge }                           from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Progress }                        from "@/components/ui/progress";
import { Separator }                       from "@/components/ui/separator";
import { Skeleton }                        from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger }   from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
}                                          from "@/components/ui/table";
import {
  Tooltip, TooltipContent,
  TooltipProvider, TooltipTrigger,
}                                          from "@/components/ui/tooltip";

/* ─── types ─── */

type Row = {
  rank: number;
  name: string;
  score: number;
  accuracy: number;
  speed: number;
  timeTakenSeconds: number;
};

type Range = "daily" | "weekly" | "overall";

const RANGE_LABELS: Record<Range, string> = {
  daily:   "Today",
  weekly:  "This Week",
  overall: "All Time",
};

/* ─── small helpers ─── */

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s % 60}s`;
}

/* ─── sub-components ─── */

function RankBadge({ rank }: { rank: number }) {
  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  if (medals[rank])
    return (
      <span
        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-lg shadow-md select-none"
        role="img"
        aria-label={`Rank ${rank}`}
      >
        {medals[rank]}
      </span>
    );
  return (
    <Badge
      variant="outline"
      className="w-8 h-8 rounded-full p-0 flex items-center justify-center font-bold text-xs text-muted-foreground"
    >
      {rank}
    </Badge>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const hue = (name.charCodeAt(0) * 37 + (name.charCodeAt(1) || 0) * 13) % 360;
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shrink-0 border border-white/60 shadow-sm select-none"
      style={{ background: `oklch(0.88 0.09 ${hue})`, color: `oklch(0.32 0.07 ${hue})` }}
    >
      {initials || "?"}
    </span>
  );
}

function AccuracyBadge({ value }: { value: number }) {
  const cls =
    value >= 90 ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50" :
    value >= 70 ? "bg-sky-50    text-sky-700    border-sky-200    hover:bg-sky-50"    :
                  "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50";
  const label =
    value >= 90 ? "Excellent accuracy" :
    value >= 70 ? "Good accuracy"      : "Needs improvement";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`tabular-nums text-xs font-semibold cursor-default ${cls}`}>
          {value}%
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="left"><p className="text-xs">{label}</p></TooltipContent>
    </Tooltip>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell className="pl-6"><Skeleton className="w-8 h-8 rounded-full" /></TableCell>
          <TableCell>
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-1.5 w-24 rounded-full" />
              </div>
            </div>
          </TableCell>
          <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
          <TableCell className="hidden sm:table-cell text-right"><Skeleton className="h-5 w-12 rounded-full ml-auto" /></TableCell>
          <TableCell className="hidden sm:table-cell text-right pr-6"><Skeleton className="h-3 w-14 ml-auto" /></TableCell>
        </TableRow>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={5}>
        <div className="py-16 text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl premium-surface flex items-center justify-center text-xl shadow">
            🏆
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            No results yet for this period.
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

/* ─── page ─── */

export default function ExamLeaderboardPage() {
  const params  = useParams<{ id: string }>();
  const examId  = Number(params.id);
  const valid   = Number.isFinite(examId) && examId > 0;

  const [range,   setRange]   = useState<Range>("overall");
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulse,   setPulse]   = useState(false);

  useEffect(() => {

    const load = async () => {
      try {
        const res = await fetch(`/api/exam/${examId}/leaderboard?range=${range}`, { cache: "no-store" });
        setRows(res.ok ? ((await res.json()).leaderboard ?? []) : []);
      } catch { setRows([]); }
      finally {
        setLoading(false);
        setPulse(true);
        setTimeout(() => setPulse(false), 800);
      }
    };

    void load();
    const t = window.setInterval(load, 5000);
    return () => window.clearInterval(t);
  }, [examId, range, valid]);

  const maxScore    = rows.length ? Math.max(...rows.map((r) => r.score)) : 1;
  const avgAccuracy = rows.length ? Math.round(rows.reduce((s, r) => s + r.accuracy, 0) / rows.length) : 0;

  return (
    <TooltipProvider>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <Card className="premium-panel border-0 shadow-none rounded-2xl overflow-hidden p-0 gap-0">

          {/* ── accent bar ── */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-[color-mix(in_oklch,var(--primary)_55%,var(--accent))] to-accent" />

          {/* ── header ── */}
          <CardHeader className="px-6 pt-5 pb-4 gap-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="premium-kicker mb-1">Exam #{examId}</p>
                <h1 className="premium-title text-3xl font-black tracking-tight leading-none">
                  Leaderboard
                </h1>
              </div>

              <Tabs value={range} onValueChange={(v) => setRange(v as Range)} className="self-start">
                <TabsList className="bg-muted h-9">
                  {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
                    <TabsTrigger key={r} value={r} className="text-xs px-3">
                      {RANGE_LABELS[r]}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* stat strip */}
            {!loading && rows.length > 0 && (
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { label: "Participants", value: rows.length },
                  { label: "Top Score",    value: maxScore },
                  { label: "Avg Accuracy", value: `${avgAccuracy}%` },
                ].map((s) => (
                  <div key={s.label} className="premium-stat text-center">
                    <p className="text-lg font-black tabular-nums text-foreground">{s.value}</p>
                    <p className="premium-kicker mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </CardHeader>

          <Separator />

          {/* ── table ── */}
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b border-border/60">
                  {["#", "Participant", "Score", "Accuracy", "Time"].map((h, i) => (
                    <TableHead
                      key={h}
                      className={`text-[0.65rem] uppercase tracking-widest text-muted-foreground
                        ${i === 0 ? "w-14 pl-6" : ""}
                        ${i >= 2 ? "text-right" : ""}
                        ${i === 4 ? "hidden sm:table-cell pr-6" : ""}
                        ${i === 3 ? "hidden sm:table-cell" : ""}
                      `}
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <SkeletonRows />
                ) : rows.length === 0 ? (
                  <EmptyState />
                ) : (
                  rows.map((r) => {
                    const isPodium = r.rank <= 3;
                    return (
                      <TableRow
                        key={`${r.rank}-${r.name}-${r.timeTakenSeconds}-${r.score}`}
                        className={`transition-colors duration-150 ${
                          isPodium
                            ? "bg-[color-mix(in_oklch,var(--primary)_4%,transparent)] hover:bg-[color-mix(in_oklch,var(--primary)_7%,transparent)]"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        {/* rank */}
                        <TableCell className="pl-6 w-14">
                          <RankBadge rank={r.rank} />
                        </TableCell>

                        {/* participant */}
                        <TableCell>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar name={r.name} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate leading-tight">
                                {r.name}
                              </p>
                              <div className="mt-1 w-28 sm:w-36">
                                <Progress
                                  value={(r.score / maxScore) * 100}
                                  className="h-1.5 bg-border"
                                />
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* score */}
                        <TableCell className="text-right">
                          <span className={`tabular-nums text-sm font-black ${isPodium ? "text-primary" : "text-foreground"}`}>
                            {r.score}
                          </span>
                        </TableCell>

                        {/* accuracy */}
                        <TableCell className="hidden sm:table-cell text-right">
                          <AccuracyBadge value={r.accuracy} />
                        </TableCell>

                        {/* time */}
                        <TableCell className="hidden sm:table-cell text-right pr-6">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-xs text-muted-foreground tabular-nums font-medium cursor-default">
                                {fmtTime(r.timeTakenSeconds)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p className="text-xs">Time taken</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>

          {/* ── footer ── */}
          <CardFooter className="px-6 py-3 bg-muted/30 border-t border-border flex items-center justify-between">
            <p className="text-[0.68rem] text-muted-foreground font-medium tracking-wide">
              Auto-refreshes every 5 s
            </p>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full transition-colors duration-500 ${pulse ? "bg-primary animate-pulse" : "bg-emerald-400"}`} />
              <span className="text-[0.68rem] text-muted-foreground font-medium">Live</span>
            </div>
          </CardFooter>

        </Card>
      </main>
    </TooltipProvider>
  );
}