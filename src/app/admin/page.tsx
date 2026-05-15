"use client";

import { DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toaster";
import {
  BookOpen, BrainCircuit, ChevronLeft, ChevronRight, FileUp,
  Layers, Plus, Search, Settings2, Sliders, Trash2, UploadCloud, X,
} from "lucide-react";

// ── types ─────────────────────────────────────────────────────────────────────
type Subject = { id: number; name: string; slug: string; questionCount: number };
type Question = { id: number; question: string; correctAnswer: string; subjectName: string; difficulty: string | null; source: "admin_upload" | "ai_generated" | string };
type PreviewRow = { rowNumber: number; subject: string; question: string; optionA: string; optionB: string; optionC: string; optionD: string; answer: string; difficulty: string };
type PreviewIssue = { rowNumber: number; reason: string; question: string };
type PreviewResponse = { fileName: string; totalRowsDetected: number; selectedSubject: string; missingColumns: string[]; validationStatus: "ready" | "has_issues"; summary: { validRows: number; invalidRows: number; duplicateRows: number }; previewRows: PreviewRow[]; invalidRows: PreviewIssue[] };
type SubjectProgress = { subject: string; namespace: string; totalQuestions: number; totalBatches: number; completedBatches: number; processedQuestions: number; failedBatches: number; status: "pending" | "processing" | "completed" | "partial_failed" | "failed"; updatedAt: string };
type UploadJobResponse = { ok: boolean; uploadId: string; job: { status: "processing" | "completed" | "partial_failed" | "failed" | "cancelled"; validRows: number; invalidRows: number; duplicateRows: number; importedRows: number; vectorsStored: number; createdAt: string; updatedAt: string; completedAt: string | null }; subjectProgress: SubjectProgress[]; logs?: Array<{ id: number; level: string; message: string; createdAt: string }> };

// ── sentinel for subject filter ───────────────────────────────────────────────
const ALL_SUBJECTS_VAL = "__all__";

const uploadSteps = [
  { key: "parsing",    label: "Parsing CSV / Excel" },
  { key: "validating", label: "Validating rows" },
  { key: "uploading",  label: "Uploading to database" },
  { key: "embedding",  label: "Generating embeddings & storing vectors" },
  { key: "completed",  label: "Upload completed" },
] as const;

// ── shared section header ─────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-primary/8 shadow-sm">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── pagination bar ────────────────────────────────────────────────────────────
function PaginationBar({ page, total, onPrev, onNext, label }: { page: number; total: number; onPrev: () => void; onNext: () => void; label: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page <= 1} onClick={onPrev}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">{page} / {total}</span>
        <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={page >= total} onClick={onNext}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── question table ────────────────────────────────────────────────────────────
function QuestionTable({ rows, selectedIds, allSelected, onToggleAll, onToggle, onDelete }: {
  rows: Question[]; selectedIds: number[]; allSelected: boolean;
  onToggleAll: (checked: boolean) => void; onToggle: (id: number) => void; onDelete: (id: number) => void;
}) {
  const diffStyle: Record<string, string> = {
    easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">
                <input type="checkbox" className="rounded border-border" checked={allSelected} onChange={(e) => onToggleAll(e.target.checked)} />
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Subject</TableHead>
              <TableHead className="text-xs uppercase tracking-wide">Question</TableHead>
              <TableHead className="w-14 text-xs uppercase tracking-wide">Ans</TableHead>
              <TableHead className="w-24 text-xs uppercase tracking-wide">Difficulty</TableHead>
              <TableHead className="w-16 text-xs uppercase tracking-wide"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No questions found.</TableCell>
              </TableRow>
            ) : rows.map((q) => {
              const dk = q.difficulty?.toLowerCase() ?? "";
              return (
                <TableRow key={q.id} className="group align-middle transition-colors hover:bg-muted/30">
                  <TableCell>
                    <input type="checkbox" className="rounded border-border" checked={selectedIds.includes(q.id)} onChange={() => onToggle(q.id)} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px] font-normal">{q.subjectName}</Badge>
                  </TableCell>
                  <TableCell className="leading-snug">{q.question}</TableCell>
                  <TableCell className="font-mono text-xs font-semibold">{q.correctAnswer}</TableCell>
                  <TableCell>
                    {q.difficulty ? (
                      <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize ${diffStyle[dk] ?? "bg-muted/60 text-muted-foreground border-border"}`}>
                        {q.difficulty}
                      </span>
                    ) : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(q.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { push } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [search, setSearch] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState<number | "all">("all");
  const [loading, setLoading] = useState(true);
  const [subjectDeleteId, setSubjectDeleteId] = useState<number | null>(null);
  const [questionDeleteId, setQuestionDeleteId] = useState<number | null>(null);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [uploadedPage, setUploadedPage] = useState(1);
  const [aiPage, setAiPage] = useState(1);
  const [similarityThreshold, setSimilarityThreshold] = useState("0.92");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [uploadStep, setUploadStep] = useState<"idle" | "parsing" | "validating" | "uploading" | "embedding" | "completed">("idle");
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<UploadJobResponse | null>(null);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [processingFinishedAt, setProcessingFinishedAt] = useState<number | null>(null);
  const [pollDelayMs] = useState(350);
  const [nowTs, setNowTs] = useState(() => Date.now());

  const loadSubjects = useCallback(async () => {
    const res = await fetch("/api/admin/subjects", { cache: "no-store" });
    setSubjects((await res.json()).subjects || []);
  }, []);

  const loadQuestions = useCallback(async (q?: string, subjectId?: number | "all") => {
    const params = new URLSearchParams();
    if (q?.trim()) params.set("q", q.trim());
    if (subjectId && subjectId !== "all") params.set("subjectId", String(subjectId));
    const res = await fetch(`/api/admin/questions?${params.toString()}`, { cache: "no-store" });
    setQuestions((await res.json()).questions || []);
    setSelectedQuestionIds([]);
    setUploadedPage(1);
    setAiPage(1);
  }, []);

  useEffect(() => {
    let canceled = false;
    const bootstrap = async () => {
      try {
        const [subjectsRes, questionsRes, thresholdRes] = await Promise.all([
          fetch("/api/admin/subjects", { cache: "no-store" }),
          fetch("/api/admin/questions", { cache: "no-store" }),
          fetch("/api/admin/settings/similarity-threshold", { cache: "no-store" }),
        ]);
        const subjectsJson = await subjectsRes.json();
        const questionsJson = await questionsRes.json();
        const thresholdJson = await thresholdRes.json();
        if (canceled) return;
        setSubjects(subjectsJson.subjects || []);
        setQuestions(questionsJson.questions || []);
        setSimilarityThreshold(String(thresholdJson.threshold ?? "0.92"));
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    void bootstrap();
    return () => { canceled = true; };
  }, [loadQuestions, loadSubjects]);

  const uploadedQuestions = useMemo(() => questions.filter((q) => q.source === "admin_upload"), [questions]);
  const aiGeneratedQuestions = useMemo(() => questions.filter((q) => q.source === "ai_generated"), [questions]);
  const uploadedTotalPages = Math.max(1, Math.ceil(uploadedQuestions.length / 20));
  const aiTotalPages = Math.max(1, Math.ceil(aiGeneratedQuestions.length / 20));
  const pagedUploaded = useMemo(() => uploadedQuestions.slice((uploadedPage - 1) * 20, uploadedPage * 20), [uploadedQuestions, uploadedPage]);
  const pagedAi = useMemo(() => aiGeneratedQuestions.slice((aiPage - 1) * 20, aiPage * 20), [aiGeneratedQuestions, aiPage]);
  const allUploadedSelected = pagedUploaded.length > 0 && pagedUploaded.every((q) => selectedQuestionIds.includes(q.id));
  const allAiSelected = pagedAi.length > 0 && pagedAi.every((q) => selectedQuestionIds.includes(q.id));
  const previewIssueByRow = useMemo(() => new Map((preview?.invalidRows ?? []).map((i) => [i.rowNumber, i.reason])), [preview]);

  const toggleQuestion = (id: number) => setSelectedQuestionIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const onDropFile = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file); setPreview(null); setImportedCount(null); setUploadStep("idle");
  };

  const runPreview = async () => {
    if (!selectedFile) return;
    setPreviewLoading(true); setUploadStep("parsing");
    const form = new FormData();
    form.append("file", selectedFile); form.append("action", "preview");
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      setUploadStep("validating");
      const json = await res.json();
      if (!res.ok) { push("Preview failed", json.error || "Could not parse file."); setPreview(null); setUploadStep("idle"); return; }
      setPreview(json as PreviewResponse);
      if ((json as PreviewResponse).validationStatus === "has_issues") push("Preview completed with issues", "Check invalid/duplicate rows before import.");
      else push("Preview ready", "File is valid and ready to import.");
    } finally {
      setPreviewLoading(false);
      if (uploadStep !== "completed") setUploadStep("idle");
    }
  };

  const runImport = async () => {
    if (!selectedFile || !preview) return;
    setImportLoading(true); setUploadStep("uploading");
    const uploadId = crypto.randomUUID();
    setActiveUploadId(uploadId); setProcessingStartedAt(Date.now()); setProcessingFinishedAt(null); setLiveProgress(null);
    const form = new FormData();
    form.append("file", selectedFile); form.append("action", "import"); form.append("uploadId", uploadId); form.append("background", "1");
    const phaseTimer = window.setTimeout(() => setUploadStep("embedding"), 1200);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { push("Import failed", json.error || "Could not import questions."); setUploadStep("idle"); setProcessingFinishedAt(Date.now()); return; }
      setImportedCount(Number(json.imported ?? 0)); setUploadStep("embedding");
      push("Upload accepted", `Processing ${json.imported} questions in background.`);
    } finally { clearTimeout(phaseTimer); setImportLoading(false); }
  };

  useEffect(() => {
    if (!activeUploadId) return;
    let canceled = false; let timer: number | null = null;
    const poll = async () => {
      if (canceled) return;
      try {
        const tf = new FormData(); tf.append("action", "process_tick"); tf.append("uploadId", activeUploadId);
        const pollRes = await fetch("/api/admin/upload", { method: "POST", body: tf });
        if (!pollRes.ok) throw new Error("poll failed");
        const data = (await pollRes.json()) as UploadJobResponse;
        setLiveProgress(data);
        if (["completed", "partial_failed", "failed", "cancelled"].includes(data.job.status)) {
          setUploadStep("completed"); setProcessingFinishedAt(Date.now());
          await Promise.all([loadQuestions(search, filterSubjectId), loadSubjects()]); return;
        }
      } catch { /* keep polling */ }
      timer = window.setTimeout(poll, pollDelayMs);
    };
    timer = window.setTimeout(poll, 0);
    return () => { canceled = true; if (timer) window.clearTimeout(timer); };
  }, [activeUploadId, filterSubjectId, loadQuestions, loadSubjects, pollDelayMs, processingStartedAt, search]);

  useEffect(() => {
    if (!processingStartedAt || processingFinishedAt) return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [processingFinishedAt, processingStartedAt]);

  const processingSeconds = useMemo(() => {
    if (!processingStartedAt) return 0;
    return Math.max(0, Math.round(((processingFinishedAt ?? nowTs) - processingStartedAt) / 1000));
  }, [nowTs, processingFinishedAt, processingStartedAt]);

  const progressTotals = useMemo(() => {
    const sp = liveProgress?.subjectProgress ?? [];
    const totalQuestions = sp.reduce((s, i) => s + Number(i.totalQuestions || 0), 0);
    const processed = sp.reduce((s, i) => s + Number(i.processedQuestions || 0), 0);
    const completedSubjects = sp.filter((i) => i.status === "completed").length;
    const failedSubjects = sp.filter((i) => i.status === "failed" || i.status === "partial_failed").length;
    const skipped = Number(liveProgress?.job.invalidRows ?? 0) + Number(liveProgress?.job.duplicateRows ?? 0);
    const percent = totalQuestions > 0 ? Math.min(100, Math.round((processed / totalQuestions) * 100)) : 0;
    const currentSubject = sp.find((i) => i.status === "processing") ?? sp.find((i) => i.status === "pending") ?? null;
    const currentBatch = currentSubject && currentSubject.totalBatches > 0 ? Math.min(currentSubject.completedBatches + 1, currentSubject.totalBatches) : 0;
    const throughputPerMin = processingSeconds > 0 ? (processed / processingSeconds) * 60 : 0;
    const remaining = Math.max(0, totalQuestions - processed);
    const etaMinutes = throughputPerMin > 0 ? remaining / throughputPerMin : 0;
    return { totalQuestions, processed, completedSubjects, failedSubjects, skipped, percent, currentSubject, currentBatch, throughputPerMin, etaMinutes };
  }, [liveProgress, processingSeconds]);

  const isJobDone = uploadStep === "completed" || ["completed", "partial_failed", "failed"].includes(liveProgress?.job?.status ?? "");

  // ── render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Stats strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Subjects",          value: subjects.length,              icon: Layers },
          { label: "Total Questions",   value: questions.length,             icon: BookOpen },
          { label: "Uploaded",          value: uploadedQuestions.length,     icon: FileUp },
          { label: "AI Generated",      value: aiGeneratedQuestions.length,  icon: BrainCircuit },
        ].map(({ label, value, icon: Icon }, index) => (
          <div key={`${label}-${index}`} className="premium-panel flex items-center gap-3 rounded-xl px-4 py-3">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="tabular-nums text-lg font-bold leading-none">{loading ? "—" : value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create subject + Settings ────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <SectionHeader icon={Plus} title="Create Subject" description="Add a new subject to the question bank." />
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <div className="flex gap-2">
              <Input
                placeholder="Subject name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void (async () => {
                  const res = await fetch("/api/admin/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: subjectName }) });
                  const json = await res.json();
                  if (!res.ok) return push("Create failed", json.error || "Could not create subject.");
                  setSubjectName(""); await loadSubjects(); push("Subject created");
                })()}
              />
              <Button onClick={async () => {
                const res = await fetch("/api/admin/subjects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: subjectName }) });
                const json = await res.json();
                if (!res.ok) return push("Create failed", json.error || "Could not create subject.");
                setSubjectName(""); await loadSubjects(); push("Subject created");
              }}>
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-4">
            <SectionHeader icon={Sliders} title="Generation Settings" description="Control duplicate detection sensitivity." />
          </CardHeader>
          <Separator />
          <CardContent className="pt-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-medium">Similarity threshold (0–1)</Label>
                <Input
                  type="number" step="0.01" min="0" max="1"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(e.target.value)}
                />
              </div>
              <Button onClick={async () => {
                const threshold = Number(similarityThreshold);
                if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) return push("Invalid threshold", "Enter a number between 0 and 1.");
                const res = await fetch("/api/admin/settings/similarity-threshold", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threshold }) });
                const json = await res.json();
                if (!res.ok) return push("Save failed", json.error || "Could not update threshold.");
                setSimilarityThreshold(String(json.threshold));
                push("Threshold updated", `New value: ${json.threshold}`);
              }}>
                <Settings2 className="mr-1.5 h-4 w-4" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Subjects list ────────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <SectionHeader icon={Layers} title="Subjects" description="All active subjects in the question bank." >
            <Badge variant="secondary" className="tabular-nums">{subjects.length} total</Badge>
          </SectionHeader>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          {subjects.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No subjects yet. Create one above.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {subjects.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{s.questionCount} questions</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setSubjectDeleteId(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Bulk upload ──────────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <SectionHeader icon={UploadCloud} title="Bulk Upload Questions" description="Import questions from a CSV or Excel file." />
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-5">

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDropFile}
            className={`relative rounded-xl border-2 border-dashed py-10 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/30"}`}
          >
            <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium">Drag & drop CSV or XLSX here</p>
            <p className="mt-0.5 text-xs text-muted-foreground">or click to browse</p>
            <input
              type="file" accept=".csv,.xlsx,.xls"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                const file = e.target.files?.[0]; if (!file) return;
                setSelectedFile(file); setPreview(null); setImportedCount(null); setUploadStep("idle");
              }}
            />
          </div>

          {/* Selected file */}
          {selectedFile && (
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
              <div className="flex items-center gap-2.5">
                <FileUp className="h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" disabled={previewLoading} onClick={runPreview}>
                  {previewLoading ? "Parsing…" : "Preview"}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => { setSelectedFile(null); setPreview(null); setUploadStep("idle"); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload steps */}
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-5">
            {uploadSteps.map((step, idx) => {
              const active = uploadStep === step.key;
              const done = uploadStep === "completed" && step.key !== "completed";
              return (
                <div key={step.key} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs transition-colors ${active ? "bg-primary/10 font-semibold text-primary" : done ? "text-muted-foreground/50 line-through" : "text-muted-foreground"}`}>
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${active ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                    {idx + 1}
                  </span>
                  {step.label}
                </div>
              );
            })}
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              <div>
                <h3 className="text-sm font-semibold">Preview Summary</h3>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                  {[
                    ["File", preview.fileName],
                    ["Total rows", preview.totalRowsDetected],
                    ["Subject", preview.selectedSubject],
                    ["Status", preview.validationStatus === "ready" ? "✓ Ready" : "⚠ Has issues"],
                    ["Valid rows", preview.summary.validRows],
                    ["Invalid rows", preview.summary.invalidRows],
                    ["Duplicate rows", preview.summary.duplicateRows],
                  ].map(([k, v]) => (
                    <p key={String(k)}><span className="font-medium text-foreground">{k}:</span> <span className="text-muted-foreground">{v}</span></p>
                  ))}
                </div>
                {preview.missingColumns.length > 0 && (
                  <p className="mt-2 text-xs text-destructive">Missing columns: {preview.missingColumns.join(", ")}</p>
                )}
              </div>

              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question Preview ({preview.previewRows.length} rows)</h4>
                <div className="overflow-auto rounded-lg border border-border/60">
                  <div className="min-w-[780px]">
                    <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        {["Row", "Question", "Options", "Ans", "Difficulty"].map((h) => (
                          <TableHead key={h} className="text-xs uppercase tracking-wide">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.previewRows.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">No rows.</TableCell></TableRow>
                      ) : preview.previewRows.map((row) => (
                        <TableRow key={row.rowNumber} className={previewIssueByRow.has(row.rowNumber) ? "bg-rose-50/60" : ""}>
                          <TableCell className="tabular-nums">{row.rowNumber}</TableCell>
                          <TableCell>
                            <p className="text-xs">{row.question}</p>
                            {previewIssueByRow.has(row.rowNumber) && (
                              <p className="mt-1 text-[11px] text-destructive">{previewIssueByRow.get(row.rowNumber)}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">A) {row.optionA}<br />B) {row.optionB}<br />C) {row.optionC}<br />D) {row.optionD}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{row.answer}</TableCell>
                          <TableCell className="text-xs capitalize">{row.difficulty || <span className="text-muted-foreground/40">—</span>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {preview.invalidRows.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-destructive">Invalid / Skipped Rows</h4>
                  <div className="overflow-auto rounded-lg border border-destructive/20">
                    <div className="min-w-[700px]">
                      <Table>
                      <TableHeader>
                        <TableRow className="bg-rose-50/40">
                          {["Location", "Reason", "Question"].map((h) => (
                            <TableHead key={h} className="text-xs uppercase tracking-wide">{h}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.invalidRows.map((issue) => (
                          <TableRow key={`${issue.rowNumber}-${issue.reason}`}>
                            <TableCell className="tabular-nums text-xs">Row {issue.rowNumber}</TableCell>
                            <TableCell className="text-xs text-destructive">{issue.reason}</TableCell>
                            <TableCell className="text-xs">{issue.question || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              <Button
                disabled={importLoading || preview.summary.validRows === 0 || preview.missingColumns.length > 0}
                onClick={runImport}
              >
                <UploadCloud className="mr-1.5 h-4 w-4" />
                {importLoading ? "Submitting…" : `Submit ${preview.summary.validRows} Questions`}
              </Button>
            </div>
          )}

          {importedCount !== null && (
            <p className="text-sm font-medium text-emerald-600">✓ Imported {importedCount} questions successfully.</p>
          )}

          {/* Live progress */}
          {(importLoading || liveProgress) && activeUploadId && (
            <div className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Embedding Progress</h3>
                <span className="text-xs text-muted-foreground tabular-nums">{processingSeconds}s elapsed</span>
              </div>

              <div className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                {[
                  ["Total", progressTotals.totalQuestions || preview?.summary.validRows || 0],
                  ["Processed", `${progressTotals.processed} / ${progressTotals.totalQuestions || 0}`],
                  ["Subject", progressTotals.currentSubject?.subject ?? "—"],
                  ["Batch", `${progressTotals.currentBatch} / ${progressTotals.currentSubject?.totalBatches || 0}`],
                  ["Throughput", `${progressTotals.throughputPerMin.toFixed(1)} q/min`],
                  ["ETA", progressTotals.etaMinutes > 0 ? `~${Math.ceil(progressTotals.etaMinutes)} min` : "—"],
                ].map(([k, v]) => (
                  <p key={String(k)}><span className="font-medium text-foreground">{k}:</span> <span className="text-muted-foreground">{v}</span></p>
                ))}
              </div>

              {/* Progress bar */}
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progressTotals.percent}%` }} />
                </div>
                <p className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">{progressTotals.percent}%</p>
              </div>

              {/* Per-subject progress */}
              {liveProgress?.subjectProgress?.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {liveProgress.subjectProgress.map((item) => {
                    const statusColor = item.status === "completed" ? "text-emerald-600" : item.status === "failed" || item.status === "partial_failed" ? "text-destructive" : item.status === "processing" ? "text-primary" : "text-amber-600";
                    return (
                      <div key={`${item.namespace}-${item.subject}`} className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs">
                        <p className="font-medium">{item.subject}</p>
                        <p className="text-muted-foreground">Batch {item.completedBatches}/{item.totalBatches} · {item.processedQuestions}/{item.totalQuestions} questions</p>
                        <p className={`mt-0.5 font-semibold capitalize ${statusColor}`}>{item.status.replace("_", " ")}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button variant="outline" size="sm"
                  disabled={!activeUploadId || liveProgress?.job?.status !== "processing"}
                  onClick={async () => {
                    if (!activeUploadId) return;
                    const f = new FormData(); f.append("action", "cancel"); f.append("uploadId", activeUploadId);
                    await fetch("/api/admin/upload", { method: "POST", body: f });
                  }}>
                  Cancel
                </Button>
                <Button variant="outline" size="sm"
                  disabled={!activeUploadId || !(liveProgress?.job?.status === "failed" || liveProgress?.job?.status === "partial_failed")}
                  onClick={async () => {
                    if (!activeUploadId) return;
                    const f = new FormData(); f.append("action", "retry_failed"); f.append("uploadId", activeUploadId);
                    setUploadStep("embedding"); setProcessingFinishedAt(null);
                    await fetch("/api/admin/upload", { method: "POST", body: f });
                  }}>
                  Retry Failed
                </Button>
              </div>

              {/* Logs */}
              {liveProgress?.logs?.length ? (
                <div className="rounded-lg border border-border/60 bg-background p-3">
                  <p className="mb-2 text-xs font-semibold">Processing Logs</p>
                  <div className="space-y-0.5 font-mono text-[11px]">
                    {liveProgress.logs.map((log) => (
                      <p key={log.id} className={log.level === "error" ? "text-destructive" : log.level === "warn" ? "text-amber-600" : "text-muted-foreground"}>
                        [{log.level}] {log.message}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Final summary */}
              {isJobDone && (
                <div className="rounded-lg border border-border/60 bg-background px-4 py-3 text-xs">
                  <p className="mb-1 font-semibold">Final Summary</p>
                  <div className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2">
                    <p><span className="font-medium">Completed subjects:</span> {progressTotals.completedSubjects}</p>
                    <p><span className="font-medium">Failed subjects:</span> {progressTotals.failedSubjects}</p>
                    <p><span className="font-medium">Skipped rows:</span> {progressTotals.skipped}</p>
                    <p><span className="font-medium">Processing time:</span> {processingSeconds}s</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Question browser ─────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <SectionHeader icon={Search} title="Question Browser" description="Search and manage questions across all sources.">
            {selectedQuestionIds.length > 0 && (
              <Button size="sm" variant="destructive" className="gap-1.5"
                onClick={async () => {
                  const res = await fetch("/api/admin/questions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: selectedQuestionIds }) });
                  const json = await res.json();
                  if (!res.ok) return push("Delete failed", json.error || "Could not bulk delete.");
                  await loadQuestions(search, filterSubjectId);
                  push("Questions deleted", `${json.deleted} removed`);
                }}>
                <Trash2 className="h-3.5 w-3.5" /> Delete ({selectedQuestionIds.length})
              </Button>
            )}
          </SectionHeader>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-8 text-sm" placeholder="Search questions…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadQuestions(search, filterSubjectId)}
              />
            </div>
            <Select
              value={filterSubjectId === "all" ? ALL_SUBJECTS_VAL : String(filterSubjectId)}
              onValueChange={(v) => setFilterSubjectId(v === ALL_SUBJECTS_VAL ? "all" : Number(v))}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SUBJECTS_VAL}>All subjects</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5" onClick={() => void loadQuestions(search, filterSubjectId)}>
              <Search className="h-3.5 w-3.5" /> Search
            </Button>
          </div>
        </CardContent>

        {/* Uploaded questions */}
        <Separator />
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FileUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Uploaded Questions</span>
            <Badge variant="secondary" className="tabular-nums">{uploadedQuestions.length}</Badge>
          </div>
        </div>
        <QuestionTable
          rows={pagedUploaded}
          selectedIds={selectedQuestionIds}
          allSelected={allUploadedSelected}
          onToggleAll={(checked) => {
            if (checked) setSelectedQuestionIds((p) => Array.from(new Set([...p, ...pagedUploaded.map((q) => q.id)])));
            else { const ids = new Set(pagedUploaded.map((q) => q.id)); setSelectedQuestionIds((p) => p.filter((id) => !ids.has(id))); }
          }}
          onToggle={toggleQuestion}
          onDelete={(id) => setQuestionDeleteId(id)}
        />
        <PaginationBar
          page={uploadedPage} total={uploadedTotalPages} label={`Page ${uploadedPage} of ${uploadedTotalPages}`}
          onPrev={() => setUploadedPage((p) => p - 1)} onNext={() => setUploadedPage((p) => p + 1)}
        />

        {/* AI generated questions */}
        <Separator />
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Generated Questions</span>
            <Badge variant="secondary" className="tabular-nums">{aiGeneratedQuestions.length}</Badge>
          </div>
        </div>
        <QuestionTable
          rows={pagedAi}
          selectedIds={selectedQuestionIds}
          allSelected={allAiSelected}
          onToggleAll={(checked) => {
            if (checked) setSelectedQuestionIds((p) => Array.from(new Set([...p, ...pagedAi.map((q) => q.id)])));
            else { const ids = new Set(pagedAi.map((q) => q.id)); setSelectedQuestionIds((p) => p.filter((id) => !ids.has(id))); }
          }}
          onToggle={toggleQuestion}
          onDelete={(id) => setQuestionDeleteId(id)}
        />
        <PaginationBar
          page={aiPage} total={aiTotalPages} label={`Page ${aiPage} of ${aiTotalPages}`}
          onPrev={() => setAiPage((p) => p - 1)} onNext={() => setAiPage((p) => p + 1)}
        />
      </Card>

      {/* ── Dialogs ──────────────────────────────────────────────── */}
      <Dialog open={subjectDeleteId !== null} onOpenChange={(open) => !open && setSubjectDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete subject?</DialogTitle>
            <DialogDescription>This will delete the subject and all related questions. This action cannot be undone.</DialogDescription>
          </DialogHeader>
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
          <DialogHeader>
            <DialogTitle>Delete question?</DialogTitle>
            <DialogDescription>This deletes the question and its stored vector embedding.</DialogDescription>
          </DialogHeader>
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
    </div>
  );
}
