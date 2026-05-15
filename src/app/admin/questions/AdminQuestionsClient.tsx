"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Loader2, Pencil, Save, X } from "lucide-react";

type Subject = { id: number; name: string };
type QuestionRow = {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  difficulty: string | null;
  topic: string | null;
  source: string;
  subjectId: number;
  subjectName: string;
};

type Props = {
  subjects: Subject[];
};

const ALL = "__all__";
const NO_DIFFICULTY = "__none__";

const difficultyStyle: Record<string, string> = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function AdminQuestionsClient({ subjects }: Props) {
  const [rows, setRows] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<QuestionRow>>({});
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    q: "",
    subjectId: ALL,
    source: ALL,
    topic: "",
    difficulty: NO_DIFFICULTY,
  });

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: filters.q,
        topic: filters.topic,
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
      });
      if (filters.subjectId !== ALL) params.set("subjectId", filters.subjectId);
      if (filters.source !== ALL) params.set("source", filters.source);
      if (filters.difficulty !== NO_DIFFICULTY) params.set("difficulty", filters.difficulty);

      const res = await fetch(`/api/admin/questions?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setRows(json.questions || []);
      setPagination((prev) => ({ ...prev, ...(json.pagination || {}) }));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    const t = window.setTimeout(() => void fetchRows(), 250);
    return () => window.clearTimeout(t);
  }, [fetchRows]);

  const canPrev = pagination.page > 1;
  const canNext = pagination.page < pagination.totalPages;

  const rowOffset = useMemo(() => (pagination.page - 1) * pagination.pageSize, [pagination.page, pagination.pageSize]);

  function startEdit(row: QuestionRow) {
    setEditingId(row.id);
    setForm(row);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm({});
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          subjectId: Number(form.subjectId),
          question: form.question,
          optionA: form.optionA,
          optionB: form.optionB,
          optionC: form.optionC,
          optionD: form.optionD,
          correctAnswer: form.correctAnswer,
          explanation: form.explanation ?? "",
          difficulty: form.difficulty || null,
          topic: form.topic || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to update question.");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === editingId
            ? {
                ...r,
                subjectId: Number(form.subjectId),
                subjectName: subjects.find((s) => s.id === Number(form.subjectId))?.name || r.subjectName,
                question: form.question || "",
                optionA: form.optionA || "",
                optionB: form.optionB || "",
                optionC: form.optionC || "",
                optionD: form.optionD || "",
                correctAnswer: form.correctAnswer || "A",
                explanation: form.explanation || null,
                difficulty: form.difficulty || null,
                topic: form.topic || null,
              }
            : r,
        ),
      );
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-primary/8 shadow-sm">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold leading-tight">Question Bank</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Filter, paginate, and edit questions from one place.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {pagination.total} total
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Input
          placeholder="Search question..."
          value={filters.q}
          onChange={(e) => {
            setPagination((p) => ({ ...p, page: 1 }));
            setFilters((f) => ({ ...f, q: e.target.value }));
          }}
        />
        <Input
          placeholder="Topic"
          value={filters.topic}
          onChange={(e) => {
            setPagination((p) => ({ ...p, page: 1 }));
            setFilters((f) => ({ ...f, topic: e.target.value }));
          }}
        />
        <Select
          value={filters.subjectId}
          onValueChange={(v) => {
            setPagination((p) => ({ ...p, page: 1 }));
            setFilters((f) => ({ ...f, subjectId: v }));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={filters.difficulty}
          onValueChange={(v) => {
            setPagination((p) => ({ ...p, page: 1 }));
            setFilters((f) => ({ ...f, difficulty: v }));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_DIFFICULTY}>Any difficulty</SelectItem>
            <SelectItem value="easy">Easy</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filters.source}
          onValueChange={(v) => {
            setPagination((p) => ({ ...p, page: 1 }));
            setFilters((f) => ({ ...f, source: v }));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            <SelectItem value="admin_upload">Uploaded</SelectItem>
            <SelectItem value="ai_generated">AI generated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="premium-panel overflow-hidden rounded-xl">
        <div className="overflow-auto max-h-[72vh]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">Topic</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-24">Difficulty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No questions found.</td></tr>
              ) : (
                rows.map((q, idx) => {
                  const diffKey = q.difficulty?.toLowerCase() ?? "";
                  const isEditing = editingId === q.id;
                  return (
                    <tr key={q.id} className="align-top transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Textarea value={form.question || ""} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input value={form.optionA || ""} onChange={(e) => setForm((f) => ({ ...f, optionA: e.target.value }))} placeholder="Option A" />
                              <Input value={form.optionB || ""} onChange={(e) => setForm((f) => ({ ...f, optionB: e.target.value }))} placeholder="Option B" />
                              <Input value={form.optionC || ""} onChange={(e) => setForm((f) => ({ ...f, optionC: e.target.value }))} placeholder="Option C" />
                              <Input value={form.optionD || ""} onChange={(e) => setForm((f) => ({ ...f, optionD: e.target.value }))} placeholder="Option D" />
                            </div>
                            <Textarea value={form.explanation || ""} onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))} placeholder="Explanation" />
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 shrink-0 tabular-nums text-[11px] text-muted-foreground/50 select-none">
                              {rowOffset + idx + 1}
                            </span>
                            <span className="leading-snug text-foreground">{q.question}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Select value={String(form.subjectId || q.subjectId)} onValueChange={(v) => setForm((f) => ({ ...f, subjectId: Number(v) }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="text-[11px] font-normal">{q.subjectName}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input value={form.topic || ""} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} />
                        ) : (
                          <span className="text-muted-foreground">{q.topic ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Select value={form.difficulty || NO_DIFFICULTY} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v === NO_DIFFICULTY ? null : v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_DIFFICULTY}>None</SelectItem>
                                <SelectItem value="easy">Easy</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="hard">Hard</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select value={form.correctAnswer || "A"} onValueChange={(v) => setForm((f) => ({ ...f, correctAnswer: v }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A">A</SelectItem>
                                <SelectItem value="B">B</SelectItem>
                                <SelectItem value="C">C</SelectItem>
                                <SelectItem value="D">D</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ) : q.difficulty ? (
                          <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium capitalize ${
                            difficultyStyle[diffKey] ?? "bg-muted/60 text-muted-foreground border-border"
                          }`}>{q.difficulty}</span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => void saveEdit()} disabled={saving} className="gap-1">
                              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                              Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => startEdit(q)} className="gap-1">
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          Page {pagination.page} of {pagination.totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(pagination.pageSize)}
            onValueChange={(v) => setPagination((p) => ({ ...p, page: 1, pageSize: Number(v) }))}
          >
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="20">20 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" disabled={!canPrev} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>Prev</Button>
          <Button variant="outline" size="sm" disabled={!canNext} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>Next</Button>
        </div>
      </div>
    </div>
  );
}

