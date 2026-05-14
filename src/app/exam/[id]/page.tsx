"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getExamStatus } from "@/lib/exam-status";

type Q = { id: number; question: string; options: string[]; optionKeys: string[] };
type ExamMeta = {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  timingMode: string;
  negativeMarking: number;
  subjectName: string;
  topic: string | null;
};

const DEVICE_KEY = "mcq_exam_device_id";
function getDeviceId() {
  const old = localStorage.getItem(DEVICE_KEY);
  if (old) return old;
  const id = crypto.randomUUID();
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function formatCountdown(s: number) {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return { d, h, m, sec };
  if (h > 0) return { d: 0, h, m, sec };
  return { d: 0, h: 0, m, sec };
}

function formatTimer(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0)
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function timerColor(s: number, total: number) {
  const p = total > 0 ? s / total : 1;
  if (p > 0.5) return "oklch(0.38 0.13 168)";
  if (p > 0.2) return "oklch(0.42 0.14 75)";
  return "oklch(0.45 0.22 27)";
}

function ClockIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

const OPT_LABELS = ["A", "B", "C", "D", "E"];

/* ─── countdown digit block ─── */
function DigitBlock({ value, label }: { value: number; label: string }) {
  const str = String(value).padStart(2, "0");
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex items-center justify-center rounded-2xl tabular-nums font-black tracking-tight"
        style={{
          width: "clamp(3rem,10vw,4.5rem)",
          height: "clamp(3rem,10vw,4.5rem)",
          fontSize: "clamp(1.4rem,4vw,2.2rem)",
          background: "rgb(255 255 255 / 0.72)",
          border: "1.5px solid oklch(0.49 0.17 250 / 0.18)",
          boxShadow:
            "0 2px 12px -4px oklch(0.49 0.17 250 / 0.18), inset 0 1px 0 rgb(255 255 255 / 0.9)",
          color: "oklch(0.32 0.16 252)",
        }}
      >
        {str}
      </div>
      <span
        className="uppercase tracking-widest font-bold"
        style={{ fontSize: "0.58rem", color: "oklch(0.55 0.08 250)" }}
      >
        {label}
      </span>
    </div>
  );
}

function Colon() {
  return (
    <span
      className="font-black pb-5 select-none"
      style={{ fontSize: "clamp(1.2rem,3vw,1.8rem)", color: "oklch(0.49 0.17 250 / 0.4)" }}
    >
      :
    </span>
  );
}

/* ─── hero countdown banner ─── */
function HeroBanner({
  exam,
  canStart,
  status,
  countdownSec,
}: {
  exam: ExamMeta;
  canStart: boolean;
  status: string;
  countdownSec: number;
}) {
  const cd = formatCountdown(countdownSec);
  const isOpen = canStart;
  const isClosed = status === "closed";

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background:
          "linear-gradient(145deg, oklch(0.97 0.018 250) 0%, oklch(0.98 0.012 220) 50%, oklch(0.975 0.022 175) 100%)",
        border: "1.5px solid oklch(0.49 0.17 250 / 0.15)",
        boxShadow:
          "0 1px 1px oklch(0.2 0.01 250 / 0.04), 0 20px 48px -28px oklch(0.3 0.1 250 / 0.22), inset 0 1px 0 rgb(255 255 255 / 0.9)",
      }}
    >
      {/* decorative mesh blobs */}
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-30"
        style={{
          background:
            "radial-gradient(circle, oklch(0.7 0.14 250) 0%, transparent 70%)",
          filter: "blur(32px)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full opacity-20"
        style={{
          background:
            "radial-gradient(circle, oklch(0.7 0.13 165) 0%, transparent 70%)",
          filter: "blur(28px)",
        }}
      />

      <div className="relative px-6 pt-6 pb-5 space-y-4">

        {/* exam name + meta row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {exam.subjectName && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[0.66rem] font-black uppercase tracking-wider"
                  style={{
                    background: "oklch(0.49 0.17 250 / 0.1)",
                    color: "oklch(0.38 0.18 252)",
                    border: "1px solid oklch(0.49 0.17 250 / 0.2)",
                  }}
                >
                  {exam.subjectName}
                </span>
              )}
              {exam.topic && (
                <Badge variant="outline" className="text-[0.66rem]">
                  {exam.topic}
                </Badge>
              )}
            </div>
            <h1
              className="premium-title font-black tracking-tight leading-none"
              style={{ fontSize: "clamp(1.4rem,5vw,2rem)" }}
            >
              {exam.title}
            </h1>
            {exam.description && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                {exam.description}
              </p>
            )}
          </div>

          {/* duration pill */}
          {exam.durationMinutes && (
            <div
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 shrink-0"
              style={{
                background: "rgb(255 255 255 / 0.7)",
                border: "1px solid oklch(0.49 0.17 250 / 0.16)",
              }}
            >
              <ClockIcon size={13} />
              <span className="text-xs font-bold" style={{ color: "oklch(0.38 0.16 252)" }}>
                {exam.durationMinutes} min
              </span>
            </div>
          )}
        </div>

        {/* divider */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.49 0.17 250 / 0.18) 30%, oklch(0.67 0.13 165 / 0.15) 70%, transparent)",
          }}
        />

        {/* countdown / status display */}
        <div className="flex flex-col items-center gap-3 py-2">
          {isOpen ? (
            /* ── LIVE: green "open" pulse ── */
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="relative flex h-3 w-3"
                >
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ background: "oklch(0.55 0.13 165)" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-3 w-3"
                    style={{ background: "oklch(0.45 0.13 165)" }}
                  />
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: "oklch(0.35 0.13 168)" }}
                >
                  Exam is Live Now
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en-BD", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(exam.startTime!))}
              </p>
            </div>
          ) : isClosed ? (
            /* ── CLOSED ── */
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-3xl font-black"
                style={{ color: "oklch(0.52 0.01 240)" }}
              >
                Closed
              </span>
              <p className="text-xs text-muted-foreground">
                This exam is no longer accepting entries.
              </p>
            </div>
          ) : (
            /* ── COUNTDOWN ── */
            <>
              <p
                className="premium-kicker text-center"
                style={{ color: "oklch(0.44 0.14 75)" }}
              >
                Starts In
              </p>
              <div className="flex items-end gap-2">
                {cd.d > 0 && (
                  <>
                    <DigitBlock value={cd.d} label="Days" />
                    <Colon />
                    <DigitBlock value={cd.h} label="Hours" />
                    <Colon />
                    <DigitBlock value={cd.m} label="Min" />
                    <Colon />
                    <DigitBlock value={cd.sec} label="Sec" />
                  </>
                )}
                {cd.d === 0 && cd.h > 0 && (
                  <>
                    <DigitBlock value={cd.h} label="Hours" />
                    <Colon />
                    <DigitBlock value={cd.m} label="Min" />
                    <Colon />
                    <DigitBlock value={cd.sec} label="Sec" />
                  </>
                )}
                {cd.d === 0 && cd.h === 0 && (
                  <>
                    <DigitBlock value={cd.m} label="Min" />
                    <Colon />
                    <DigitBlock value={cd.sec} label="Sec" />
                  </>
                )}
              </div>
              {exam.startTime && (
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("en-BD", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(exam.startTime))}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── info card ─── */
function InfoCard({
  kicker,
  children,
  variant = "default",
}: {
  kicker: string;
  children: React.ReactNode;
  variant?: "default" | "closed";
}) {
  const s =
    variant === "closed"
      ? { bg: "oklch(0.93 0.005 240)", border: "oklch(0.82 0.01 240)", kc: "oklch(0.52 0.01 240)" }
      : { bg: "oklch(0.49 0.17 250/0.05)", border: "oklch(0.49 0.17 250/0.16)", kc: "oklch(0.42 0.18 252)" };

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <p className="premium-kicker mb-2" style={{ color: s.kc }}>{kicker}</p>
      {children}
    </div>
  );
}

/* ─── step divider ─── */
function StepDivider({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border/60" />
      <div className="flex items-center gap-2">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-black"
          style={{ background: "oklch(0.49 0.17 250/0.12)", color: "oklch(0.42 0.18 252)" }}
        >
          {step}
        </span>
        <span className="premium-kicker text-[0.62rem]">{label}</span>
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border/60" />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function ExamAttemptPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const examId = Number(params.id);

  const [exam, setExam] = useState<ExamMeta | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [name, setName] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [timer, setTimer] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [attemptId, setAttemptId] = useState("");

  const attemptIdRef = useRef("");
  const answersRef = useRef<Record<number, string | null>>({});
  const markedRef = useRef<Record<number, boolean>>({});
  const questionsRef = useRef<Q[]>([]);
  useEffect(() => { attemptIdRef.current = attemptId; }, [attemptId]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { markedRef.current = marked; }, [marked]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  useEffect(() => {
    let dead = false;
    fetch("/api/exam", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (dead) return;
        const found = Array.isArray(json.exams)
          ? (json.exams as ExamMeta[]).find((e) => e.id === examId) ?? null
          : null;
        setExam(found);
      })
      .finally(() => { if (!dead) setLoadingExam(false); });
    return () => { dead = true; };
  }, [examId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const startTimeMs = exam?.startTime ? new Date(exam.startTime).getTime() : null;
  const countdownSec = startTimeMs ? Math.max(0, Math.floor((startTimeMs - now) / 1000)) : 0;
  const status = exam
    ? getExamStatus(
        { startTime: exam.startTime, endTime: exam.endTime, timingMode: exam.timingMode, durationMinutes: exam.durationMinutes },
        new Date(now)
      )
    : "live";
  const canStart = status === "live";

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => setTimer((s) => (s > 1 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [started]);

  useEffect(() => {
    if (started && timer === 0 && attemptIdRef.current) void doSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer, started]);

  useEffect(() => {
    if (!started || !attemptId) return;
    const t = setInterval(() => {
      void fetch(`/api/exam/${examId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attemptIdRef.current,
          answers: questionsRef.current.map((q) => ({
            examQuestionId: q.id,
            selectedAnswer: answersRef.current[q.id] ?? null,
            isMarkedForReview: !!markedRef.current[q.id],
            timeSpentSeconds: 5,
          })),
        }),
      });
    }, 5000);
    return () => clearInterval(t);
  }, [started, attemptId, examId]);

  useEffect(() => {
    if (!started) return;
    const block = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.oncontextmenu = (e) => e.preventDefault();
    void document.documentElement.requestFullscreen?.();
    return () => {
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.oncontextmenu = null;
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [started]);

  async function doSubmit() {
    const res = await fetch(`/api/exam/${examId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: attemptIdRef.current }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error || "Submit failed"); return; }
    router.push(`/exam/result/${json.attemptId}`);
  }

  async function startExam() {
    if (!canStart || !name.trim()) return;
    const res = await fetch(`/api/exam/${examId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, deviceId: getDeviceId() }),
    });
    const json = await res.json();
    if (!res.ok) { alert(json.error || "Failed to start"); return; }

    const qs: Q[] = json.questions || [];
    const secs = Math.max(0, Number(json.remainingSeconds) || 0);
    const initAns: Record<number, string | null> = {};
    const initMrk: Record<number, boolean> = {};
    if (Array.isArray(json.answers)) {
      for (const row of json.answers) {
        initAns[row.examQuestionId] = row.selectedAnswer || null;
        initMrk[row.examQuestionId] = !!row.isMarkedForReview;
      }
    }

    setQuestions(qs);
    setAnswers(initAns);
    setMarked(initMrk);
    setAttemptId(json.attemptId);
    setTimer(secs);
    setTotalSeconds(secs);
    setStarted(true);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRE-EXAM
  // ─────────────────────────────────────────────────────────────────────────
  if (!started) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <div className="space-y-3">

          {/* ══ HERO BANNER ══ */}
          {loadingExam ? (
            <div
              className="rounded-2xl h-48 animate-pulse"
              style={{ background: "oklch(0.95 0.01 250)" }}
            />
          ) : exam ? (
            <HeroBanner
              exam={exam}
              canStart={canStart}
              status={status}
              countdownSec={countdownSec}
            />
          ) : null}

          {/* ══ FORM CARD ══ */}
          <div
            className="premium-panel rounded-2xl overflow-hidden"
          >
            {/* thin accent line */}
            <div
              className="h-0.5 w-full"
              style={{
                background:
                  "linear-gradient(90deg,oklch(0.49 0.17 250),oklch(0.67 0.13 165),oklch(0.72 0.15 78))",
              }}
            />

            <div className="p-6 space-y-5">
              <StepDivider
                step={showRules ? 2 : 1}
                label={showRules ? "Review Rules" : "Enter Details"}
              />

              {!showRules ? (
                /* ── step 1 ── */
                <>
                  {exam?.instructions && (
                    <InfoCard kicker="Instructions">
                      <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                        {exam.instructions}
                      </p>
                    </InfoCard>
                  )}

                  <div className="space-y-1.5">
                    <label className="premium-kicker block">Your Name</label>
                    <input
                      className="premium-input w-full"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={loadingExam}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && canStart && name.trim()) setShowRules(true);
                      }}
                    />
                  </div>

                  <Button
                    className="w-full h-11 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
                    size="lg"
                    disabled={!canStart || !name.trim() || loadingExam}
                    onClick={() => setShowRules(true)}
                    style={
                      canStart && name.trim()
                        ? {
                            background:
                              "linear-gradient(135deg,oklch(0.49 0.17 250),oklch(0.42 0.18 252))",
                            color: "white",
                            boxShadow: "0 4px 18px -6px oklch(0.49 0.17 250/0.55)",
                          }
                        : undefined
                    }
                  >
                    {loadingExam
                      ? "Loading exam…"
                      : canStart
                      ? "Continue to Rules →"
                      : status === "closed"
                      ? "Quiz closed"
                      : "Waiting for start…"}
                  </Button>
                </>
              ) : (
                /* ── step 2 ── */
                <>
                  {/* motivational banner */}
                  <div
                    className="relative overflow-hidden rounded-2xl p-4"
                    style={{
                      background:
                        "linear-gradient(135deg,oklch(0.72 0.15 78/0.13),oklch(0.62 0.18 25/0.09))",
                      border: "1px solid oklch(0.72 0.15 78/0.28)",
                    }}
                  >
                    <div
                      className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20"
                      style={{ background: "oklch(0.72 0.15 78)" }}
                    />
                    <p
                      className="premium-kicker mb-1.5"
                      style={{ color: "oklch(0.46 0.14 75)" }}
                    >
                      Before You Begin
                    </p>
                    <p
                      className="text-sm font-semibold leading-7"
                      style={{ color: "oklch(0.32 0.12 75)" }}
                    >
                      &quot;Preparation builds confidence, and confidence builds success.&quot;
                    </p>
                  </div>

                  {/* rules */}
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      background: "rgb(255 255 255/0.72)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <p className="premium-kicker mb-3">Quiz Rules</p>
                    <ul className="space-y-2.5">
                      {[
                        "Each correct answer adds 1 mark.",
                        `Each wrong answer deducts ${Number(exam?.negativeMarking ?? 0)} mark(s).`,
                        "Unanswered questions carry no mark change.",
                        "Copy, paste, and right-click are blocked during the exam.",
                        "The timer begins immediately after you press Start Exam.",
                        "Submitting early or letting the timer expire both finalise your attempt.",
                      ].map((rule, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                          <span
                            className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-black"
                            style={{
                              background: "oklch(0.49 0.17 250/0.1)",
                              color: "oklch(0.42 0.18 252)",
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="leading-5">{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* agree */}
                  <label
                    className="flex cursor-pointer items-start gap-3 rounded-2xl p-3.5 transition-all duration-150"
                    style={{
                      border: `1.5px solid ${agreeRules ? "oklch(0.67 0.13 165/0.45)" : "var(--border)"}`,
                      background: agreeRules ? "oklch(0.67 0.13 165/0.07)" : "rgb(255 255 255/0.6)",
                      boxShadow: agreeRules ? "0 0 0 3px oklch(0.67 0.13 165/0.12)" : "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 cursor-pointer accent-primary"
                      checked={agreeRules}
                      onChange={(e) => setAgreeRules(e.target.checked)}
                    />
                    <span className="text-sm leading-5">
                      I have read the rules and I am ready to begin.
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="h-11 w-28 shrink-0 rounded-xl"
                      onClick={() => setShowRules(false)}
                    >
                      ← Back
                    </Button>
                    <Button
                      className="h-11 flex-1 rounded-xl text-sm font-bold tracking-wide transition-all duration-200"
                      size="lg"
                      disabled={!agreeRules || !canStart || !name.trim()}
                      onClick={startExam}
                      style={
                        agreeRules && canStart && name.trim()
                          ? {
                              background:
                                "linear-gradient(135deg,oklch(0.49 0.17 250),oklch(0.42 0.18 252))",
                              color: "white",
                              boxShadow: "0 4px 18px -6px oklch(0.49 0.17 250/0.55)",
                            }
                          : undefined
                      }
                    >
                      Start Exam →
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXAM SCREEN ← unchanged
  // ─────────────────────────────────────────────────────────────────────────
  if (!questions.length) return null;

  const totalAnswered = Object.values(answers).filter(Boolean).length;
  const timerPct = totalSeconds > 0 ? timer / totalSeconds : 1;

  return (
    <main className="mx-auto max-w-7xl px-3 py-4">

      {/* top bar */}
      <div className="premium-panel mb-3 flex items-center gap-3 px-4 py-2.5" style={{ borderRadius: "0.875rem" }}>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{exam?.title}</p>
          <p className="text-xs text-muted-foreground">
            {totalAnswered} answered · {questions.length - totalAnswered} remaining
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 tabular-nums"
          style={{
            background: timerPct > 0.5 ? "oklch(0.67 0.13 165/0.1)" : timerPct > 0.2 ? "oklch(0.72 0.15 78/0.12)" : "oklch(0.577 0.245 27/0.1)",
            border: `1px solid ${timerPct > 0.5 ? "oklch(0.67 0.13 165/0.25)" : timerPct > 0.2 ? "oklch(0.72 0.15 78/0.3)" : "oklch(0.577 0.245 27/0.3)"}`,
          }}>
          <ClockIcon size={13} />
          <span className="text-base font-extrabold" style={{ color: timerColor(timer, totalSeconds) }}>
            {formatTimer(timer)}
          </span>
        </div>
        <Button size="sm" onClick={doSubmit}
          style={{ background: "linear-gradient(135deg,oklch(0.49 0.17 250),oklch(0.42 0.18 252))", color: "white", fontWeight: 700 }}>
          Submit Exam
        </Button>
      </div>

      {/* timer bar */}
      <div className="mb-3 h-1 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all duration-1000 ease-linear"
          style={{
            width: `${Math.round(timerPct * 100)}%`,
            background: timerPct > 0.5 ? "oklch(0.55 0.13 165)" : timerPct > 0.2 ? "oklch(0.62 0.14 78)" : "oklch(0.52 0.22 27)",
          }} />
      </div>

      <div className="space-y-3">
        {questions.map((item, idx) => (
          <div key={item.id} className="premium-panel overflow-hidden" style={{ borderRadius: "1rem" }}>
            <div className="flex items-center justify-between border-b px-5 py-3"
              style={{ borderColor: "var(--border)", background: "rgb(255 255 255/0.55)" }}>
              <div className="flex items-center gap-2">
                <span className="rounded-lg px-2.5 py-0.5 text-xs font-bold"
                  style={{ background: "oklch(0.49 0.17 250/0.1)", color: "oklch(0.42 0.18 252)" }}>
                  Q {idx + 1}
                </span>
                <span className="text-xs text-muted-foreground">of {questions.length}</span>
              </div>
              <div className="flex items-center gap-2">
                {marked[item.id] && (
                  <span className="rounded-full px-2.5 py-0.5 text-[0.67rem] font-semibold"
                    style={{ background: "oklch(0.72 0.15 78/0.12)", color: "oklch(0.42 0.14 75)", border: "1px solid oklch(0.72 0.15 78/0.3)" }}>
                    ★ Marked for review
                  </span>
                )}
                <Button variant="outline" size="sm"
                  onClick={() => setMarked((p) => ({ ...p, [item.id]: !p[item.id] }))}
                  style={marked[item.id] ? { background: "oklch(0.72 0.15 78/0.12)", borderColor: "oklch(0.72 0.15 78/0.4)", color: "oklch(0.42 0.14 75)" } : undefined}>
                  {marked[item.id] ? "★ Marked" : "☆ Mark"}
                </Button>
              </div>
            </div>

            <div className="p-5">
              <p className="mb-5 text-base font-semibold leading-7">{item.question}</p>
              <div className="space-y-2.5">
                {item.options.map((opt, i) => {
                  const key = item.optionKeys[i];
                  const sel = answers[item.id] === key;
                  return (
                    <button key={i} type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: prev[item.id] === key ? null : key }))}
                      className="w-full rounded-xl p-3.5 text-left text-sm leading-relaxed transition-all duration-150"
                      style={{
                        border: sel ? "1.5px solid oklch(0.49 0.17 250/0.8)" : "1px solid var(--border)",
                        background: sel ? "linear-gradient(135deg,oklch(0.49 0.17 250/0.1),oklch(0.49 0.17 250/0.05))" : "rgb(255 255 255/0.75)",
                        boxShadow: sel ? "0 0 0 3px oklch(0.49 0.17 250/0.12)" : "none",
                      }}>
                      <span className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.72rem] font-bold"
                          style={{ background: sel ? "oklch(0.49 0.17 250)" : "oklch(0.49 0.17 250/0.1)", color: sel ? "white" : "oklch(0.42 0.18 252)" }}>
                          {OPT_LABELS[i] ?? i + 1}
                        </span>
                        <span style={{ color: sel ? "var(--foreground)" : "var(--muted-foreground)" }}>{opt}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end border-t px-5 py-3"
              style={{ borderColor: "var(--border)", background: "rgb(255 255 255/0.4)" }}>
              {answers[item.id] && (
                <Button variant="ghost" size="sm" className="text-muted-foreground"
                  onClick={() => setAnswers((p) => ({ ...p, [item.id]: null }))}>
                  Clear
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}