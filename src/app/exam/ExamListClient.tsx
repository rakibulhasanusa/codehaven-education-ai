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
  negativeMarking: number;
  subjectName: string;
  topic: string | null;
};

function formatCountdown(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  return `${minutes}m ${secs}s`;
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  live: {
    label: "Live",
    dot: "oklch(0.55 0.13 165)",
    badge: {
      background: "oklch(0.67 0.13 165 / 0.12)",
      color: "oklch(0.35 0.13 168)",
      borderColor: "oklch(0.67 0.13 165 / 0.3)",
    },
    accent: "oklch(0.67 0.13 165 / 0.08)",
    border: "oklch(0.67 0.13 165 / 0.35)",
  },
  upcoming: {
    label: "Upcoming",
    dot: "oklch(0.62 0.14 78)",
    badge: {
      background: "oklch(0.72 0.15 78 / 0.1)",
      color: "oklch(0.42 0.14 75)",
      borderColor: "oklch(0.72 0.15 78 / 0.3)",
    },
    accent: "oklch(0.72 0.15 78 / 0.06)",
    border: "oklch(0.72 0.15 78 / 0.3)",
  },
  closed: {
    label: "Closed",
    dot: "oklch(0.62 0 0)",
    badge: {
      background: "oklch(0.92 0 0)",
      color: "oklch(0.5 0 0)",
      borderColor: "oklch(0.82 0 0)",
    },
    accent: "transparent",
    border: "var(--border)",
  },
} as const;

// ─── Exam card ─────────────────────────────────────────────────────────────────
function ExamCard({
  exam,
  status,
  countdownSeconds,
}: {
  exam: ExamMeta;
  status: "live" | "upcoming" | "closed";
  countdownSeconds: number;
}) {
  const cfg = STATUS_CONFIG[status];
  const isClosed = status === "closed";

  return (
    <Link
      href={`/exam/${exam.id}`}
      className="group relative block overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        border: `1px solid ${cfg.border}`,
        background: "rgb(255 255 255 / 0.9)",
        boxShadow: "0 1px 1px oklch(0.2 0.01 250 / 0.04), 0 8px 24px -16px oklch(0.22 0.04 255 / 0.2)",
        opacity: isClosed ? 0.72 : 1,
      }}
      tabIndex={isClosed ? -1 : 0}
      aria-disabled={isClosed}
      onClick={isClosed ? (e) => e.preventDefault() : undefined}
    >
      {/* Status accent top bar */}
      {!isClosed && (
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{
            background:
              status === "live"
                ? "linear-gradient(90deg, oklch(0.67 0.13 165), oklch(0.49 0.17 250))"
                : "linear-gradient(90deg, oklch(0.72 0.15 78), oklch(0.62 0.18 25))",
          }}
        />
      )}

      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(ellipse at 20% 0%, ${cfg.accent}, transparent 65%)`,
        }}
      />

      <div className="relative p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              className="truncate text-base font-bold tracking-tight transition-colors duration-150"
              style={{ color: "var(--foreground)" }}
            >
              {exam.title}
            </h2>
            {exam.description && (
              <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {exam.description}
              </p>
            )}
          </div>

          {/* Status badge */}
          <span
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wider"
            style={cfg.badge}
          >
            {status === "live" && (
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: cfg.dot }}
              />
            )}
            {cfg.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span
            className="rounded-full px-2 py-0.5 font-medium"
            style={{
              background: "oklch(0.49 0.17 250 / 0.08)",
              color: "oklch(0.42 0.18 252)",
            }}
          >
            {exam.subjectName}
          </span>

          {exam.topic && (
            <>
              <span className="text-border">·</span>
              <span>{exam.topic}</span>
            </>
          )}

          <span className="text-border">·</span>
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {exam.durationMinutes} min
          </span>

          {exam.negativeMarking > 0 && (
            <>
              <span className="text-border">·</span>
              <span
                className="rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold"
                style={{
                  background: "oklch(0.577 0.245 27.325 / 0.08)",
                  color: "oklch(0.45 0.22 27)",
                }}
              >
                −{exam.negativeMarking} penalty
              </span>
            </>
          )}

          {exam.startTime && (
            <>
              <span className="text-border">·</span>
              <span>{formatDateTime(exam.startTime)}</span>
            </>
          )}
        </div>

        {/* Countdown */}
        {status === "upcoming" && exam.startTime && (
          <div
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
            style={{
              background: "oklch(0.72 0.15 78 / 0.1)",
              color: "oklch(0.42 0.14 75)",
              border: "1px solid oklch(0.72 0.15 78 / 0.2)",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <>
              Starts in&nbsp;
              <span className="tabular-nums">{formatCountdown(countdownSeconds)}</span>
            </>
          </div>
        )}

        {/* Live pulse indicator */}
        {status === "live" && (
          <div
            className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold"
            style={{
              background: "oklch(0.67 0.13 165 / 0.08)",
              color: "oklch(0.35 0.13 168)",
              border: "1px solid oklch(0.67 0.13 165 / 0.2)",
            }}
          >
            <span
              className="relative flex h-2 w-2 shrink-0"
            >
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: "oklch(0.55 0.13 165)" }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: "oklch(0.55 0.13 165)" }}
              />
            </span>
            Live now — tap to enter
          </div>
        )}

        {/* Closed overlay hint */}
        {isClosed && (
          <div className="mt-3 text-xs text-muted-foreground/70">
            {exam.endTime ? `Closed ${formatDateTime(exam.endTime)}` : "This exam has ended."}
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div
      className="premium-panel relative col-span-full overflow-hidden px-8 py-16 text-center"
      style={{ background: "linear-gradient(135deg, oklch(0.982 0.006 235), oklch(0.975 0.015 225))" }}
    >
      <div
        className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: "oklch(0.72 0.15 78 / 0.18)" }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full blur-3xl"
        style={{ background: "oklch(0.49 0.17 250 / 0.14)" }}
      />
      <div className="relative">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, oklch(0.49 0.17 250 / 0.12), oklch(0.67 0.13 165 / 0.1))",
            border: "1px solid oklch(0.49 0.17 250 / 0.2)",
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="oklch(0.49 0.17 250)" strokeWidth="1.6" strokeLinecap="round" />
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="oklch(0.49 0.17 250)" strokeWidth="1.6" />
            <path d="M9 12h6M9 16h4" stroke="oklch(0.49 0.17 250)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-xl font-bold tracking-tight text-foreground">
          A quiz is being prepared for you
        </p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          New quiz sets will be available soon. Check back shortly to start your next challenge.
        </p>
        <p className="premium-kicker mt-5">Future quizzes will appear here</p>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function ExamListClient({ initialExams }: { initialExams: ExamMeta[] }) {
  const [exams, setExams] = useState(initialExams);
  const [now, setNow] = useState(() => Date.now());
  const hasActiveWindows = useMemo(
    () =>
      exams.some((exam) => {
        const status = getExamStatus(exam, new Date(now));
        return status === "live" || status === "upcoming";
      }),
    [exams, now],
  );

  useEffect(() => {
    if (!hasActiveWindows) return;

    let timer: number | undefined;
    let canceled = false;

    const schedule = () => {
      const delay = 1000 - (Date.now() % 1000);
      timer = window.setTimeout(() => {
        if (canceled) return;
        setNow(Date.now());
        schedule();
      }, delay);
    };

    schedule();
    return () => {
      canceled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [hasActiveWindows]);

  useEffect(() => {
    let canceled = false;
    const refresh = async () => {
      try {
        const res = await fetch("/api/exam", { cache: "no-store" });
        const json = await res.json();
        if (canceled) return;
        if (Array.isArray(json.exams)) setExams(json.exams);
      } catch {
        // Keep initial data on failure
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
    const nowDate = new Date(now);
    return exams.map((exam) => {
      const status = getExamStatus(exam, nowDate);
      const startTimeMs = exam.startTime ? new Date(exam.startTime).getTime() : null;
      const countdownSeconds =
        startTimeMs !== null
          ? Math.max(0, Math.ceil((startTimeMs - now) / 1000))
          : 0;
      return { exam, status, countdownSeconds };
    });
  }, [exams, now]);

  // Stable sort: live → upcoming → closed (no re-ordering on status change)
  const ORDER = { live: 0, upcoming: 1, closed: 2 } as const;
  const sorted = useMemo(
    () => [...rows].sort((a, b) => ORDER[a.status] - ORDER[b.status]),
    [rows],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {sorted.length === 0 ? (
        <EmptyState />
      ) : (
        sorted.map(({ exam, status, countdownSeconds }) => (
          <ExamCard
            key={exam.id}
            exam={exam}
            status={status}
            countdownSeconds={countdownSeconds}
          />
        ))
      )}
    </div>
  );
}
