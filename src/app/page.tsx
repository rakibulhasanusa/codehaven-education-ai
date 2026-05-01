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
  const labels = input.language === "Bengali" ? ["ক", "খ", "গ", "ঘ"] : ["A", "B", "C", "D"];
  const pages = Array.from({ length: Math.ceil(input.questions.length / 20) }, (_, index) =>
    input.questions.slice(index * 20, index * 20 + 20)
  );
  if (input.language === "Bengali") {
    labels[0] = "ক";
    labels[1] = "খ";
    labels[2] = "গ";
    labels[3] = "ঘ";
  }
  const duration = input.questions.length;

  const renderColumn = (items: MCQQuestion[], start: number) =>
    items
      .map((q, index) => {
        const n = start + index + 1;
        return `
        <article style="break-inside:avoid;margin-bottom:5px">
          <p style="margin:0 0 2px 0;font-weight:700;line-height:1.25;font-size:10.8px">${n}. ${escapeHtml(q.question)}</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1px 7px;font-size:9.8px;line-height:1.22">
            ${q.options
            .map((opt, i) => `<p style="margin:0">${labels[i]}. ${escapeHtml(opt)}</p>`)
            .join("")}
          </div>
        </article>
      `;
      })
      .join("");

  const renderPage = (items: MCQQuestion[], pageIndex: number) => {
    const pageLeft = items.slice(0, 10);
    const pageRight = items.slice(10, 20);
    const pageStart = pageIndex * 20;

    return `
      <section class="page">
        <div class="masthead">
          <div>
            <p class="eyebrow">BCS Smart Practice</p>
            <h1>${input.language === "Bengali" ? "বিসিএস প্রস্তুতি" : "BCS Question Paper"}</h1>
          </div>
          <div class="badge">${input.questions.length} MCQ</div>
        </div>
        <div class="paper-title">
          <h2>${input.language === "Bengali" ? "কঠিন মডেল টেস্ট" : "Advanced Model Test"}</h2>
          <p>${input.language === "Bengali" ? "প্রতিটি প্রশ্নের মান সমান। ভুল উত্তরে ০.২৫ নম্বর কাটা হবে।" : "Each question carries equal marks. Negative marking: 0.25 per wrong answer."}</p>
        </div>
        <div class="meta">
          <span>${input.language === "Bengali" ? "সময়" : "Time"}: ${duration} ${input.language === "Bengali" ? "মিনিট" : "minutes"}</span>
          <span>${input.language === "Bengali" ? "তারিখ" : "Date"}: ${new Date().toLocaleDateString("en-GB")}</span>
          <span>${input.language === "Bengali" ? "পূর্ণমান" : "Marks"}: ${input.questions.length}</span>
        </div>
        <div class="candidate">
          <span>${input.language === "Bengali" ? "প্রার্থী" : "Candidate"}: ${escapeHtml(input.learnerName)}</span>
          <span>${input.language === "Bengali" ? "বিষয়" : "Subjects"}: ${escapeHtml(input.subjects.join(", "))}</span>
        </div>
        <div class="columns">
          <section>${renderColumn(pageLeft, pageStart)}</section>
          <section class="col-right">${renderColumn(pageRight, pageStart + 10)}</section>
        </div>
        <div class="page-footer">${pageIndex + 1} / ${pages.length}</div>
      </section>
    `;
  };

  const popup = window.open("", "_blank", "width=1024,height=900");
  if (!popup) {
    return;
  }

  popup.document.write(`
    <html>
      <head>
        <title>BCS MCQ Question Paper</title>
        <style>
          @page{size:A4;margin:9mm;}
          body{
            font-family: "Noto Sans Bengali","Hind Siliguri","SolaimanLipi","Kalpurush","Arial",sans-serif;
            background:#f3f4f1;
            color:#171717;
            margin:0;
            padding:0;
          }
          .page{box-sizing:border-box;min-height:297mm;padding:10mm;background:#fffdfa;page-break-after:always;}
          .header-mini,.hero,.exam-title,.subtitle{display:none;}
          .page:last-child{page-break-after:auto;}
          .masthead{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:7px;margin-bottom:8px;}
          .eyebrow{margin:0 0 2px 0;font-size:10px;text-transform:uppercase;letter-spacing:1.8px;color:#5f574b;}
          h1{margin:0;font-size:22px;line-height:1.1;letter-spacing:0;}
          .badge{border:1px solid #111827;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:700;}
          .paper-title{text-align:center;margin:6px 0 8px;}
          .paper-title h2{margin:0;font-size:18px;line-height:1.2;}
          .paper-title p{margin:3px 0 0;font-size:10.5px;color:#4b5563;}
          .meta,.candidate{display:flex;justify-content:space-between;gap:8px;border:1px solid #d8d3c8;background:#fbfaf6;padding:5px 7px;font-size:10.5px;font-weight:600;margin-bottom:5px;}
          .candidate{font-weight:500;margin-bottom:8px;}
          .columns{display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:start;}
          .col-right{border-left:1px solid #c9c2b7;padding-left:14px;}
          .page-footer{margin-top:6px;text-align:center;font-size:9px;color:#6b6258;}
          @media print { body{background:#fff;} .page{min-height:auto;padding:0;} }
        </style>
      </head>
      <body>
        <p class="header-mini">Recent Job Solution</p>
        <div class="hero">বিসিএস প্রস্তুতি</div>
        <h2 class="exam-title">পদের নাম: অফিসার</h2>
        <p class="subtitle">[প্রতিটি প্রশ্নের মান সমান। প্রতিটি ভুল উত্তরের জন্য .২৫ নম্বর কাটা যাবে।]</p>
        <div class="meta">
          <span>সময়: ${duration} মিনিট</span>
          <span>তারিখ: ${new Date().toLocaleDateString("en-GB")}</span>
          <span>পূর্ণমান: ${input.questions.length}</span>
        </div>
        <div class="meta" style="margin-bottom:14px;font-weight:500">
          <span>প্রার্থী: ${escapeHtml(input.learnerName)}</span>
          <span>ভাষা: ${input.language}</span>
        </div>
        ${pages.map(renderPage).join("")}
      </body>
    </html>
  `);

  popup.document.close();
  popup.focus();
  popup.print();
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
      const payload = (await res.json()) as GenerateResponse & { error?: string };
      if (!res.ok) {
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
            <Button size="lg" onClick={startExam} disabled={isGenerating}>
              {isGenerating ? "Generating With AI..." : "Start Exam"}
            </Button>
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