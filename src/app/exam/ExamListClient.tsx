"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getExamStatus } from "@/lib/exam-status";

type ExamMeta = {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  durationMinutes: number;
  timingMode: string;
  subjectName: string;
  topic: string | null;
};

function formatCountdown(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${secs}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

export default function ExamListClient({ initialExams }: { initialExams: ExamMeta[] }) {
  const [exams, setExams] = useState(initialExams);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setExams(initialExams);
  }, [initialExams]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    let canceled = false;

    const refresh = async () => {
      try {
        const res = await fetch("/api/exam", { cache: "no-store" });
        const json = await res.json();
        if (canceled) return;
        if (Array.isArray(json.exams)) setExams(json.exams);
      } catch {
        // Keep the initial data if refresh fails.
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 30000);

    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, []);

  const rows = useMemo(() => {
    return exams.map((exam) => {
      const status = getExamStatus(exam, new Date(now));
      const countdownSeconds = exam.startTime ? Math.max(0, Math.floor((new Date(exam.startTime).getTime() - now) / 1000)) : 0;
      return { exam, status, countdownSeconds };
    });
  }, [exams, now]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground md:col-span-2">
          No data available.
        </div>
      ) : rows.map(({ exam, status, countdownSeconds }) => (
        <Link key={exam.id} href={`/exam/${exam.id}`} className="group rounded-2xl border border-border/60 bg-background p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{exam.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{exam.description || "No description"}</p>
            </div>
            <Badge variant={status === "live" ? "default" : status === "upcoming" ? "outline" : "secondary"}>
              {status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Closed"}
            </Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{exam.subjectName}</span>
            <span>•</span>
            <span>{exam.topic || "General"}</span>
            <span>•</span>
            <span>{exam.durationMinutes} min</span>
            {exam.startTime ? (
              <>
                <span>•</span>
                <span>{new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(exam.startTime))}</span>
              </>
            ) : null}
          </div>
          {status === "upcoming" && exam.startTime ? (
            <p className="mt-3 text-sm text-primary">Starts in {formatCountdown(countdownSeconds)}</p>
          ) : null}
        </Link>
      ))}
    </div>
  );
}
