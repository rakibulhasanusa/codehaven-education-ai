"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function ExamAttemptPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const examId = Number(params.id);

  const [exam, setExam] = useState<ExamMeta | null>(null);
  const [loadingExam, setLoadingExam] = useState(true);
  const [name, setName] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | null>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let canceled = false;
    void (async () => {
      try {
        const res = await fetch("/api/exam", { cache: "no-store" });
        const json = await res.json();
        if (canceled) return;
        const found = Array.isArray(json.exams) ? (json.exams as ExamMeta[]).find((item) => item.id === examId) ?? null : null;
        setExam(found);
      } finally {
        if (!canceled) setLoadingExam(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [examId]);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const startTimeMs = exam?.startTime ? new Date(exam.startTime).getTime() : null;
  const countdownSeconds = startTimeMs ? Math.max(0, Math.floor((startTimeMs - now) / 1000)) : 0;
  const canStart = !exam?.startTime || countdownSeconds <= 0;

  async function submit() {
    const res = await fetch(`/api/exam/${examId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || "Submit failed");
    router.push(`/exam/result/${json.attemptId}`);
  }

  useEffect(() => {
    if (!started || timer <= 0) return;
    const t = window.setInterval(() => setTimer((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [started, timer]);

  useEffect(() => {
    if (started && timer === 0 && attemptId) void submit();
  }, [timer, started, attemptId]);

  useEffect(() => {
    if (!started || !attemptId) return;
    const t = window.setInterval(() => {
      void fetch(`/api/exam/${examId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers: questions.map((q) => ({ examQuestionId: q.id, selectedAnswer: answers[q.id], isMarkedForReview: !!marked[q.id], timeSpentSeconds: 5 })),
        }),
      });
    }, 5000);
    return () => window.clearInterval(t);
  }, [started, attemptId, answers, marked, questions, examId]);

  useEffect(() => {
    if (!started) return;
    document.oncontextmenu = (e) => e.preventDefault();
    const block = (e: ClipboardEvent) => e.preventDefault();
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    void document.documentElement.requestFullscreen?.();
    return () => {
      document.oncontextmenu = null;
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      if (document.fullscreenElement) void document.exitFullscreen();
    };
  }, [started]);

  async function start() {
    if (!canStart) return;
    const res = await fetch(`/api/exam/${examId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, deviceId: getDeviceId() }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || "Failed to start");

    setAttemptId(json.attemptId);
    setQuestions(json.questions || []);
    setTimer(Math.max(0, Number(json.remainingSeconds) || 0));

    if (Array.isArray(json.answers)) {
      const nextAnswers: Record<number, string | null> = {};
      const nextMarked: Record<number, boolean> = {};
      for (const row of json.answers) {
        nextAnswers[row.examQuestionId] = row.selectedAnswer || null;
        nextMarked[row.examQuestionId] = !!row.isMarkedForReview;
      }
      setAnswers(nextAnswers);
      setMarked(nextMarked);
    }

    setStarted(true);
  }

  const active = questions[idx];
  const proverb = "Preparation builds confidence, and confidence builds success.";
  const ruleItems = [
    "Each correct answer adds 1 mark.",
    `Each wrong answer deducts ${Number(exam?.negativeMarking ?? 0)} mark(s).`,
    "Unanswered questions carry 0 mark change.",
    "Copy, paste, and right-click actions are blocked during the exam.",
    "The timer starts immediately after you press Start Exam.",
  ];

  if (!started) {
    return (
      <main className="max-w-xl mx-auto px-4 py-10">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{exam?.subjectName ?? "Exam"}</Badge>
              {exam?.topic ? <Badge variant="outline">{exam.topic}</Badge> : null}
            </div>
            <CardTitle className="text-2xl">{exam?.title ?? "Start Exam"}</CardTitle>
            <CardDescription>{exam?.description || "Enter your name, wait for the start time if needed, then begin the exam."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingExam ? (
              <div className="rounded-lg border border-dashed px-3 py-4 text-sm text-muted-foreground">Loading exam details...</div>
            ) : null}

            {exam?.startTime ? (
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                <p className="text-sm font-medium">Scheduled start</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Intl.DateTimeFormat("en-BD", { dateStyle: "medium", timeStyle: "short" }).format(new Date(exam.startTime))}
                </p>
                <div className="mt-3">
                  {countdownSeconds > 0 ? (
                    <p className="text-lg font-semibold text-primary">
                      Starts in {Math.floor(countdownSeconds / 86400)}d {Math.floor((countdownSeconds % 86400) / 3600)}h {Math.floor((countdownSeconds % 3600) / 60)}m {countdownSeconds % 60}s
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-emerald-600">The exam is open now.</p>
                  )}
                </div>
              </div>
            ) : null}

            {exam?.instructions ? <div className="rounded-lg border border-border/60 px-3 py-3 text-sm text-muted-foreground">{exam.instructions}</div> : null}

            {!showRules ? (
              <div className="space-y-2">
                <input className="w-full rounded-lg border border-border bg-background px-3 py-2" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
                <Button className="w-full" disabled={!canStart || !name.trim()} onClick={() => setShowRules(true)}>
                  {canStart ? "Continue to Rules" : "Waiting for countdown..."}
                </Button>
                {!canStart ? <p className="text-center text-xs text-muted-foreground">You can join as soon as the countdown ends.</p> : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Proverb Before Start</p>
                  <p className="mt-2 text-base font-medium leading-7 text-amber-900">"{proverb}"</p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-sm font-semibold">Quiz Rules</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {ruleItems.map((rule) => (
                      <p key={rule}>• {rule}</p>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm">
                  <input type="checkbox" checked={agreeRules} onChange={(e) => setAgreeRules(e.target.checked)} />
                  <span>I have read the rules and I am ready to begin.</span>
                </label>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowRules(false)}>
                    Back
                  </Button>
                  <Button className="w-full sm:w-auto sm:ml-auto" disabled={!agreeRules || !canStart || !name.trim()} onClick={start}>
                    Start Exam
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-5">
      <div className="grid lg:grid-cols-[1fr_260px] gap-4">
        <div className="premium-panel rounded-2xl p-5">
          <div className="flex items-center justify-between"><div>Question {idx + 1} / {questions.length}</div><div className="font-semibold">{Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}</div></div>
          <p className="mt-3 font-medium">{active?.question}</p>
          <div className="mt-4 grid gap-2">
            {active?.options.map((opt, i) => {
              const key = active.optionKeys[i];
              const selected = answers[active.id] === key;
              return <button key={i} onClick={() => setAnswers((p) => ({ ...p, [active.id]: key }))} className={`text-left border rounded-lg p-3 ${selected ? "bg-accent" : ""}`}>{opt}</button>;
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="border rounded-lg px-3 py-2" onClick={() => setIdx((p) => Math.max(0, p - 1))}>Previous</button>
            <button className="border rounded-lg px-3 py-2" onClick={() => setMarked((p) => ({ ...p, [active.id]: !p[active.id] }))}>Mark for review</button>
            <button className="border rounded-lg px-3 py-2" onClick={() => setIdx((p) => Math.min(questions.length - 1, p + 1))}>Next</button>
            <button className="ml-auto bg-primary text-primary-foreground rounded-lg px-3 py-2" onClick={submit}>Submit</button>
          </div>
        </div>
        <aside className="premium-panel rounded-2xl p-4">
          <h2 className="font-semibold">Question Palette</h2>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {questions.map((q, i) => (
              <button key={q.id} onClick={() => setIdx(i)} className={`h-9 rounded-md border text-xs ${i === idx ? "bg-primary text-primary-foreground" : answers[q.id] ? "bg-green-100" : marked[q.id] ? "bg-amber-100" : ""}`}>{i + 1}</button>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
