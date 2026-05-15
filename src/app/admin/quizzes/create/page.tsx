"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── icons ─────────────────────────────────────────────────────────────────────
import {
  BookOpen,
  CalendarClock,
  ChevronRight,
  CirclePlus,
  Filter,
  Hash,
  LayoutList,
  Layers,
  PenLine,
  Plus,
  Loader2,
  Search,
  Sparkles,
  Timer,
  Trash2,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────
type Subject = { id: number; name: string };
type Question = {
  id: number;
  question: string;
  topic: string | null;
  difficulty: string | null;
  source?: string | null;
};
type ManualQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: string;
};

// Sentinels — Radix Select forbids value=""
const ALL_SUBJECTS = "__all__";
const NO_DIFFICULTY = "__none__";
const ALL_SOURCES = "__all_sources__";

const blankManual: ManualQuestion = {
  question: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
  explanation: "",
  topic: "",
  difficulty: "",
};

// ── helpers ───────────────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-primary/8 shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <CardDescription className="mt-0.5 text-xs leading-relaxed">
            {description}
          </CardDescription>
        </div>
      </div>
      {badge}
    </div>
  );
}

// ── component ─────────────────────────────────────────────────────────────────
export default function CreateQuizPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([
    blankManual,
  ]);
  const [filters, setFilters] = useState({ q: "", topic: "", difficulty: "", source: ALL_SOURCES });
  const [subjectFilters, setSubjectFilters] = useState<number[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [hasBootstrappedQuestions, setHasBootstrappedQuestions] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    subjectId: ALL_SUBJECTS, // sentinel — never ""
    topic: "",
    startTime: "",
    endTime: "",
    durationMinutes: 60,
    negativeMarking: 0.25,
    timingMode: "fixed_end_time",
  });

  const fetchQuestions = useCallback(async (
    nextFilters: { q: string; topic: string; difficulty: string; source: string },
    nextSubjectFilters: number[],
  ) => {
    setIsSearching(true);
    try {
      const qs = new URLSearchParams({
        ...nextFilters,
        ...(nextSubjectFilters.length
          ? { subjectIds: nextSubjectFilters.join(",") }
          : {}),
      }).toString();
      const res = await fetch(`/api/admin/quizzes?${qs}`, { method: "PUT" });
      const json = await res.json();
      setQuestions(json.questions || []);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchQuestions = useCallback(async (
    nextFilters = filters,
    nextSubjectFilters = subjectFilters,
  ) => {
    await fetchQuestions(nextFilters, nextSubjectFilters);
  }, [filters, subjectFilters, fetchQuestions]);

  useEffect(() => {
    void (async () => {
      const s = await fetch("/api/admin/subjects", { cache: "no-store" });
      const sj = await s.json();
      setSubjects(sj.subjects || []);
      await fetchQuestions({ q: "", topic: "", difficulty: "", source: ALL_SOURCES }, []);
      setHasBootstrappedQuestions(true);
    })();
  }, [fetchQuestions]);

  useEffect(() => {
    if (!hasBootstrappedQuestions) return;
    const t = window.setTimeout(() => {
      void searchQuestions();
    }, 350);
    return () => window.clearTimeout(t);
  }, [filters, subjectFilters, hasBootstrappedQuestions, searchQuestions]);

  async function createQuiz() {
    // Strip sentinels before sending to API
    const rawSubjectId = form.subjectId === ALL_SUBJECTS ? null : Number(form.subjectId);

    const res = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        subjectId: rawSubjectId,
        selectedQuestionIds: selectedIds,
        manualQuestions,
      }),
    });
    const raw = await res.text();
    let json: { error?: string } = {};
    if (raw) {
      try {
        json = JSON.parse(raw) as { error?: string };
      } catch {
        json = {};
      }
    }
    if (!res.ok) return alert(json.error || "Failed");
    router.push("/admin/quizzes");
  }

  function updateManual<K extends keyof ManualQuestion>(
    i: number,
    key: K,
    val: ManualQuestion[K]
  ) {
    setManualQuestions((p) =>
      p.map((x, idx) => (idx === i ? { ...x, [key]: val } : x))
    );
  }

  function removeManual(i: number) {
    setManualQuestions((p) => p.filter((_, idx) => idx !== i));
  }

  function toggleSelectedQuestion(questionId: number, nextChecked: boolean) {
    setSelectedIds((prev) => {
      if (nextChecked) return prev.includes(questionId) ? prev : [...prev, questionId];
      return prev.filter((id) => id !== questionId);
    });
  }

  const visibleQuestions = useMemo(
    () => (showSelectedOnly ? questions.filter((q) => selectedIds.includes(q.id)) : questions),
    [questions, selectedIds, showSelectedOnly],
  );
  const selectedQuestions = useMemo(
    () => questions.filter((q) => selectedIds.includes(q.id)),
    [questions, selectedIds],
  );

  const difficultyColors: Record<string, string> = {
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-4xl space-y-5 pb-16">
        {/* ── Page header ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Admin</span>
          <ChevronRight className="h-3 w-3" />
          <span>Quizzes</span>
          <ChevronRight className="h-3 w-3" />
          <span className="font-medium text-foreground">Create</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create New Exam</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure exam details, pick questions, and set timing rules.
          </p>
        </div>

        {/* ── 1. Basic Info ────────────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <SectionHeader
              icon={BookOpen}
              title="Exam Details"
              description="Title, subject, description and instructions for test-takers."
            />
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g. BCS Preliminary Mock — June 2025"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Subject</Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, subjectId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* ✅ sentinel value — not "" */}
                    <SelectItem value={ALL_SUBJECTS}>All subjects</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="topic" className="text-xs font-medium">
                  Topic
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="topic"
                    className="pl-8"
                    placeholder="e.g. Bangladesh Affairs"
                    value={form.topic}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, topic: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Timing Mode</Label>
                <Select
                  value={form.timingMode}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, timingMode: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed_end_time">Fixed ending time</SelectItem>
                    <SelectItem value="full_duration">Full duration from join</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="desc" className="text-xs font-medium">
                  Description
                </Label>
                <Textarea
                  id="desc"
                  className="min-h-20 resize-none"
                  placeholder="Short overview visible to students before starting the exam…"
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, description: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="instr" className="text-xs font-medium">
                  Instructions
                </Label>
                <Textarea
                  id="instr"
                  className="min-h-20 resize-none"
                  placeholder="Rules, guidelines, or any note for the exam session…"
                  value={form.instructions}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, instructions: e.target.value }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 2. Timing ────────────────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <SectionHeader
              icon={CalendarClock}
              title="Timing & Scoring"
              description="Set start / end windows, duration, and negative marking penalty."
            />
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Start Time</Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startTime: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">End Time</Label>
                <Input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endTime: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Timer className="h-3 w-3" /> Duration (min)
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  Negative Marking
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help rounded-full border border-border px-1.5 py-0 text-[10px] text-muted-foreground">
                        ?
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Marks deducted per wrong answer (e.g. 0.25)
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  step="0.25"
                  min={0}
                  value={form.negativeMarking}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      negativeMarking: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Question bank ─────────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <SectionHeader
              icon={LayoutList}
              title="Question Bank"
              description="Search and select existing questions from one or more subjects."
              badge={
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {selectedIds.length} selected
                </Badge>
              }
            />
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="tabular-nums">
                  {visibleQuestions.length} shown
                </Badge>
                <Badge variant="secondary" className="tabular-nums">
                  {selectedIds.length} selected
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded-md border border-border/70 px-2.5 py-1.5 text-xs">
                  <Checkbox
                    checked={showSelectedOnly}
                    onCheckedChange={(c) => setShowSelectedOnly(Boolean(c))}
                  />
                  Selected only
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={visibleQuestions.length === 0}
                  onClick={() =>
                    setSelectedIds((prev) => {
                      const visibleIds = new Set(visibleQuestions.map((q) => q.id));
                      const next = new Set(prev);
                      visibleIds.forEach((id) => next.add(id));
                      return Array.from(next);
                    })
                  }
                >
                  Select visible
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={selectedIds.length === 0}
                  onClick={() => setSelectedIds([])}
                >
                  Clear selected
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={subjectFilters.length === 0 ? "default" : "outline"}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => setSubjectFilters([])}
              >
                All
              </Button>
              {subjects.map((s) => {
                const active = subjectFilters.includes(s.id);
                return (
                  <Button
                    key={s.id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() =>
                      setSubjectFilters((prev) =>
                        active
                          ? prev.filter((id) => id !== s.id)
                          : [...prev, s.id]
                      )
                    }
                  >
                    {s.name}
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-40 flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Search questions…"
                  value={filters.q}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, q: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && void searchQuestions()}
                />
              </div>
              <Input
                className="w-36 text-sm"
                placeholder="Topic"
                value={filters.topic}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, topic: e.target.value }))
                }
              />
              <Select
                value={filters.difficulty || NO_DIFFICULTY}
                onValueChange={(v) =>
                  setFilters((p) => ({
                    ...p,
                    difficulty: v === NO_DIFFICULTY ? "" : v,
                  }))
                }
              >
                <SelectTrigger className="w-40 text-sm">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DIFFICULTY}>Any difficulty</SelectItem>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.source}
                onValueChange={(v) =>
                  setFilters((p) => ({
                    ...p,
                    source: v,
                  }))
                }
              >
                <SelectTrigger className="w-40 text-sm">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SOURCES}>All sources</SelectItem>
                  <SelectItem value="admin_upload">Uploaded</SelectItem>
                  <SelectItem value="ai_generated">AI generated</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={isSearching}
                onClick={() => void searchQuestions()}
              >
                {isSearching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Filter className="h-3.5 w-3.5" />
                )}
                {isSearching ? "Searching..." : "Filter"}
              </Button>
            </div>

            {selectedIds.length > 0 && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-primary">
                    Selected question tray
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {selectedIds.length} selected
                  </p>
                </div>
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-auto pr-1">
                  {selectedQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/25 bg-background px-2 py-0.5 text-xs text-foreground hover:border-primary/45"
                      onClick={() => toggleSelectedQuestion(q.id, false)}
                      title={q.question}
                    >
                      <span className="truncate max-w-56">{q.question}</span>
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <ScrollArea className="h-72 rounded-xl border border-border/60">
              {visibleQuestions.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
                  <Layers className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    {showSelectedOnly
                      ? "No selected questions in the current result list."
                      : "No questions found. Try adjusting your filters."}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 p-3">
                  {visibleQuestions.map((q) => {
                    const checked = selectedIds.includes(q.id);
                    const diffKey = q.difficulty?.toLowerCase() ?? "";
                    return (
                      <label
                        key={q.id}
                        className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                          checked
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/60 bg-muted/20 hover:bg-muted/40"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) =>
                            toggleSelectedQuestion(q.id, Boolean(c))
                          }
                          className="mt-0.5 shrink-0"
                        />
                        <span className="flex-1 leading-snug">{q.question}</span>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {q.source && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                              {q.source === "ai_generated" ? "AI" : "Upload"}
                            </Badge>
                          )}
                          {q.topic && (
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                              {q.topic}
                            </Badge>
                          )}
                          {q.difficulty && (
                            <span
                              className={`rounded border px-1.5 py-0 text-[10px] font-medium ${
                                difficultyColors[diffKey] ??
                                "bg-muted/60 text-muted-foreground border-border"
                              }`}
                            >
                              {q.difficulty}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── 4. Manual Questions ───────────────────────────────────── */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <SectionHeader
              icon={PenLine}
              title="Manual Questions"
              description="Write custom questions inline — ideal when the question bank doesn't cover your topic."
              badge={
                <Badge variant="outline" className="shrink-0 tabular-nums">
                  {manualQuestions.length} row
                  {manualQuestions.length !== 1 ? "s" : ""}
                </Badge>
              }
            />
          </CardHeader>
          <Separator />
          <CardContent className="space-y-3 pt-5">
            {manualQuestions.map((m, i) => (
              <div
                key={i}
                className="relative rounded-xl border border-border/60 bg-muted/20 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  {manualQuestions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeManual(i)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-4">
                  <div className="space-y-1 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">Question</Label>
                    <Textarea
                      className="min-h-16 resize-none text-sm"
                      placeholder="Type your question…"
                      value={m.question}
                      onChange={(e) => updateManual(i, "question", e.target.value)}
                    />
                  </div>

                  {(["A", "B", "C", "D"] as const).map((opt) => {
                    const key = `option${opt}` as keyof ManualQuestion;
                    return (
                      <div key={opt} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Option {opt}
                        </Label>
                        <Input
                          className="text-sm"
                          placeholder={`Option ${opt}`}
                          value={m[key] as string}
                          onChange={(e) => updateManual(i, key, e.target.value)}
                        />
                      </div>
                    );
                  })}

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Correct</Label>
                    <Select
                      value={m.correctAnswer}
                      onValueChange={(v) => updateManual(i, "correctAnswer", v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["A", "B", "C", "D"].map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Topic</Label>
                    <Input
                      className="text-sm"
                      placeholder="Topic"
                      value={m.topic}
                      onChange={(e) => updateManual(i, "topic", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Difficulty</Label>
                    <Select
                      // ✅ sentinel when difficulty is "" — never pass "" to Radix
                      value={m.difficulty || NO_DIFFICULTY}
                      onValueChange={(v) =>
                        updateManual(i, "difficulty", v === NO_DIFFICULTY ? "" : v)
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_DIFFICULTY}>None</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">Explanation</Label>
                    <Textarea
                      className="min-h-14 resize-none text-sm"
                      placeholder="Explain the correct answer (optional)…"
                      value={m.explanation}
                      onChange={(e) => updateManual(i, "explanation", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setManualQuestions((p) => [...p, blankManual])}
            >
              <Plus className="h-4 w-4" />
              Add another question
            </Button>
          </CardContent>
        </Card>

        {/* ── 5. Summary & Submit ───────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-5 py-4 shadow-sm">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CirclePlus className="h-4 w-4 text-primary" />
              <strong className="tabular-nums text-foreground">
                {selectedIds.length}
              </strong>{" "}
              from bank
            </span>
            <Separator orientation="vertical" className="h-4" />
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
              <strong className="tabular-nums text-foreground">
                {manualQuestions.filter((m) => m.question.trim()).length}
              </strong>{" "}
              manual
            </span>
          </div>

          <Button size="default" className="gap-2 font-semibold" onClick={createQuiz}>
            Create Exam
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
