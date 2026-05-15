"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type QuestionLanguage = "English" | "Bengali";

type MCQQuestion = {
  question: string;
  options: [string, string, string, string];
};

type DraftMCQ = {
  question: string;
  options: [string, string, string, string];
};

type SavedDraft = {
  paperTitle: string;
  learnerName: string;
  language: QuestionLanguage;
  targetCount: number;
  questions: MCQQuestion[];
};

const STORAGE_KEY = "mcq_paper_builder_draft_v1";
const BN_LABELS = ["\u0995", "\u0996", "\u0997", "\u0998"] as const;
const EN_LABELS = ["A", "B", "C", "D"] as const;

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
  language: QuestionLanguage;
  questions: MCQQuestion[];
  title: string;
}) {
  const isBn = input.language === "Bengali";
  const labels = isBn ? BN_LABELS : EN_LABELS;
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
              BCS Smart Practice - Official Mock
            </p>
            <h1 style="margin:0;font-size:18px;font-weight:700;line-height:1.1;color:#111;font-family:'Playfair Display',Georgia,serif">
              ${escapeHtml(input.title)}
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

        <div style="display:flex;justify-content:space-between;align-items:center;background:#f2ede4;border:0.5px solid #c9c0af;padding:4px 10px;margin-bottom:4px;font-size:9px;font-weight:600;color:#3a3328;letter-spacing:0.2px;">
          <span>${isBn ? "\u09b8\u09ae\u09df" : "Time"}: ${duration} ${isBn ? "\u09ae\u09bf\u09a8\u09bf\u099f" : "mins"}</span>
          <span>${isBn ? "\u09a4\u09be\u09b0\u09bf\u0996" : "Date"}: ${today}</span>
          <span>${isBn ? "\u09aa\u09c2\u09b0\u09cd\u09a3\u09ae\u09be\u09a8" : "Marks"}: ${input.questions.length}</span>
          <span>${isBn ? "\u09aa\u09cd\u09b0\u09be\u09b0\u09cd\u09a5\u09c0" : "Learner"}: ${escapeHtml(input.learnerName)}</span>
        </div>

        <p style="text-align:center;font-size:8.5px;color:#7a6e5e;font-style:italic;margin:0 0 6px;padding-bottom:6px;border-bottom:0.5px dashed #c9c0af;">
          ${isBn
            ? "\u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09aa\u09cd\u09b0\u09b6\u09cd\u09a8\u09c7\u09b0 \u09ae\u09be\u09a8 \u09b8\u09ae\u09be\u09a8\u0964 \u09aa\u09cd\u09b0\u09a4\u09bf\u099f\u09bf \u09ad\u09c1\u09b2 \u0989\u09a4\u09cd\u09a4\u09b0\u09c7\u09b0 \u099c\u09a8\u09cd\u09af \u09e6.\u09e8\u09eb \u09a8\u09ae\u09cd\u09ac\u09b0 \u0995\u09be\u099f\u09be \u09b9\u09ac\u09c7\u0964 \u0985\u09a8\u09c1\u09a4\u09cd\u09a4\u09b0\u09bf\u09a4 \u09aa\u09cd\u09b0\u09b6\u09cd\u09a8\u09c7 \u0995\u09cb\u09a8\u09cb \u09a8\u09ae\u09cd\u09ac\u09b0 \u0995\u09be\u099f\u09be \u09b9\u09ac\u09c7 \u09a8\u09be\u0964"
            : "Each question carries equal marks. Negative marking: -0.25 per wrong answer. Unanswered questions carry no penalty."}
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px;align-items:start">
          <section>${renderColumn(left, pageStart)}</section>
          <section style="border-left:0.5px solid #d6cfc0;padding-left:20px">${renderColumn(right, pageStart + 10)}</section>
        </div>

        <div style="position:absolute;bottom:8mm;left:14mm;right:14mm;border-top:1px solid #1a1a1a;padding-top:6px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:7.5px;color:#9a8e7e;letter-spacing:0.5px;text-transform:uppercase">BCS Smart Practice · Official Mock Paper</span>
          <span style="font-size:9px;font-weight:600;color:#3a3328;letter-spacing:1px">${pageIndex + 1} / ${totalPages}</span>
          <span style="font-size:7.5px;color:#9a8e7e;letter-spacing:0.5px;text-transform:uppercase">Confidential - For Learner Use Only</span>
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
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Noto+Sans+Bengali:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: #f5f3ef; font-family: "Noto Sans Bengali", "Source Serif 4", Georgia, "Times New Roman", serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @media print { body { background: #fff; } div { page-break-inside: avoid; } }
        </style>
      </head>
      <body>${pages.map((pageItems, i) => renderPage(pageItems, i)).join("")}</body>
    </html>
  `);

  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 800);
}

const EMPTY_DRAFT: DraftMCQ = { question: "", options: ["", "", "", ""] };

function loadSavedDraft(): SavedDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedDraft;
  } catch {
    return null;
  }
}

export default function PaperBuilderPage() {
  const [savedDraft] = useState<SavedDraft | null>(() => loadSavedDraft());
  const [paperTitle, setPaperTitle] = useState(savedDraft?.paperTitle ?? "\u09ac\u09bf\u09b8\u09bf\u098f\u09b8 \u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4\u09bf");
  const [learnerName, setLearnerName] = useState(savedDraft?.learnerName ?? "Learner");
  const [language, setLanguage] = useState<QuestionLanguage>(savedDraft?.language ?? "Bengali");
  const [targetCount, setTargetCount] = useState(savedDraft?.targetCount ?? 20);
  const [draft, setDraft] = useState<DraftMCQ>(EMPTY_DRAFT);
  const [questions, setQuestions] = useState<MCQQuestion[]>(savedDraft?.questions ?? []);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const mathSymbols = ["√()", "^2", "^3", "( )", "[ ]", "{ }", "π", "∞", "≤", "≥", "≠", "÷", "×"];

  useEffect(() => {
    const payload: SavedDraft = { paperTitle, learnerName, language, targetCount, questions };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [paperTitle, learnerName, language, targetCount, questions]);

  const canAdd = useMemo(
    () => draft.question.trim().length > 0 && draft.options.every((opt) => opt.trim().length > 0),
    [draft]
  );

  function updateOption(index: number, value: string) {
    setDraft((prev) => {
      const next = { ...prev, options: [...prev.options] as [string, string, string, string] };
      next.options[index] = value;
      return next;
    });
  }

  function addOrUpdateQuestion() {
    if (!canAdd) return;

    const payload: MCQQuestion = {
      question: draft.question.trim(),
      options: [
        draft.options[0].trim(),
        draft.options[1].trim(),
        draft.options[2].trim(),
        draft.options[3].trim(),
      ],
    };

    if (editingIndex !== null) {
      setQuestions((prev) => prev.map((q, i) => (i === editingIndex ? payload : q)));
      setEditingIndex(null);
    } else {
      setQuestions((prev) => [...prev, payload]);
    }

    setDraft(EMPTY_DRAFT);
  }

  function editQuestion(index: number) {
    const target = questions[index];
    if (!target) return;
    setDraft({ question: target.question, options: [...target.options] as [string, string, string, string] });
    setEditingIndex(index);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setDraft(EMPTY_DRAFT);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === null) return;
    if (editingIndex === index) {
      cancelEdit();
      return;
    }
    if (index < editingIndex) {
      setEditingIndex(editingIndex - 1);
    }
  }

  function clearSavedDraft() {
    window.localStorage.removeItem(STORAGE_KEY);
    setPaperTitle("\u09ac\u09bf\u09b8\u09bf\u098f\u09b8 \u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4\u09bf");
    setLearnerName("Learner");
    setLanguage("Bengali");
    setTargetCount(20);
    setQuestions([]);
    cancelEdit();
  }

  function exportPdf() {
    exportQuestionsOnlyToPrintWindow({
      learnerName: learnerName.trim() || "Learner",
      language,
      questions,
      title: paperTitle.trim() || "BCS Preparation",
    });
  }

  function insertSymbol(symbol: string) {
    const el = questionInputRef.current;
    if (!el) {
      setDraft((prev) => ({ ...prev, question: prev.question + symbol }));
      return;
    }
    const start = el.selectionStart ?? draft.question.length;
    const end = el.selectionEnd ?? start;
    const nextValue = `${draft.question.slice(0, start)}${symbol}${draft.question.slice(end)}`;
    setDraft((prev) => ({ ...prev, question: nextValue }));
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + symbol.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl  py-2">
      <section className="premium-panel rounded-3xl p-5 md:p-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Premium Builder</p>
            <h1 className="premium-title text-3xl font-bold">MCQ Question Paper Builder</h1>
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border bg-background/70 p-4 md:grid-cols-4">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold">Paper Title</span>
            <input value={paperTitle} onChange={(e) => setPaperTitle(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Learner Name</span>
            <input value={learnerName} onChange={(e) => setLearnerName(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
          </label>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Language</p>
            <div className="flex gap-2">
              {(["Bengali", "English"] as const).map((lang) => (
                <button key={lang} type="button" onClick={() => setLanguage(lang)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${language === lang ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <section className="space-y-3 rounded-2xl border bg-background/80 p-4">
            <h2 className="text-lg font-semibold">{editingIndex !== null ? `Edit MCQ #${editingIndex + 1}` : "Add MCQ Question"}</h2>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Question</span>
              <textarea ref={questionInputRef} value={draft.question} onChange={(e) => setDraft((prev) => ({ ...prev, question: e.target.value }))} className="min-h-24 w-full rounded-xl border bg-background px-3 py-2 text-sm" placeholder="Write question..." />
            </label>
            <div className="flex flex-wrap gap-2">
              {mathSymbols.map((symbol) => (
                <button key={symbol} type="button" onClick={() => insertSymbol(symbol)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
                  {symbol}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[0, 1, 2, 3].map((idx) => (
                <label key={idx} className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Option {idx + 1}</span>
                  <input value={draft.options[idx]} onChange={(e) => updateOption(idx, e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={addOrUpdateQuestion} disabled={!canAdd}>{editingIndex !== null ? "Update Question" : "Add Question"}</Button>
              <Button variant="outline" onClick={editingIndex !== null ? cancelEdit : () => setDraft(EMPTY_DRAFT)}>{editingIndex !== null ? "Cancel Edit" : "Clear"}</Button>
            </div>
          </section>

          <aside className="space-y-3 rounded-2xl border bg-background/80 p-4">
            <h2 className="text-lg font-semibold">Paper Status</h2>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 40].map((n) => (
                <button key={n} type="button" onClick={() => setTargetCount(n)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${targetCount === n ? "border-primary bg-primary text-primary-foreground" : "bg-background"}`}>
                  Target {n}
                </button>
              ))}
            </div>
            <p className="text-sm">Added: <span className="font-semibold">{questions.length}</span> / {targetCount}</p>
            <div className="grid gap-2">
              <Button onClick={exportPdf} disabled={questions.length === 0} className="w-full">Export PDF</Button>
              <Button variant="outline" onClick={clearSavedDraft} className="w-full">Clear Draft (Local)</Button>
            </div>
          </aside>
        </div>

        <section className="mt-6 space-y-3 rounded-2xl border bg-background/80 p-4">
          <h2 className="text-lg font-semibold">Question Preview</h2>
          {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions added yet.</p>}
          <div className="grid gap-3">
            {questions.map((q, index) => (
              <article key={`${q.question}-${index}`} className="rounded-xl border bg-background/70 p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{index + 1}. {q.question}</h3>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => editQuestion(index)} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">Edit</button>
                    <button type="button" onClick={() => removeQuestion(index)} className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Remove</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-1 text-sm md:grid-cols-2">
                  {q.options.map((opt, idx) => (
                    <p key={idx}><span className="font-semibold">{(language === "Bengali" ? BN_LABELS : EN_LABELS)[idx]}.</span> {opt}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}