"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildSmartReview, calculateScore, calculateSubjectStats } from "@/lib/mcq/analytics";
import { BCS_SUBJECTS } from "@/lib/mcq/constants";
import { cn } from "@/lib/utils";
import type {
  AttemptRecord,
  BcsSubject,
  MCQQuestion,
  QuestionLanguage,
  Subject,
  SyllabusPart,
} from "@/lib/mcq/types";

const SUBJECTS: BcsSubject[] = BCS_SUBJECTS;
const LANGUAGES: QuestionLanguage[] = ["English", "Bengali"];

type ExamPhase = "setup" | "exam" | "result";

type GenerateResponse = {
  requestId: number;
  questions: MCQQuestion[];
};
type SyllabusResponse = {
  parts: SyllabusPart[];
};

type RateLimitStatus = {
  used: number;
  remaining: number;
  limit: number;
  blocked: boolean;
  resetAt: string;
  resetInHours: number;
};

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatCountdown(targetIso: string): string {
  const diffMs = new Date(targetIso).getTime() - Date.now();
  if (diffMs <= 0) return "00:00:00";
  const totalSeconds = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateISO: string): string {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateISO));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function exportQuestionsOnlyToPrintWindow(input: {
  learnerName: string;
  subjects: Subject[];
  language: QuestionLanguage;
  questions: MCQQuestion[];
}) {
  const isBn = input.language === "Bengali";
  const labels = isBn ? ["ক", "খ", "গ", "ঘ"] : ["A", "B", "C", "D"];
  const duration = input.questions.length;
  const pages = Array.from(
    { length: Math.ceil(input.questions.length / 20) },
    (_, i) => input.questions.slice(i * 20, i * 20 + 20)
  );

  const renderColumn = (items: MCQQuestion[], startIndex: number) =>
    items
      .map((q, i) => {
        const n = startIndex + i + 1;
        const isLast = i === items.length - 1;
        return `
        <div style="margin-bottom:7px;break-inside:avoid">
          <p style="margin:0 0 3px;font-size:10.5px;font-weight:600;line-height:1.35;color:#111">
            ${n}. ${escapeHtml(q.question)}
          </p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 6px">
            ${q.options
            .map(
              (opt, oi) =>
                `<p style="margin:0;font-size:9.5px;line-height:1.3;color:#3a3328">
                    <span style="font-style:italic;color:#7a6e5e">${labels[oi]}.</span> ${escapeHtml(opt)}
                  </p>`
            )
            .join("")}
          </div>
        </div>
        ${!isLast ? `<hr style="border:none;border-top:0.5px solid #d6cfc0;margin:0 0 5px">` : ""}
      `;
      })
      .join("");

  const renderPage = (items: MCQQuestion[], pageIndex: number) => {
    const left = items.slice(0, 10);
    const right = items.slice(10, 20);
    const pageStart = pageIndex * 20;
    const totalPages = pages.length;
    const today = new Date().toLocaleDateString("en-GB");

    return `
      <div style="
        box-sizing:border-box;
        width:210mm;
        height:297mm;
        background:#fffef9;
        padding:10mm 14mm 12mm;
        page-break-after:always;
        position:relative;
        overflow:hidden;
      ">

        <!-- Masthead -->
        <div style="
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          border-bottom:1.5px solid #1a1a1a;
          padding-bottom:7px;
          margin-bottom:7px;
          gap:16px;
        ">
          <div>
            <p style="margin:0 0 1px;font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#7a6e5e;font-weight:600">
              BCS Smart Practice — Official Mock
            </p>
            <h1 style="margin:0;font-size:18px;font-weight:700;line-height:1.1;color:#111;font-family:'Playfair Display',Georgia,serif">
              ${isBn ? "বিসিএস প্রস্তুতি" : "BCS Preparation"}
            </h1>
            <p style="margin:2px 0 0;font-size:9px;color:#6b6156;font-style:italic">
              Bangladesh Civil Service · Competitive Examination
            </p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
            <span style="
              background:#1a1a1a;color:#fffef9;
              border:1px solid #1a1a1a;
              padding:3px 9px;
              font-size:8px;font-weight:700;letter-spacing:1px;text-transform:uppercase;
            ">${input.questions.length} MCQ</span>
            <span style="
              border:1px solid #1a1a1a;
              padding:3px 9px;
              font-size:8px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#111;
            ">Model Test</span>
          </div>
        </div>

        <!-- Meta row -->
        <div style="
          display:flex;justify-content:space-between;align-items:center;
          background:#f2ede4;border:0.5px solid #c9c0af;
          padding:4px 10px;margin-bottom:4px;
          font-size:9px;font-weight:600;color:#3a3328;letter-spacing:0.2px;
        ">
          <span>${isBn ? "সময়" : "Time"}: ${duration} ${isBn ? "মিনিট" : "mins"}</span>
          <span>${isBn ? "তারিখ" : "Date"}: ${today}</span>
          <span>${isBn ? "পূর্ণমান" : "Marks"}: ${input.questions.length}</span>
          <span>${isBn ? "প্রার্থী" : "Learner"}: ${escapeHtml(input.learnerName)}</span>
        </div>

        <!-- Notice -->
        <p style="
          text-align:center;font-size:8.5px;color:#7a6e5e;font-style:italic;
          margin:0 0 6px;padding-bottom:6px;
          border-bottom:0.5px dashed #c9c0af;
        ">
          ${isBn
        ? "প্রতিটি প্রশ্নের মান সমান। প্রতিটি ভুল উত্তরের জন্য ০.২৫ নম্বর কাটা হবে। অনুত্তরিত প্রশ্নে কোনো নম্বর কাটা হবে না।"
        : "Each question carries equal marks. Negative marking: −0.25 per wrong answer. Unanswered questions carry no penalty."
      }
        </p>

        <!-- Ornament -->
        <div style="display:flex;align-items:center;gap:8px;margin:0 0 8px">
          <div style="flex:1;height:0.5px;background:#c9c0af"></div>
          <div style="width:5px;height:5px;background:#7a6e5e;transform:rotate(45deg)"></div>
          <div style="flex:1;height:0.5px;background:#c9c0af"></div>
        </div>

        <!-- Two-column questions -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;align-items:start">
          <section>${renderColumn(left, pageStart)}</section>
          <section style="border-left:0.5px solid #d6cfc0;padding-left:20px">
            ${renderColumn(right, pageStart + 10)}
          </section>
        </div>

        <!-- Footer -->
        <div style="
          position:absolute;bottom:8mm;left:14mm;right:14mm;
          border-top:1px solid #1a1a1a;
          padding-top:6px;
          display:flex;justify-content:space-between;align-items:center;
        ">
          <span style="font-size:7.5px;color:#9a8e7e;letter-spacing:0.5px;text-transform:uppercase">
            BCS Smart Practice · Official Mock Paper
          </span>
          <span style="font-size:9px;font-weight:600;color:#3a3328;letter-spacing:1px">
            ${pageIndex + 1} / ${totalPages}
          </span>
          <span style="font-size:7.5px;color:#9a8e7e;letter-spacing:0.5px;text-transform:uppercase">
            Confidential — For Learner Use Only
          </span>
        </div>
      </div>
    `;
  };

  const popup = window.open("", "_blank", "width=1024,height=900");
  if (!popup) return;

  popup.document.write(`
    <html>
      <head>
        <title>BCS MCQ Question Paper</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Noto+Sans+Bengali:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0;
            background: #f5f3ef;
            font-family: "Noto Sans Bengali", "Source Serif 4", Georgia, "Times New Roman", serif;
            color: #111;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @media print {
            body { background: #fff; }
            div { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        ${pages.map((pageItems, i) => renderPage(pageItems, i)).join("")}
      </body>
    </html>
  `);

  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 800);
}

export default function Home() {
  const [phase, setPhase] = useState<ExamPhase>("setup");
  const [learnerName, setLearnerName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([
    SUBJECTS[0].value,
  ]);
  const [questionLanguage, setQuestionLanguage] = useState<QuestionLanguage>("Bengali");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsingSyllabus, setIsParsingSyllabus] = useState(false);
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [syllabusError, setSyllabusError] = useState<string | null>(null);
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [syllabusParts, setSyllabusParts] = useState<SyllabusPart[]>([]);

  const [examQuestions, setExamQuestions] = useState<MCQQuestion[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [timeSpent, setTimeSpent] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(60);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [unlockCountdown, setUnlockCountdown] = useState("00:00:00");
  const [loadingLimit, setLoadingLimit] = useState(true);
  const timerRef = useRef<number | null>(null);
  const isBusy = isGenerating || isParsingSyllabus;

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/attempts", { cache: "no-store" });
      const rows = (await res.json()) as AttemptRecord[];
      if (res.ok) {
        setHistory(rows);
      }
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (!rateLimit?.blocked) {
      return;
    }

    const timer = window.setInterval(() => {
      setUnlockCountdown(formatCountdown(rateLimit.resetAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [rateLimit?.blocked, rateLimit?.resetAt]);

  useEffect(() => {
    let mounted = true;
    async function loadRateLimit() {
      try {
        setLoadingLimit(true);
        const res = await fetch("/api/generate-mcqs", { method: "GET", cache: "no-store" });
        const payload = (await res.json()) as RateLimitStatus;
        if (mounted && res.ok) {
          setRateLimit(payload);
        }
      } finally {
        if (mounted) {
          setLoadingLimit(false);
        }
      }
    }
    loadRateLimit();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (phase !== "exam") {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setQuestionTimer((prev) => {
        if (prev <= 0) {
          return 0;
        }
        setTimeSpent((old) => {
          const next = [...old];
          next[currentIndex] = (next[currentIndex] ?? 0) + 1;
          return next;
        });
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [phase, currentIndex]);

  const score = useMemo(() => calculateScore(examQuestions, answers), [examQuestions, answers]);
  const subjectStats = useMemo(
    () => calculateSubjectStats(examQuestions, answers),
    [examQuestions, answers]
  );
  const smartReview = useMemo(
    () => buildSmartReview({ questions: examQuestions, answers, timeSpent }),
    [examQuestions, answers, timeSpent]
  );

  const avgTimePerQuestion = useMemo(() => {
    if (!timeSpent.length) {
      return 0;
    }
    return Math.round(timeSpent.reduce((sum, sec) => sum + sec, 0) / timeSpent.length);
  }, [timeSpent]);

  const latestAttempts = useMemo(() => [...history].slice(0, 8), [history]);
  const bestScore = useMemo(
    () => (history.length ? Math.max(...history.map((h) => h.accuracyPercent)) : 0),
    [history]
  );
  const avgScoreHistory = useMemo(
    () =>
      history.length
        ? Math.round(history.reduce((sum, item) => sum + item.accuracyPercent, 0) / history.length)
        : 0,
    [history]
  );
  const trendDelta = useMemo(() => {
    if (history.length < 2) {
      return 0;
    }
    return history[0].accuracyPercent - history[1].accuracyPercent;
  }, [history]);
  const questionCount = selectedSubjects.length * 10;

  function toggleSubject(subject: Subject) {
    setSelectedSubjects((prev) => {
      if (prev.includes(subject)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((s) => s !== subject);
      }
      if (prev.length >= 2) return prev; // block if already 2 selected
      return [...prev, subject];
    });
  }

  async function startExam() {
    setSetupError(null);
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learnerName: learnerName.trim() || "Learner",
          subjects: selectedSubjects,
          language: questionLanguage,
          questionCount,
          syllabusParts,
        }),
      });
      const payload = (await res.json()) as GenerateResponse & {
        error?: string;
        rateLimit?: RateLimitStatus;
      };
      if (!res.ok) {
        if (res.status === 429 && payload.rateLimit) {
          setRateLimit(payload.rateLimit as RateLimitStatus);
        }
        throw new Error(payload.error || "Failed to generate exam questions.");
      }

      const generated = payload.questions ?? [];
      if (!generated.length) {
        throw new Error("No questions received from AI.");
      }
      if (!payload.requestId) {
        throw new Error("Generation request id not returned from backend.");
      }

      setActiveRequestId(payload.requestId);
      setExamQuestions(generated);
      setAnswers(Array(generated.length).fill(null));
      setTimeSpent(Array(generated.length).fill(0));
      setCurrentIndex(0);
      setQuestionTimer(60);
      setPhase("exam");
      const rateRes = await fetch("/api/generate-mcqs", { method: "GET", cache: "no-store" });
      if (rateRes.ok) {
        setRateLimit((await rateRes.json()) as RateLimitStatus);
      }
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : "Unable to generate questions.");
    } finally {
      setIsGenerating(false);
    }
  }

  function answerCurrentQuestion(optionIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[currentIndex] = optionIndex;
      return next;
    });
  }

  async function parseSyllabusPdf() {
    if (!syllabusFile) {
      setSyllabusError("Please choose the BCS syllabus PDF first.");
      return;
    }
    setSyllabusError(null);
    setIsParsingSyllabus(true);
    try {
      const form = new FormData();
      form.set("file", syllabusFile);
      form.set("language", questionLanguage);
      const res = await fetch("/api/syllabus-from-pdf", {
        method: "POST",
        body: form,
      });
      const payload = (await res.json()) as SyllabusResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Could not parse syllabus.");
      }
      if (!payload.parts || payload.parts.length !== 8) {
        throw new Error("Syllabus must be divided into exactly 8 parts.");
      }
      setSyllabusParts(payload.parts);
    } catch (error) {
      setSyllabusError(error instanceof Error ? error.message : "Failed to parse syllabus PDF.");
    } finally {
      setIsParsingSyllabus(false);
    }
  }

  function goToNextQuestion() {
    setQuestionTimer(60);
    setCurrentIndex((prev) => {
      if (prev >= examQuestions.length - 1) {
        return prev;
      }
      return prev + 1;
    });
  }

  function goToQuestion(index: number) {
    setCurrentIndex(index);
    setQuestionTimer(60);
  }

  async function submitExam() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    setSaveError(null);
    setIsSavingAttempt(true);
    try {
      if (!activeRequestId) {
        throw new Error("Missing request id. Please regenerate the exam.");
      }

      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: activeRequestId,
          learnerName: learnerName.trim() || "Learner",
          language: questionLanguage,
          subjects: selectedSubjects,
          questionCount: examQuestions.length,
          score: score.correct,
          wrong: score.wrong,
          unanswered: score.unanswered,
          accuracyPercent: score.accuracyPercent,
          avgTimePerQuestion,
        }),
      });

      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || "Failed to save exam attempt.");
      }

      await loadHistory();
      setPhase("result");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save exam attempt.");
    } finally {
      setIsSavingAttempt(false);
    }
  }

  function resetToSetup() {
    setPhase("setup");
    setExamQuestions([]);
    setActiveRequestId(null);
    setAnswers([]);
    setTimeSpent([]);
    setCurrentIndex(0);
    setQuestionTimer(60);
    setSetupError(null);
    setSaveError(null);
  }

  const currentQuestion = examQuestions[currentIndex];
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 md:px-8",
        questionLanguage === "Bengali" && "bn-readable"
      )}
    >
      {/* ── Busy overlay ─────────────────────────────────────────────────── */}
      {isBusy && (
        <div className="fixed inset-0 z-50 flex cursor-wait items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-xl border bg-background shadow-xl animate-in fade-in zoom-in-95 duration-200">

            {/* Animated progress bar — uses Tailwind arbitrary animation value */}
            <div className="h-[3px] w-full overflow-hidden bg-muted">
              <div className="h-full w-3/4 animate-[progress_2.4s_cubic-bezier(.4,0,.2,1)_infinite_alternate] rounded-r-full bg-primary" />
            </div>

            <div className="p-5">
              {/* Spinner + label */}
              <div className="flex items-center gap-3">
                <div className="relative h-7 w-7 shrink-0">
                  <svg viewBox="0 0 28 28" fill="none" className="h-7 w-7 animate-spin">
                    <circle
                      cx="14" cy="14" r="11"
                      stroke="currentColor"
                      strokeOpacity="0.15"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M25 14a11 11 0 0 0-11-11"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      className="text-primary"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium leading-snug">
                    {isGenerating
                      ? questionLanguage === "Bengali"
                        ? "MCQ তৈরি হচ্ছে, একটু অপেক্ষা করুন..."
                        : "Generating MCQs, please wait..."
                      : questionLanguage === "Bengali"
                        ? "সিলেবাস PDF বিশ্লেষণ চলছে..."
                        : "Analyzing syllabus PDF..."}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    {isGenerating
                      ? questionLanguage === "Bengali"
                        ? "Generating MCQs, please wait..."
                        : "MCQ তৈরি হচ্ছে, একটু অপেক্ষা করুন..."
                      : questionLanguage === "Bengali"
                        ? "Analyzing syllabus PDF..."
                        : "সিলেবাস PDF বিশ্লেষণ চলছে..."}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                <div
                  className="animate-shimmer h-2.5 w-full rounded-full bg-muted"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="animate-shimmer h-2.5 w-[88%] rounded-full bg-muted"
                  style={{ animationDelay: "80ms" }}
                />
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div
                    className="animate-shimmer h-[72px] rounded-lg border bg-muted/70"
                    style={{ animationDelay: "120ms" }}
                  />
                  <div
                    className="animate-shimmer h-[72px] rounded-lg border bg-muted/70"
                    style={{ animationDelay: "160ms" }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    className="animate-shimmer h-[72px] rounded-lg border bg-muted/70"
                    style={{ animationDelay: "200ms" }}
                  />
                  <div
                    className="animate-shimmer h-[72px] rounded-lg border bg-muted/70"
                    style={{ animationDelay: "240ms" }}
                  />
                </div>
                <div
                  className="animate-shimmer h-9 rounded-md border bg-muted/60"
                  style={{ animationDelay: "280ms" }}
                />
              </div>

              {/* Footer lock notice */}
              <div className="mt-4 flex items-center gap-2 border-t pt-3">
                <span className="inline-block h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-primary" />
                <p className="text-xs text-muted-foreground">
                  {questionLanguage === "Bengali"
                    ? "কাজ শেষ না হওয়া পর্যন্ত এই পর্দায় থাকুন।"
                    : "Stay on this screen until the work finishes."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────── */}

      <header className="border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">MCQ Smart Exam Platform</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-generated exams, timed answers, smart feedback, and progress analytics.
        </p>
      </header>

      {phase === "setup" && (
        <main className="grid gap-6 py-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-6 rounded-lg border p-4 md:p-5">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Start A New Exam</h2>
              <label htmlFor="learner" className="block text-sm font-medium">
                Learner Name
              </label>
              <input
                id="learner"
                value={learnerName}
                onChange={(e) => setLearnerName(e.target.value)}
                placeholder="Enter your name"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Choose Subjects</h3>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECTS.map((subject, index) => {
                  const active = selectedSubjects.includes(subject.value);
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleSubject(subject.value)}
                      className={`min-h-12 rounded-md border px-2 py-2 text-sm leading-tight font-medium whitespace-normal ${active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                        }`}
                    >
                      {subject.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Question Count (Auto)</h3>
              <p className="rounded-md border px-3 py-2 text-sm">
                {selectedSubjects.length} subjects x 10 MCQs ={" "}
                <span className="font-semibold">{questionCount}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Fixed rule: 10 MCQs per selected subject. Timer: 60 seconds per question.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Question Language</h3>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setQuestionLanguage(lang)}
                    className={`h-10 min-w-28 rounded-md border px-4 text-sm font-medium ${questionLanguage === lang
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                      }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Bengali mode generates full Bangla questions and explanations.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">BCS Syllabus PDF (Optional but recommended)</h3>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setSyllabusFile(e.target.files?.[0] ?? null)}
                className="block w-full cursor-pointer rounded-md border px-3 py-2 text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={parseSyllabusPdf}
                  disabled={isParsingSyllabus}
                >
                  {isParsingSyllabus ? "Reading PDF..." : "Split Syllabus Into 8 Parts"}
                </Button>
                {syllabusParts.length === 8 && (
                  <p className="self-center text-xs text-muted-foreground">
                    8-part syllabus is ready.
                  </p>
                )}
              </div>
              {syllabusError && <p className="text-sm text-destructive">{syllabusError}</p>}
              {syllabusParts.length > 0 && (
                <div className="grid gap-2 rounded-md border p-2 text-sm">
                  {syllabusParts.map((part) => (
                    <p key={part.partNumber}>
                      <span className="font-medium">Part {part.partNumber}:</span> {part.title}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {setupError && <p className="text-sm text-destructive">{setupError}</p>}
            {rateLimit && (
              <div className={`rounded-lg border p-3 text-sm ${rateLimit.blocked ? "border-destructive bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
                <p className="font-semibold">Premium Request Limit</p>
                <p>Today: {rateLimit.used}/{rateLimit.limit}</p>
                <p>Remaining: {rateLimit.remaining}</p>
                {rateLimit.blocked ? (
                  <p className="text-destructive font-medium">
                    Locked. You requested more than 5 times. Unlock in {unlockCountdown}.
                  </p>
                ) : (
                  <p className="text-muted-foreground">You can still request new MCQs today.</p>
                )}
              </div>
            )}
            <Button size="lg" onClick={startExam} disabled={isGenerating || rateLimit?.blocked}>
              {isGenerating ? "Generating With AI..." : "Start Exam"}
            </Button>
            {rateLimit?.blocked && (
              <p className="text-sm text-destructive">
                You have requested more than 5 times. Unlock in about {rateLimit.resetInHours} hours.
              </p>
            )}
          </section>

          <aside className="space-y-4 rounded-lg border p-4 md:p-5">
            <h2 className="text-lg font-semibold">Biodata Report</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Total Exams</p>
                <p className="text-xl font-semibold">{history.length}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Best Score</p>
                <p className="text-xl font-semibold">{bestScore}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Average</p>
                <p className="text-xl font-semibold">{avgScoreHistory}%</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-muted-foreground">Recent Trend</p>
                <p className="text-xl font-semibold">
                  {trendDelta > 0 ? `+${trendDelta}%` : `${trendDelta}%`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Premium Request Limit</h3>
              {loadingLimit && <p className="text-sm text-muted-foreground">Loading limit...</p>}
              {!loadingLimit && rateLimit && (
                <div className="rounded-md border p-3 text-sm">
                  <p>Requested today: <span className="font-semibold">{rateLimit.used}/{rateLimit.limit}</span></p>
                  <p>Remaining today: <span className="font-semibold">{rateLimit.remaining}</span></p>
                  <p>Unlock in: <span className="font-semibold">{rateLimit.blocked ? unlockCountdown : `${rateLimit.resetInHours} hours`}</span></p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Recent Attempts</h3>
              {loadingHistory && (
                <p className="text-sm text-muted-foreground">Loading attempts...</p>
              )}
              {!loadingHistory && latestAttempts.length === 0 && (
                <p className="text-sm text-muted-foreground">No attempts yet.</p>
              )}
              {latestAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{attempt.learnerName}</p>
                  <p className="text-muted-foreground">{formatDate(attempt.createdAt)}</p>
                  <p>
                    {attempt.accuracyPercent}% | {attempt.language}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </main>
      )}

      {phase === "exam" && currentQuestion && (
        <main className="grid gap-6 py-6 lg:grid-cols-[2fr_1fr]">
          <section className="space-y-4 rounded-lg border p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                Question {currentIndex + 1} of {examQuestions.length}
              </p>
              <p
                className={`rounded-md border px-3 py-1 text-sm font-semibold ${questionTimer <= 10 ? "border-destructive text-destructive" : ""
                  }`}
              >
                {formatClock(questionTimer)}
              </p>
            </div>

            <h2 className="text-lg font-semibold">{currentQuestion.question}</h2>
            <p className="text-sm text-muted-foreground">
              Subject: {currentQuestion.subject} | Topic: {currentQuestion.topic} | Language:{" "}
              {currentQuestion.language}
              {" | "}Difficulty: {currentQuestion.difficulty}
              {currentQuestion.syllabusPart ? ` | Part: ${currentQuestion.syllabusPart}` : ""}
            </p>

            <div className="grid gap-2">
              {currentQuestion.options.map((option, idx) => {
                const active = answers[currentIndex] === idx;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => answerCurrentQuestion(idx)}
                    disabled={questionTimer === 0}
                    className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted"
                      }`}
                  >
                    {String.fromCharCode(65 + idx)}. {option}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={goToNextQuestion}
                disabled={currentIndex === examQuestions.length - 1}
              >
                Next
              </Button>
              <Button onClick={submitExam} disabled={isSavingAttempt}>
                {isSavingAttempt ? "Saving..." : "Submit Exam"}
              </Button>
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            {questionTimer === 0 && (
              <p className="text-sm text-destructive">
                Time is up for this question. Move to the next question or submit the exam.
              </p>
            )}
          </section>

          <aside className="space-y-4 rounded-lg border p-4 md:p-5">
            <div>
              <h3 className="text-sm font-semibold">Progress</h3>
              <p className="text-sm text-muted-foreground">
                Answered {answeredCount}/{examQuestions.length}
              </p>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {examQuestions.map((q, idx) => {
                const answered = answers[idx] !== null;
                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(idx)}
                    className={`h-9 rounded-md border text-xs font-semibold ${idx === currentIndex
                      ? "border-primary bg-primary text-primary-foreground"
                      : answered
                        ? "border-border bg-muted"
                        : "border-border bg-background"
                      }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </aside>
        </main>
      )}

      {phase === "result" && (
        <main className="space-y-6 py-6">
          <section className="grid gap-4 rounded-lg border p-4 md:grid-cols-4 md:p-5">
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-semibold">
                {score.correct}/{examQuestions.length}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Accuracy</p>
              <p className="text-2xl font-semibold">{score.accuracyPercent}%</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Wrong</p>
              <p className="text-2xl font-semibold">{score.wrong}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-sm text-muted-foreground">Avg Time / Q</p>
              <p className="text-2xl font-semibold">{avgTimePerQuestion}s</p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4 rounded-lg border p-4 md:p-5">
              <h2 className="text-lg font-semibold">AI Review</h2>
              <p className="text-sm">{smartReview.summary}</p>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Strengths</h3>
                {smartReview.strengths.map((line) => (
                  <p key={line} className="text-sm text-muted-foreground">
                    - {line}
                  </p>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">What To Improve</h3>
                {smartReview.improvements.map((line) => (
                  <p key={line} className="text-sm text-muted-foreground">
                    - {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-lg border p-4 md:p-5">
              <h2 className="text-lg font-semibold">Improvement Graph</h2>
              {history.length <= 1 && (
                <p className="text-sm text-muted-foreground">
                  Take at least 2 exams to see trend movement.
                </p>
              )}
              {history.length > 1 && (
                <svg
                  viewBox="0 0 320 160"
                  className="h-auto w-full rounded-md border bg-background"
                >
                  <line
                    x1="20" y1="140" x2="300" y2="140"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <line
                    x1="20" y1="20" x2="20" y2="140"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    points={history
                      .slice()
                      .reverse()
                      .map((item, index, arr) => {
                        const x = 20 + (index * 280) / Math.max(arr.length - 1, 1);
                        const y = 140 - (item.accuracyPercent / 100) * 120;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              )}

              <div className="grid grid-cols-2 gap-2 text-sm">
                {SUBJECTS.map((subject) => (
                  <div key={subject.name} className="rounded-md border p-2">
                    <p className="font-medium">{subject.name}</p>
                    <p className="text-muted-foreground">
                      {subjectStats[subject.value]?.accuracy ?? 0}% correct
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border p-4 md:p-5">
            <div className="flex flex-wrap gap-2">
              <Button onClick={resetToSetup}>Take Another Exam</Button>
              <Button
                variant="outline"
                onClick={() =>
                  exportQuestionsOnlyToPrintWindow({
                    learnerName: learnerName.trim() || "Learner",
                    subjects: selectedSubjects,
                    language: questionLanguage,
                    questions: examQuestions,
                  })
                }
              >
                Export Question Paper (PDF)
              </Button>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border p-4 md:p-5">
            <h2 className="text-lg font-semibold">Detailed Answer Explanation</h2>
            {examQuestions.map((q, idx) => {
              const answerIndex = answers[idx];
              const isCorrect = answerIndex === q.correctIndex;
              return (
                <article key={q.id} className="rounded-md border p-3">
                  <h3 className="font-medium">
                    Q{idx + 1}. {q.question}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your answer:{" "}
                    {answerIndex === null ? "Not answered" : q.options[answerIndex]}
                  </p>
                  <p
                    className={`mt-1 text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}
                  >
                    {isCorrect ? "Correct" : "Incorrect"} | Correct answer:{" "}
                    {q.options[q.correctIndex]}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Difficulty: {q.difficulty}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Explanation: {q.explanation}
                  </p>
                </article>
              );
            })}
          </section>
        </main>
      )}
    </div>
  );
}
