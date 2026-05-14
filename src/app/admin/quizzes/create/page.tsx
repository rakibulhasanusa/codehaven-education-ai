"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Subject = { id: number; name: string };
type Question = { id: number; question: string; topic: string | null; difficulty: string | null };

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

export default function CreateQuizPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([blankManual]);
  const [filters, setFilters] = useState({ q: "", topic: "", difficulty: "" });
  const [subjectFilters, setSubjectFilters] = useState<number[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    instructions: "",
    subjectId: "",
    topic: "",
    startTime: "",
    endTime: "",
    durationMinutes: 60,
    negativeMarking: 0.25,
    timingMode: "fixed_end_time",
  });

  useEffect(() => {
    void (async () => {
      const s = await fetch("/api/admin/subjects", { cache: "no-store" });
      const sj = await s.json();
      setSubjects(sj.subjects || []);
    })();
  }, []);

  async function searchQuestions() {
    const qs = new URLSearchParams({
      ...filters,
      ...(subjectFilters.length ? { subjectIds: subjectFilters.join(",") } : {}),
    }).toString();
    const res = await fetch(`/api/admin/quizzes?${qs}`, { method: "PUT" });
    const json = await res.json();
    setQuestions(json.questions || []);
  }

  async function createQuiz() {
    const res = await fetch("/api/admin/quizzes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, subjectId: Number(form.subjectId), selectedQuestionIds: selectedIds, manualQuestions }),
    });
    const json = await res.json();
    if (!res.ok) return alert(json.error || "Failed");
    router.push("/admin/quizzes");
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-border/60 bg-background/80 shadow-sm backdrop-blur">
        <CardHeader className="bg-gradient-to-r from-background via-background to-muted/30">
          <CardTitle className="text-2xl">Create Quiz</CardTitle>
          <CardDescription>Build the exam, pick questions from one or more subjects, and control timing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <select className="rounded-lg border border-border bg-background px-3 py-2" value={form.subjectId} onChange={(e) => setForm((p) => ({ ...p, subjectId: e.target.value }))}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <textarea className="min-h-24 rounded-lg border border-border bg-background px-3 py-2 md:col-span-2" placeholder="Instructions" value={form.instructions} onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))} />
          <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Topic" value={form.topic} onChange={(e) => setForm((p) => ({ ...p, topic: e.target.value }))} />
          <select className="rounded-lg border border-border bg-background px-3 py-2" value={form.timingMode} onChange={(e) => setForm((p) => ({ ...p, timingMode: e.target.value }))}>
            <option value="fixed_end_time">Fixed ending time</option>
            <option value="full_duration">Full duration from join</option>
          </select>
          <input type="datetime-local" className="rounded-lg border border-border bg-background px-3 py-2" value={form.startTime} onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))} />
          <input type="datetime-local" className="rounded-lg border border-border bg-background px-3 py-2" value={form.endTime} onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))} />
          <input type="number" className="rounded-lg border border-border bg-background px-3 py-2" value={form.durationMinutes} onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))} />
          <input type="number" step="0.25" className="rounded-lg border border-border bg-background px-3 py-2" value={form.negativeMarking} onChange={(e) => setForm((p) => ({ ...p, negativeMarking: Number(e.target.value) }))} />
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Select Existing Questions</CardTitle>
              <CardDescription>Choose one subject, multiple subjects, or all subjects when filtering questions.</CardDescription>
            </div>
            <Badge variant="secondary">{subjectFilters.length ? `${subjectFilters.length} selected` : "All subjects"}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-4">
            <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Search" value={filters.q} onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))} />
            <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Topic" value={filters.topic} onChange={(e) => setFilters((p) => ({ ...p, topic: e.target.value }))} />
            <input className="rounded-lg border border-border bg-background px-3 py-2" placeholder="Difficulty" value={filters.difficulty} onChange={(e) => setFilters((p) => ({ ...p, difficulty: e.target.value }))} />
            <Button type="button" onClick={searchQuestions}>Filter</Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={subjectFilters.length === 0 ? "default" : "outline"}
              onClick={() => setSubjectFilters([])}
            >
              All subjects
            </Button>
            {subjects.map((subject) => {
              const active = subjectFilters.includes(subject.id);
              return (
                <Button
                  key={subject.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  onClick={() => setSubjectFilters((prev) => (active ? prev.filter((id) => id !== subject.id) : [...prev, subject.id]))}
                >
                  {subject.name}
                </Button>
              );
            })}
          </div>

          <div className="max-h-72 overflow-auto rounded-xl border border-border/60">
            {questions.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">No data available.</div>
            ) : (
              <div className="space-y-2 p-3">
                {questions.map((q) => (
                  <label key={q.id} className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(q.id)}
                      onChange={(e) => setSelectedIds((p) => (e.target.checked ? [...p, q.id] : p.filter((x) => x !== q.id)))}
                    />
                    <span>{q.question}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Manual Questions</CardTitle>
          <CardDescription>Add questions manually when you do not want to pull from the question bank.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{manualQuestions.length} row(s)</span>
            <Button type="button" variant="outline" onClick={() => setManualQuestions((p) => [...p, blankManual])}>Add row</Button>
          </div>
          {manualQuestions.map((m, i) => (
            <div key={i} className="grid gap-2 rounded-xl border border-border/60 p-3 md:grid-cols-4">
              <input className="rounded border border-border bg-background px-2 py-1 md:col-span-4" placeholder="Question" value={m.question} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, question: e.target.value } : x)))} />
              <input className="rounded border border-border bg-background px-2 py-1" placeholder="Option A" value={m.optionA} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, optionA: e.target.value } : x)))} />
              <input className="rounded border border-border bg-background px-2 py-1" placeholder="Option B" value={m.optionB} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, optionB: e.target.value } : x)))} />
              <input className="rounded border border-border bg-background px-2 py-1" placeholder="Option C" value={m.optionC} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, optionC: e.target.value } : x)))} />
              <input className="rounded border border-border bg-background px-2 py-1" placeholder="Option D" value={m.optionD} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, optionD: e.target.value } : x)))} />
              <select className="rounded border border-border bg-background px-2 py-1" value={m.correctAnswer} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, correctAnswer: e.target.value } : x)))}><option>A</option><option>B</option><option>C</option><option>D</option></select>
              <input className="rounded border border-border bg-background px-2 py-1 md:col-span-2" placeholder="Explanation" value={m.explanation} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, explanation: e.target.value } : x)))} />
              <input className="rounded border border-border bg-background px-2 py-1" placeholder="Topic" value={m.topic} onChange={(e) => setManualQuestions((p) => p.map((x, idx) => (idx === i ? { ...x, topic: e.target.value } : x)))} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full md:w-auto" onClick={createQuiz}>Create Exam</Button>
    </div>
  );
}
