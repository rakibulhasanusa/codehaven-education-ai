"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildSmartReview, calculateScore, calculateSubjectStats } from "@/lib/mcq/analytics";
import { cn } from "@/lib/utils";
import type {
  AttemptRecord,
  MCQQuestion,
  QuestionLanguage,
  Subject,
} from "@/lib/mcq/types";

const LANGUAGES: QuestionLanguage[] = ["English", "Bengali"];
const DEVICE_ID_STORAGE_KEY = "mcq_device_id_v1";

type ExamPhase = "setup" | "exam" | "result";

type GenerateResponse = {
  requestId: string;
  questions: MCQQuestion[];
};

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

export default function BcsExamApp() {
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [phase, setPhase] = useState<ExamPhase>("setup");
  const [learnerName, setLearnerName] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [questionLanguage, setQuestionLanguage] = useState<QuestionLanguage>("Bengali");
  const [referenceYearFrom] = useState("");
  const [referenceYearTo] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingAttempt, setIsSavingAttempt] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [examQuestions, setExamQuestions] = useState<MCQQuestion[]>([]);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [aiReview, setAiReview] = useState<{
    summary: string;
    strengths: string[];
    improvements: string[];
    weakTopics: string[];
    estimatedPreparationLevel: string;
  } | null>(null);
  const [answers, setAnswers] = useState<Array<number | null>>([]);
  const [timeSpent, setTimeSpent] = useState<number[]>([]);
  const [examTimer, setExamTimer] = useState(0);
  const [elapsedExamSeconds, setElapsedExamSeconds] = useState(0);
  const [history, setHistory] = useState<AttemptRecord[]>([]);
  const timerRef = useRef<number | null>(null);
  const isBusy = isGenerating;

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      const res = await fetch("/api/attempts?limit=20", { cache: "no-store" });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setHistory([]);
        return;
      }

      const payload = (await res.json()) as unknown;
      if (!res.ok) {
        setHistory([]);
        return;
      }

      setHistory(Array.isArray(payload) ? (payload as AttemptRecord[]) : []);
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadHistory();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/admin/subjects", { cache: "no-store" });
        const json = (await response.json()) as { subjects?: string[] };
        if (!response.ok || cancelled) return;

        const subjects = Array.isArray(json.subjects)
          ? json.subjects
            .map((s) => {
              if (typeof s === "string") return s;
              if (s && typeof s === "object" && "name" in s) return String((s as { name: unknown }).name || "");
              return "";
            })
            .filter(Boolean)
          : [];
        if (!subjects.length) {
          setAvailableSubjects([]);
          setSelectedSubjects([]);
          return;
        }

        setAvailableSubjects(subjects);
        setSelectedSubjects((prev) => {
          const kept = prev.filter((subject) => subjects.includes(subject));
          return kept.length ? kept : [subjects[0]];
        });
      } catch {
        if (!cancelled) {
          setAvailableSubjects([]);
          setSelectedSubjects([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "exam") {
      return;
    }

    timerRef.current = window.setInterval(() => {
      setExamTimer((prev) => (prev <= 0 ? 0 : prev - 1));
      setElapsedExamSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [phase]);

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
    if (!examQuestions.length) {
      return 0;
    }
    return Math.round(elapsedExamSeconds / examQuestions.length);
  }, [elapsedExamSeconds, examQuestions.length]);

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
  const isBn = questionLanguage === "Bengali";
  const questionCount = Math.max(1, selectedSubjects.length) * 10;
  const perSubjectQuestionCount = 10;
  const uiPlannedQuestionCount = Math.max(1, selectedSubjects.length) * perSubjectQuestionCount;

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
    if (selectedSubjects.length === 0) {
      setSetupError(isBn ? "কোনো বিষয় পাওয়া যায়নি। আগে admin থেকে বিষয় যোগ করুন।" : "No subjects available. Please add subjects from admin first.");
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/bcs/generate-mcqs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": getDeviceId(),
        },
        body: JSON.stringify({
          learnerName: learnerName.trim() || "Learner",
          subjects: selectedSubjects,
          language: questionLanguage,
          questionCount,
          referenceYearFrom: referenceYearFrom.trim() ? Number(referenceYearFrom.trim()) : undefined,
          referenceYearTo: referenceYearTo.trim() ? Number(referenceYearTo.trim()) : undefined,
        }),
      });
      const payload = (await res.json()) as GenerateResponse & { error?: string };
      if (!res.ok) {
        throw new Error(payload.error || (isBn ? "পরীক্ষার প্রশ্ন তৈরি করা যায়নি।" : "Failed to generate exam questions."));
      }

      const generated = payload.questions ?? [];
      if (!generated.length) {
        throw new Error(isBn ? "AI থেকে কোনো প্রশ্ন পাওয়া যায়নি।" : "No questions received from AI.");
      }
      if (!payload.requestId) {
        throw new Error(isBn ? "ব্যাকএন্ড থেকে request id পাওয়া যায়নি।" : "Generation request id not returned from backend.");
      }

      setActiveRequestId(payload.requestId);
      setExamQuestions(generated);
      setAnswers(Array(generated.length).fill(null));
      setTimeSpent(Array(generated.length).fill(0));
      setExamTimer(generated.length * 60);
      setElapsedExamSeconds(0);
      setPhase("exam");
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : (isBn ? "প্রশ্ন তৈরি করা যায়নি।" : "Unable to generate questions."));
    } finally {
      setIsGenerating(false);
    }
  }

  function answerQuestion(questionIndex: number, optionIndex: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[questionIndex] = optionIndex;
      return next;
    });
  }

  async function submitExam() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
    }
    setSaveError(null);
    setIsSavingAttempt(true);
    try {
      if (!activeRequestId) {
        throw new Error(isBn ? "Request id পাওয়া যায়নি। আবার পরীক্ষা তৈরি করুন।" : "Missing request id. Please regenerate the exam.");
      }

      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: activeRequestId,
          learnerName: learnerName.trim() || "Learner",
          language: questionLanguage,
          subjects: selectedSubjects,
          answers,
          timeSpent,
          questionCount: examQuestions.length,
          score: score.correct,
          wrong: score.wrong,
          unanswered: score.unanswered,
          accuracyPercent: score.accuracyPercent,
          avgTimePerQuestion,
        }),
      });

      const payload = (await res.json()) as { error?: string; review?: typeof aiReview };
      if (!res.ok) {
        throw new Error(payload.error || (isBn ? "পরীক্ষার ফলাফল সেভ করা যায়নি।" : "Failed to save exam attempt."));
      }
      if (payload.review) setAiReview(payload.review);

      await loadHistory();
      const evenSplit = examQuestions.length
        ? Math.round(elapsedExamSeconds / examQuestions.length)
        : 0;
      setTimeSpent(Array(examQuestions.length).fill(evenSplit));
      setPhase("result");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : (isBn ? "পরীক্ষার ফলাফল সেভ করা যায়নি।" : "Failed to save exam attempt."));
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
    setExamTimer(0);
    setElapsedExamSeconds(0);
    setSetupError(null);
    setSaveError(null);
    setAiReview(null);
  }

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
                      ? isBn
                        ? "MCQ তৈরি হচ্ছে, একটু অপেক্ষা করুন..."
                        : "Generating MCQs, please wait..."
                      : isBn
                        ? "সিলেবাস PDF বিশ্লেষণ চলছে..."
                        : "Analyzing syllabus PDF..."}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                    {isGenerating
                      ? isBn
                        ? "বাংলা প্রশ্ন, উত্তর ও ব্যাখ্যা তৈরি করা হচ্ছে।"
                        : "Generating questions, options, and explanations."
                      : isBn
                        ? "সোর্স কনটেক্সট যাচাই করা হচ্ছে।"
                        : "Validating source context."}
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
                <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                  <div
                    className="animate-shimmer h-[72px] rounded-lg border bg-muted/70"
                    style={{ animationDelay: "120ms" }}
                  />
                  <div
                    className="animate-shimmer h-[72px] rounded-lg border bg-muted/70"
                    style={{ animationDelay: "160ms" }}
                  />
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                  {isBn
                    ? "কাজ শেষ না হওয়া পর্যন্ত এই পর্দায় থাকুন।"
                    : "Stay on this screen until the work finishes."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ────────────────────────────────────────────────────────────────── */}

      <header className="premium-panel rounded-2xl px-4 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{isBn ? "প্রিমিয়াম প্র্যাকটিস স্যুট" : "Premium Practice Suite"}</p>
        <h1 className="premium-title mt-1 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">{isBn ? "MCQ স্মার্ট এক্সাম প্ল্যাটফর্ম" : "MCQ Smart Exam Platform"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isBn
            ? "AI-জেনারেটেড পরীক্ষা, নির্ধারিত সময়, স্মার্ট ফিডব্যাক এবং প্রগ্রেস অ্যানালিটিক্স।"
            : "AI-generated exams, timed answers, smart feedback, and progress analytics."}
        </p>
      </header>

      {phase === "setup" && (
        <main className="grid gap-6 py-6 lg:grid-cols-[2fr_1fr]">
          <section className="premium-panel space-y-6 rounded-2xl p-4 md:p-5">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{isBn ? "নতুন পরীক্ষা শুরু করুন" : "Start A New Exam"}</h2>
              <label htmlFor="learner" className="block text-sm font-medium">
                {isBn ? "পরীক্ষার্থীর নাম" : "Learner Name"}
              </label>
              <input
                id="learner"
                value={learnerName}
                onChange={(e) => setLearnerName(e.target.value)}
                placeholder={isBn ? "আপনার নাম লিখুন" : "Enter your name"}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-semibold">{isBn ? "বিষয় নির্বাচন করুন" : "Choose Subjects"}</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {availableSubjects.map((subject) => {
                  const active = selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`min-h-12 rounded-md border px-2 py-2 text-sm leading-tight font-medium whitespace-normal ${active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-muted"
                        }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{isBn ? "প্রশ্ন সংখ্যা (অটো)" : "Question Count (Auto)"}</h3>
              <p className="rounded-md border px-3 py-2 text-sm">
                {isBn ? "বর্তমান পরীক্ষার মোট প্রশ্ন:" : "Current total exam questions:"}{" "}
                <span className="font-semibold">{questionCount}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {isBn
                  ? `ফ্রন্টএন্ড নিয়ম: প্রতি বিষয় ${perSubjectQuestionCount}টি (মোট পরিকল্পিত ${uiPlannedQuestionCount})।`
                  : `Frontend rule: ${perSubjectQuestionCount} per subject (planned total ${uiPlannedQuestionCount}).`}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{isBn ? "প্রশ্নের ভাষা" : "Question Language"}</h3>
              <div className="flex flex-wrap gap-2">
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
                {isBn ? "বাংলা মোডে UI-ও বাংলায় দেখানো হবে।" : "Bengali mode renders the UI in Bengali."}
              </p>
            </div>
            
            {setupError && <p className="text-sm text-destructive">{setupError}</p>}
            <Button size="lg" onClick={startExam} disabled={isGenerating || selectedSubjects.length === 0}>
              {isGenerating ? (isBn ? "AI দিয়ে প্রশ্ন তৈরি হচ্ছে..." : "Generating With AI...") : (isBn ? "পরীক্ষা শুরু করুন" : "Start Exam")}
            </Button>
          </section>

          <aside className="premium-panel space-y-4 rounded-2xl p-4 md:p-5">
            <h2 className="text-lg font-semibold">Biodata Report</h2>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border bg-background/70 p-3">
                <p className="text-muted-foreground">Total Exams</p>
                <p className="text-xl font-semibold">{history.length}</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <p className="text-muted-foreground">Best Score</p>
                <p className="text-xl font-semibold">{bestScore}%</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <p className="text-muted-foreground">Average</p>
                <p className="text-xl font-semibold">{avgScoreHistory}%</p>
              </div>
              <div className="rounded-xl border bg-background/70 p-3">
                <p className="text-muted-foreground">Recent Trend</p>
                <p className="text-xl font-semibold">
                  {trendDelta > 0 ? `+${trendDelta}%` : `${trendDelta}%`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Recent Attempts</h3>
              {loadingHistory && (
                <div className="space-y-2">
                  <div className="h-16 animate-pulse rounded-xl border bg-background/70" />
                  <div className="h-16 animate-pulse rounded-xl border bg-background/70" />
                  <div className="h-16 animate-pulse rounded-xl border bg-background/70" />
                </div>
              )}
              {!loadingHistory && latestAttempts.length === 0 && (
                <p className="text-sm text-muted-foreground">No attempts yet.</p>
              )}
              {latestAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-xl border bg-background/70 p-3 text-sm">
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

      {phase === "exam" && examQuestions.length > 0 && (
        <main className="grid gap-6 py-6 lg:grid-cols-[2fr_1fr]">
          <section className="premium-panel space-y-4 rounded-2xl p-4 md:p-5">
            <div className="sticky top-3 z-20 flex items-center justify-between gap-3 rounded-xl border bg-background/95 px-3 py-2 shadow-sm backdrop-blur">
              <p className="text-sm font-medium">
                {isBn ? `সব প্রশ্ন (${examQuestions.length})` : `All Questions (${examQuestions.length})`}
              </p>
              <p
                className={`rounded-md border px-3 py-1 text-sm font-semibold ${examTimer <= 60 ? "border-destructive text-destructive" : ""
                  }`}
              >
                {formatClock(examTimer)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {isBn
                ? "পুরো পরীক্ষার জন্য একটি কমন টাইমার চলছে। নিচের তালিকা থেকে উত্তর দিন।"
                : "One combined timer is running for the full exam. Answer from the full list below."}
            </p>
            <div className="space-y-4">
              {examQuestions.map((question, qIdx) => (
                <article key={question.id} className="rounded-xl border p-4">
                  <h2 className="text-base font-semibold">
                    {qIdx + 1}. {question.question}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isBn ? "বিষয়" : "Subject"}: {question.subject} | {isBn ? "টপিক" : "Topic"}: {question.topic} | {isBn ? "ভাষা" : "Language"}: {question.language}
                    {" | "}{isBn ? "কঠিনতা" : "Difficulty"}: {question.difficulty}
                    {question.syllabusPart ? ` | ${isBn ? "অংশ" : "Part"}: ${question.syllabusPart}` : ""}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {question.options.map((option, oIdx) => {
                      const active = answers[qIdx] === oIdx;
                      return (
                        <button
                          key={`${question.id}-${oIdx}`}
                          type="button"
                          onClick={() => answerQuestion(qIdx, oIdx)}
                          disabled={examTimer === 0}
                          className={`min-h-11 rounded-md border px-3 py-2 text-left text-sm ${active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background hover:bg-muted"
                            }`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {option}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={submitExam} disabled={isSavingAttempt}>
                {isSavingAttempt ? (isBn ? "সেভ হচ্ছে..." : "Saving...") : (isBn ? "পরীক্ষা জমা দিন" : "Submit Exam")}
              </Button>
            </div>
            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            {examTimer === 0 && (
              <p className="text-sm text-destructive">
                {isBn ? "পরীক্ষার সময় শেষ। এখনই জমা দিন।" : "Total exam time is over. Please submit now."}
              </p>
            )}
          </section>
          <aside className="premium-panel sticky top-3 h-fit space-y-4 rounded-2xl p-4 md:p-5">
            <div>
              <h3 className="text-sm font-semibold">{isBn ? "পরীক্ষার অবস্থা" : "Exam Status"}</h3>
              <p className="text-sm text-muted-foreground">
                {isBn ? "উত্তর দেওয়া হয়েছে" : "Answered"} {answeredCount}/{examQuestions.length}
              </p>
              <p className="text-sm text-muted-foreground">{isBn ? "বাকি সময়" : "Time Left"}: {formatClock(examTimer)}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 text-center text-sm sm:grid-cols-3">
              <div className="rounded-lg border bg-background/70 p-2">
                <p className="text-muted-foreground">{isBn ? "উত্তর দেওয়া" : "Answered"}</p>
                <p className="font-semibold">{answeredCount}</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-2">
                <p className="text-muted-foreground">{isBn ? "বাকি" : "Left"}</p>
                <p className="font-semibold">{score.unanswered}</p>
              </div>
              <div className="rounded-lg border bg-background/70 p-2">
                <p className="text-muted-foreground">{isBn ? "মোট" : "Total"}</p>
                <p className="font-semibold">{examQuestions.length}</p>
              </div>
            </div>
            <Button onClick={submitExam} disabled={isSavingAttempt} className="w-full">
              {isSavingAttempt ? (isBn ? "সেভ হচ্ছে..." : "Saving...") : (isBn ? "পরীক্ষা জমা দিন" : "Submit Exam")}
            </Button>
          </aside>
        </main>
      )}

      {phase === "result" && (
        <main className="space-y-6 py-6">
          <section className="premium-panel grid gap-4 rounded-2xl p-4 md:grid-cols-4 md:p-5">
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-sm text-muted-foreground">{isBn ? "স্কোর" : "Score"}</p>
              <p className="text-2xl font-semibold">
                {score.correct}/{examQuestions.length}
              </p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-sm text-muted-foreground">{isBn ? "সঠিকতার হার" : "Accuracy"}</p>
              <p className="text-2xl font-semibold">{score.accuracyPercent}%</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-sm text-muted-foreground">{isBn ? "ভুল" : "Wrong"}</p>
              <p className="text-2xl font-semibold">{score.wrong}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-sm text-muted-foreground">{isBn ? "প্রতি প্রশ্নে গড় সময়" : "Avg Time / Q"}</p>
              <p className="text-2xl font-semibold">{avgTimePerQuestion}s</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-sm text-muted-foreground">{isBn ? "উত্তর দেওয়া" : "Answered"}</p>
              <p className="text-2xl font-semibold">
                {answeredCount}/{examQuestions.length}
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="premium-panel space-y-4 rounded-2xl p-4 md:p-5">
              <h2 className="text-lg font-semibold">{isBn ? "AI রিভিউ" : "AI Review"}</h2>
              <p className="text-sm">{aiReview?.summary ?? smartReview.summary}</p>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{isBn ? "শক্তির দিক" : "Strengths"}</h3>
                {(aiReview?.strengths ?? smartReview.strengths).map((line) => (
                  <p key={line} className="text-sm text-muted-foreground">
                    - {line}
                  </p>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{isBn ? "যা উন্নত করা দরকার" : "What To Improve"}</h3>
                {(aiReview?.improvements ?? smartReview.improvements).map((line) => (
                  <p key={line} className="text-sm text-muted-foreground">
                    - {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="premium-panel space-y-4 rounded-2xl p-4 md:p-5">
              <h2 className="text-lg font-semibold">{isBn ? "উন্নতির গ্রাফ" : "Improvement Graph"}</h2>
              {history.length <= 1 && (
                <p className="text-sm text-muted-foreground">
                  {isBn ? "ট্রেন্ড দেখতে অন্তত ২টি পরীক্ষা দিন।" : "Take at least 2 exams to see trend movement."}
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

              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {Object.keys(subjectStats).map((subject) => (
                  <div key={subject} className="rounded-md border p-2">
                    <p className="font-medium">{subject}</p>
                    <p className="text-muted-foreground">
                      {isBn ? `${subjectStats[subject]?.accuracy ?? 0}% সঠিক` : `${subjectStats[subject]?.accuracy ?? 0}% correct`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="premium-panel space-y-3 rounded-2xl p-4 md:p-5">
            <div className="flex flex-wrap gap-2">
              <Button onClick={resetToSetup}>{isBn ? "আরেকটি পরীক্ষা দিন" : "Take Another Exam"}</Button>
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
                {isBn ? "প্রশ্নপত্র এক্সপোর্ট (PDF)" : "Export Question Paper (PDF)"}
              </Button>
            </div>
          </section>

          <section className="premium-panel space-y-3 rounded-2xl p-4 md:p-5">
            <h2 className="text-lg font-semibold">{isBn ? "বিস্তারিত উত্তর ব্যাখ্যা" : "Detailed Answer Explanation"}</h2>
            {examQuestions.map((q, idx) => {
              const answerIndex = answers[idx];
              const isCorrect = answerIndex === q.correctIndex;
              return (
                <article key={q.id} className="rounded-md border p-3">
                  <h3 className="font-medium">
                    Q{idx + 1}. {q.question}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isBn ? "আপনার উত্তর" : "Your answer"}:{" "}
                    {answerIndex === null ? (isBn ? "উত্তর দেওয়া হয়নি" : "Not answered") : q.options[answerIndex]}
                  </p>
                  <p
                    className={`mt-1 text-sm font-medium ${isCorrect ? "text-green-600" : "text-red-600"}`}
                  >
                    {isCorrect ? (isBn ? "সঠিক" : "Correct") : (isBn ? "ভুল" : "Incorrect")} | {isBn ? "সঠিক উত্তর" : "Correct answer"}:{" "}
                    {q.options[q.correctIndex]}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isBn ? "কঠিনতা" : "Difficulty"}: {q.difficulty}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isBn ? "ব্যাখ্যা" : "Explanation"}: {q.explanation}
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
