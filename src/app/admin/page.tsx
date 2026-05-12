"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toaster";

type Subject = { id: number; name: string; slug: string; questionCount: number };
type Question = { id: number; question: string; correctAnswer: string; subjectName: string; difficulty: string | null };

const PAGE_SIZE = 20;

export default function AdminPage() {
  const { push } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [search, setSearch] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(false);
  const [subjectDeleteId, setSubjectDeleteId] = useState<number | null>(null);
  const [questionDeleteId, setQuestionDeleteId] = useState<number | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [similarityThreshold, setSimilarityThreshold] = useState("0.92");

  const loadSubjects = async () => {
    const res = await fetch("/api/admin/subjects", { cache: "no-store" });
    setSubjects((await res.json()).subjects || []);
  };

  const loadQuestions = async (q?: string, subjectId?: number | "all") => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (subjectId && subjectId !== "all") params.set("subjectId", String(subjectId));
    const res = await fetch(`/api/admin/questions?${params.toString()}`, { cache: "no-store" });
    setQuestions((await res.json()).questions || []);
    setSelectedQuestionIds([]);
    setPage(1);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadSubjects(),
      loadQuestions(),
      fetch("/api/admin/settings/similarity-threshold", { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => setSimilarityThreshold(String(json.threshold ?? "0.92"))),
    ]).finally(() => setLoading(false));
  }, []);

  const totalPages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE));
  const pagedQuestions = useMemo(() => questions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [questions, page]);
  const allCurrentPageSelected = pagedQuestions.length > 0 && pagedQuestions.every((q) => selectedQuestionIds.includes(q.id));

  const toggleQuestion = (id: number) => {
    setSelectedQuestionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <div className="mb-6 rounded-2xl border bg-white/80 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-lg font-medium">Create Subject</h2>
          <div className="flex gap-2">
            <input className="w-full rounded-md border px-3 py-2" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
            <Button onClick={async () => {
              const res = await fetch("/api/admin/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: subjectName }) });
              const json = await res.json();
              if (!res.ok) return push("Create failed", json.error || "Could not create subject.");
              setSubjectName("");
              await loadSubjects();
              push("Subject created");
            }}>Add</Button>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-lg font-medium">Upload CSV / Excel</h2>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append("file", file);
            const res = await fetch("/api/admin/upload", { method: "POST", body: form });
            const json = await res.json();
            if (!res.ok) return push("Upload failed", json.error || "Could not upload file.");
            await Promise.all([loadSubjects(), loadQuestions(search, filterSubjectId)]);
            push("Upload completed", `Inserted ${json.inserted}/${json.total}`);
          }} />
        </section>
      </div>

      <section className="mt-4 rounded-2xl border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">Generation Settings</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted-foreground">Similarity threshold (0 to 1)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className="w-32 rounded-md border px-3 py-2"
            value={similarityThreshold}
            onChange={(e) => setSimilarityThreshold(e.target.value)}
          />
          <Button
            onClick={async () => {
              const threshold = Number(similarityThreshold);
              if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
                return push("Invalid threshold", "Enter a number between 0 and 1.");
              }
              const res = await fetch("/api/admin/settings/similarity-threshold", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ threshold }),
              });
              const json = await res.json();
              if (!res.ok) return push("Save failed", json.error || "Could not update threshold.");
              setSimilarityThreshold(String(json.threshold));
              push("Threshold updated", `New value: ${json.threshold}`);
            }}
          >
            Save
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">Subjects</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {subjects.map((subject) => (
            <div key={subject.id} className="flex items-center justify-between rounded-lg border p-3">
              <div><p className="font-medium">{subject.name}</p><p className="text-xs text-muted-foreground">{subject.questionCount} questions</p></div>
              <Button variant="destructive" onClick={() => setSubjectDeleteId(subject.id)}>Delete</Button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border bg-white p-5">
        <div className="mb-3 flex flex-wrap gap-2">
          <input className="min-w-[220px] flex-1 rounded-md border px-3 py-2" placeholder="Search question" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="rounded-md border px-3 py-2" value={filterSubjectId} onChange={(e) => setFilterSubjectId(e.target.value === "all" ? "all" : Number(e.target.value))}>
            <option value="all">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button onClick={() => loadQuestions(search, filterSubjectId)}>Search</Button>
          <Button
            variant="destructive"
            disabled={selectedQuestionIds.length === 0}
            onClick={async () => {
              const res = await fetch("/api/admin/questions", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedQuestionIds }),
              });
              const json = await res.json();
              if (!res.ok) return push("Delete failed", json.error || "Could not bulk delete.");
              await loadQuestions(search, filterSubjectId);
              push("Questions deleted", `${json.deleted} removed`);
            }}
          >
            Delete Selected ({selectedQuestionIds.length})
          </Button>
        </div>

        {!loading && questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions found.</p> : null}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><input type="checkbox" checked={allCurrentPageSelected} onChange={(e) => {
                if (e.target.checked) {
                  setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...pagedQuestions.map((q) => q.id)])));
                } else {
                  const pageIds = new Set(pagedQuestions.map((q) => q.id));
                  setSelectedQuestionIds((prev) => prev.filter((id) => !pageIds.has(id)));
                }
              }} /></TableHead>
              <TableHead>Subject</TableHead><TableHead>Question</TableHead><TableHead>Ans</TableHead><TableHead>Difficulty</TableHead><TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedQuestions.map((q) => (
              <TableRow key={q.id}>
                <TableCell><input type="checkbox" checked={selectedQuestionIds.includes(q.id)} onChange={() => toggleQuestion(q.id)} /></TableCell>
                <TableCell>{q.subjectName}</TableCell>
                <TableCell>{q.question}</TableCell>
                <TableCell>{q.correctAnswer}</TableCell>
                <TableCell>{q.difficulty || "-"}</TableCell>
                <TableCell><Button variant="destructive" onClick={() => setQuestionDeleteId(q.id)}>Delete</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </section>

      <Dialog open={subjectDeleteId !== null} onOpenChange={(open) => !open && setSubjectDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete subject</DialogTitle><DialogDescription>This deletes the subject and related questions.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!subjectDeleteId) return;
              await fetch(`/api/admin/subjects?id=${subjectDeleteId}`, { method: "DELETE" });
              setSubjectDeleteId(null);
              await Promise.all([loadSubjects(), loadQuestions(search, filterSubjectId)]);
              push("Subject deleted");
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={questionDeleteId !== null} onOpenChange={(open) => !open && setQuestionDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete question</DialogTitle><DialogDescription>This deletes question and its vector.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (!questionDeleteId) return;
              await fetch(`/api/admin/questions?id=${questionDeleteId}`, { method: "DELETE" });
              setQuestionDeleteId(null);
              await loadQuestions(search, filterSubjectId);
              push("Question deleted");
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
