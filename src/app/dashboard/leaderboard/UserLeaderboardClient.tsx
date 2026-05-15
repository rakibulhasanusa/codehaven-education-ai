"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ExamOption = { id: number; title: string };
type LeaderboardRow = {
  rank: number;
  learnerName: string;
  score: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function UserLeaderboardClient({
  examOptions,
  selectedExamId,
  rows,
  myRank,
  currentUserName,
}: {
  examOptions: ExamOption[];
  selectedExamId: number | null;
  rows: LeaderboardRow[];
  myRank: number | null;
  currentUserName: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onExamChange(nextExamId: number) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("examId", String(nextExamId));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8">
      <div className="premium-panel overflow-hidden p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="premium-kicker">Dashboard</p>
            <h1 className="premium-title text-3xl font-extrabold tracking-tight">Leaderboard</h1>
          </div>
          <Badge variant="secondary" className="tabular-nums">{rows.length} ranked</Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground">Exam</p>
            {examOptions.length > 0 ? (
              <Select
                value={selectedExamId ? String(selectedExamId) : String(examOptions[0].id)}
                onValueChange={(v) => onExamChange(Number(v))}
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
              <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">No exams found</div>
            )}
          </div>

          {myRank ? (
            <div className="rounded-xl border px-4 py-2 text-sm font-semibold tabular-nums">
              Your Rank: #{myRank}
            </div>
          ) : (
            <div className="rounded-xl border px-4 py-2 text-sm text-muted-foreground">
              You have not participated in this exam yet.
            </div>
          )}
        </div>
      </div>

      <div className="premium-panel overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Learner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accuracy</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => {
                const me = row.learnerName === currentUserName;
                return (
                  <tr key={`${row.rank}-${row.learnerName}`} className={me ? "bg-primary/5" : "hover:bg-muted/20"}>
                    <td className="px-4 py-3 font-semibold tabular-nums">#{row.rank}</td>
                    <td className="px-4 py-3">
                      <span className={me ? "font-bold text-primary" : ""}>{row.learnerName}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{row.score}</td>
                    <td className="px-4 py-3 tabular-nums">{row.accuracyPercent}%</td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">{formatTime(row.timeTakenSeconds)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No leaderboard entries yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

