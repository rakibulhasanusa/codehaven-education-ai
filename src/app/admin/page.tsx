"use client";

import { DragEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toaster";

type Subject = { id: number; name: string; slug: string; questionCount: number };
type Question = { id: number; question: string; correctAnswer: string; subjectName: string; difficulty: string | null; source: "admin_upload" | "ai_generated" | string };

type PreviewRow = {
  rowNumber: number;
  subject: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: string;
  difficulty: string;
};

type PreviewIssue = { rowNumber: number; reason: string; question: string };

type PreviewResponse = {
  fileName: string;
  totalRowsDetected: number;
  selectedSubject: string;
  missingColumns: string[];
  validationStatus: "ready" | "has_issues";
  summary: { validRows: number; invalidRows: number; duplicateRows: number };
  previewRows: PreviewRow[];
  invalidRows: PreviewIssue[];
};

type SubjectProgress = {
  subject: string;
  namespace: string;
  totalQuestions: number;
  totalBatches: number;
  completedBatches: number;
  processedQuestions: number;
  failedBatches: number;
  status: "pending" | "processing" | "completed" | "partial_failed" | "failed";
  updatedAt: string;
};

type UploadJobResponse = {
  ok: boolean;
  uploadId: string;
  job: {
    status: "processing" | "completed" | "partial_failed" | "failed" | "cancelled";
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    importedRows: number;
    vectorsStored: number;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  subjectProgress: SubjectProgress[];
  logs?: Array<{ id: number; level: string; message: string; createdAt: string }>;
};

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
    return () => {
      canceled = true;
    };
  }, [loadQuestions, loadSubjects]);

  const uploadedQuestions = useMemo(() => questions.filter((q) => q.source === "admin_upload"), [questions]);
  const aiGeneratedQuestions = useMemo(() => questions.filter((q) => q.source === "ai_generated"), [questions]);
  const uploadedTotalPages = Math.max(1, Math.ceil(uploadedQuestions.length / 20));
  const aiTotalPages = Math.max(1, Math.ceil(aiGeneratedQuestions.length / 20));
  const pagedUploadedQuestions = useMemo(
    () => uploadedQuestions.slice((uploadedPage - 1) * 20, uploadedPage * 20),
    [uploadedQuestions, uploadedPage]
  );
  const pagedAiGeneratedQuestions = useMemo(
    () => aiGeneratedQuestions.slice((aiPage - 1) * 20, aiPage * 20),
    [aiGeneratedQuestions, aiPage]
  );
  const allUploadedSelected = pagedUploadedQuestions.length > 0 && pagedUploadedQuestions.every((q) => selectedQuestionIds.includes(q.id));
  const allAiSelected = pagedAiGeneratedQuestions.length > 0 && pagedAiGeneratedQuestions.every((q) => selectedQuestionIds.includes(q.id));

  const toggleQuestion = (id: number) => {
    setSelectedQuestionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const onDropFile = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreview(null);
    setImportedCount(null);
    setUploadStep("idle");
  };

  const runPreview = async () => {
    if (!selectedFile) return;
    setPreviewLoading(true);
    setUploadStep("parsing");

    const form = new FormData();
    form.append("file", selectedFile);
    form.append("action", "preview");

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      setUploadStep("validating");
      const json = await res.json();
      if (!res.ok) {
        push("Preview failed", json.error || "Could not parse file.");
        setPreview(null);
        setUploadStep("idle");
        return;
      }

      setPreview(json as PreviewResponse);
      if ((json as PreviewResponse).validationStatus === "has_issues") {
        push("Preview completed with issues", "Check invalid/duplicate rows before import.");
      } else {
        push("Preview ready", "File is valid and ready to import.");
      }
    } finally {
      setPreviewLoading(false);
      if (uploadStep !== "completed") setUploadStep("idle");
    }
  };

  const runImport = async () => {
    if (!selectedFile || !preview) return;
    setImportLoading(true);
    setUploadStep("uploading");
    const uploadId = crypto.randomUUID();
    setActiveUploadId(uploadId);
    setProcessingStartedAt(Date.now());
    setProcessingFinishedAt(null);
    setLiveProgress(null);

    const form = new FormData();
    form.append("file", selectedFile);
    form.append("action", "import");
    form.append("uploadId", uploadId);
    form.append("background", "1");

    const phaseTimer = window.setTimeout(() => setUploadStep("embedding"), 1200);

    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        push("Import failed", json.error || "Could not import questions.");
        setUploadStep("idle");
        setProcessingFinishedAt(Date.now());
        return;
      }
      setImportedCount(Number(json.imported ?? 0));
      setUploadStep("embedding");
      push("Upload accepted", `Processing ${json.imported} questions in background.`);
    } finally {
      clearTimeout(phaseTimer);
      setImportLoading(false);
    }
  };

  useEffect(() => {
    if (!activeUploadId) return;
    let canceled = false;
    let timer: number | null = null;

    const poll = async () => {
      if (canceled) return;
      try {
        const tickForm = new FormData();
        tickForm.append("action", "process_tick");
        tickForm.append("uploadId", activeUploadId);
        const pollRes = await fetch("/api/admin/upload", { method: "POST", body: tickForm });
        if (!pollRes.ok) throw new Error("poll failed");
        const data = (await pollRes.json()) as UploadJobResponse;
        setLiveProgress(data);
        if (["completed", "partial_failed", "failed", "cancelled"].includes(data.job.status)) {
          setUploadStep("completed");
          setProcessingFinishedAt(Date.now());
          await Promise.all([loadQuestions(search, filterSubjectId), loadSubjects()]);
          return;
        }
      } catch {
        // keep polling
      }
      timer = window.setTimeout(poll, pollDelayMs);
    };

    timer = window.setTimeout(poll, 0);
    return () => {
      canceled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeUploadId, filterSubjectId, loadQuestions, loadSubjects, pollDelayMs, processingStartedAt, search]);

  useEffect(() => {
    if (!processingStartedAt || processingFinishedAt) return;
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [processingFinishedAt, processingStartedAt]);

  const processingSeconds = useMemo(() => {
    if (!processingStartedAt) return 0;
    const end = processingFinishedAt ?? nowTs;
    return Math.max(0, Math.round((end - processingStartedAt) / 1000));
  }, [nowTs, processingFinishedAt, processingStartedAt]);

  const progressTotals = useMemo(() => {
    const subjectProgress = liveProgress?.subjectProgress ?? [];
    const totalQuestions = subjectProgress.reduce((sum, item) => sum + Number(item.totalQuestions || 0), 0);
    const processed = subjectProgress.reduce((sum, item) => sum + Number(item.processedQuestions || 0), 0);
    const completedSubjects = subjectProgress.filter((item) => item.status === "completed").length;
    const failedSubjects = subjectProgress.filter((item) => item.status === "failed" || item.status === "partial_failed").length;
    const skipped = Number(liveProgress?.job.invalidRows ?? 0) + Number(liveProgress?.job.duplicateRows ?? 0);
    const percent = totalQuestions > 0 ? Math.min(100, Math.round((processed / totalQuestions) * 100)) : 0;
    const currentSubject =
      subjectProgress.find((item) => item.status === "processing") ??
      subjectProgress.find((item) => item.status === "pending") ??
      null;
    const currentBatch =
      currentSubject && currentSubject.totalBatches > 0
        ? Math.min(currentSubject.completedBatches + 1, currentSubject.totalBatches)
        : 0;
    const throughputPerMin = processingSeconds > 0 ? (processed / processingSeconds) * 60 : 0;
    const remaining = Math.max(0, totalQuestions - processed);
    const etaMinutes = throughputPerMin > 0 ? remaining / throughputPerMin : 0;

    return {
      totalQuestions,
      processed,
      completedSubjects,
      failedSubjects,
      skipped,
      percent,
      currentSubject,
      currentBatch,
      throughputPerMin,
      etaMinutes,
    };
  }, [liveProgress, processingSeconds]);

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
          <h2 className="mb-3 text-lg font-medium">Generation Settings</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-muted-foreground">Similarity threshold (0 to 1)</label>
            <input type="number" step="0.01" min="0" max="1" className="w-32 rounded-md border px-3 py-2" value={similarityThreshold} onChange={(e) => setSimilarityThreshold(e.target.value)} />
            <Button onClick={async () => {
              const threshold = Number(similarityThreshold);
              if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) return push("Invalid threshold", "Enter a number between 0 and 1.");
              const res = await fetch("/api/admin/settings/similarity-threshold", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threshold }) });
              const json = await res.json();
              if (!res.ok) return push("Save failed", json.error || "Could not update threshold.");
              setSimilarityThreshold(String(json.threshold));
              push("Threshold updated", `New value: ${json.threshold}`);
            }}>Save</Button>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border bg-white p-5">
        <h2 className="mb-3 text-lg font-medium">Bulk Upload Questions</h2>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDropFile}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition ${dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`}
        >
          <p className="text-sm font-medium">Drag & drop CSV/XLSX file here</p>
          <p className="mt-1 text-xs text-muted-foreground">or choose file manually</p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="mx-auto mt-3 block"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setSelectedFile(file);
              setPreview(null);
              setImportedCount(null);
              setUploadStep("idle");
            }}
          />
        </div>

        {selectedFile ? (
          <div className="mt-4 rounded-lg border bg-muted/10 p-3 text-sm">
            <p><span className="font-medium">File:</span> {selectedFile.name}</p>
            <p><span className="font-medium">Size:</span> {(selectedFile.size / 1024).toFixed(1)} KB</p>
            <div className="mt-2 flex gap-2">
              <Button disabled={previewLoading} onClick={runPreview}>{previewLoading ? "Preparing Preview..." : "Preview Questions"}</Button>
              <Button variant="outline" onClick={() => { setSelectedFile(null); setPreview(null); setUploadStep("idle"); }}>Clear</Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2 text-sm">
          <p className={uploadStep === "parsing" ? "font-semibold" : "text-muted-foreground"}>1. Parsing CSV/Excel</p>
          <p className={uploadStep === "validating" ? "font-semibold" : "text-muted-foreground"}>2. Validating rows</p>
          <p className={uploadStep === "uploading" ? "font-semibold" : "text-muted-foreground"}>3. Uploading to database</p>
          <p className={uploadStep === "embedding" ? "font-semibold" : "text-muted-foreground"}>4. Generating embeddings and storing vectors</p>
          <p className={uploadStep === "completed" ? "font-semibold text-green-700" : "text-muted-foreground"}>5. Upload completed</p>
        </div>

        {preview ? (
          <div className="mt-4 rounded-xl border p-4">
            <h3 className="text-base font-semibold">Preview Summary</h3>
            <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              <p><span className="font-medium">File:</span> {preview.fileName}</p>
              <p><span className="font-medium">Total rows detected:</span> {preview.totalRowsDetected}</p>
              <p><span className="font-medium">Selected subject:</span> {preview.selectedSubject}</p>
              <p><span className="font-medium">Validation status:</span> {preview.validationStatus === "ready" ? "Ready" : "Has issues"}</p>
              <p><span className="font-medium">Valid rows:</span> {preview.summary.validRows}</p>
              <p><span className="font-medium">Invalid rows:</span> {preview.summary.invalidRows}</p>
              <p><span className="font-medium">Duplicate rows:</span> {preview.summary.duplicateRows}</p>
            </div>

            {preview.missingColumns.length > 0 ? (
              <p className="mt-2 text-sm text-red-600">Missing columns: {preview.missingColumns.join(", ")}</p>
            ) : null}

            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold">Question Preview (first {preview.previewRows.length})</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead><TableHead>Question</TableHead><TableHead>Options</TableHead><TableHead>Answer</TableHead><TableHead>Difficulty</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.previewRows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>{row.question}</TableCell>
                      <TableCell className="text-xs">A) {row.optionA}<br />B) {row.optionB}<br />C) {row.optionC}<br />D) {row.optionD}</TableCell>
                      <TableCell>{row.answer}</TableCell>
                      <TableCell>{row.difficulty || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {preview.invalidRows.length > 0 ? (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-red-700">Invalid / Skipped Rows</h4>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Row</TableHead><TableHead>Reason</TableHead><TableHead>Question</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.invalidRows.map((issue) => (
                      <TableRow key={`${issue.rowNumber}-${issue.reason}`}>
                        <TableCell>{issue.rowNumber}</TableCell>
                        <TableCell className="text-red-700">{issue.reason}</TableCell>
                        <TableCell>{issue.question || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <Button
                disabled={importLoading || preview.summary.validRows === 0 || preview.missingColumns.length > 0}
                onClick={runImport}
              >
                {importLoading ? "Submitting Questions..." : "Submit Questions"}
              </Button>
            </div>
          </div>
        ) : null}

        {importedCount !== null ? <p className="mt-3 text-sm font-medium text-green-700">Imported successfully: {importedCount} questions</p> : null}

        {(importLoading || liveProgress) && activeUploadId ? (
          <div className="mt-4 rounded-xl border bg-slate-50 p-4">
            <h3 className="text-base font-semibold">Embedding Progress</h3>
            <p className="mt-1 text-xs text-muted-foreground">Upload ID: {activeUploadId}</p>

            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <p><span className="font-medium">Total Questions:</span> {progressTotals.totalQuestions || preview?.summary.validRows || 0}</p>
              <p><span className="font-medium">Processed:</span> {progressTotals.processed} / {progressTotals.totalQuestions || preview?.summary.validRows || 0}</p>
              <p><span className="font-medium">Processing Subject:</span> {progressTotals.currentSubject?.subject ?? "-"}</p>
              <p><span className="font-medium">Batch:</span> {progressTotals.currentBatch || 0} of {progressTotals.currentSubject?.totalBatches || 0}</p>
              <p><span className="font-medium">Throughput:</span> {progressTotals.throughputPerMin.toFixed(1)} q/min</p>
              <p><span className="font-medium">ETA:</span> {progressTotals.etaMinutes > 0 ? `${Math.ceil(progressTotals.etaMinutes)} min` : "-"}</p>
            </div>

            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-500"
                style={{ width: `${progressTotals.percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{progressTotals.percent}% complete</p>

            {liveProgress?.subjectProgress?.length ? (
              <div className="mt-4 grid gap-2">
                {liveProgress.subjectProgress.map((item) => (
                  <div key={`${item.namespace}-${item.subject}`} className="rounded-lg border bg-white p-3 text-sm">
                    <p className="font-medium">{item.subject}</p>
                    <p className="text-xs text-muted-foreground">Batch {item.completedBatches} / {item.totalBatches} | Processed {item.processedQuestions} / {item.totalQuestions}</p>
                    <p className="mt-1 text-xs">
                      <span className="font-medium">Status:</span>{" "}
                      <span className={item.status === "completed" ? "text-green-700" : item.status === "failed" || item.status === "partial_failed" ? "text-red-700" : item.status === "processing" ? "text-blue-700" : "text-amber-700"}>
                        {item.status}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                disabled={!activeUploadId || liveProgress?.job?.status !== "processing"}
                onClick={async () => {
                  if (!activeUploadId) return;
                  const form = new FormData();
                  form.append("action", "cancel");
                  form.append("uploadId", activeUploadId);
                  await fetch("/api/admin/upload", { method: "POST", body: form });
                }}
              >
                Cancel Processing
              </Button>
              <Button
                variant="outline"
                disabled={!activeUploadId || !(liveProgress?.job?.status === "failed" || liveProgress?.job?.status === "partial_failed")}
                onClick={async () => {
                  if (!activeUploadId) return;
                  const form = new FormData();
                  form.append("action", "retry_failed");
                  form.append("uploadId", activeUploadId);
                  setUploadStep("embedding");
                  setProcessingFinishedAt(null);
                  await fetch("/api/admin/upload", { method: "POST", body: form });
                }}
              >
                Retry Failed Batches
              </Button>
            </div>

            {liveProgress?.logs?.length ? (
              <div className="mt-4 rounded-lg border bg-white p-3">
                <p className="mb-2 text-sm font-semibold">Recent Processing Logs</p>
                <div className="space-y-1 text-xs">
                  {liveProgress.logs.map((log) => (
                    <p key={log.id} className={log.level === "error" ? "text-red-700" : log.level === "warn" ? "text-amber-700" : "text-slate-700"}>
                      [{log.level}] {log.message}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {uploadStep === "completed" || liveProgress?.job?.status === "completed" || liveProgress?.job?.status === "partial_failed" || liveProgress?.job?.status === "failed" ? (
              <div className="mt-4 rounded-lg border bg-white p-3 text-sm">
                <p className="font-semibold">Final Summary</p>
                <p className="mt-1"><span className="font-medium">Total completed:</span> {progressTotals.completedSubjects}</p>
                <p><span className="font-medium">Total failed:</span> {progressTotals.failedSubjects}</p>
                <p><span className="font-medium">Total skipped:</span> {progressTotals.skipped}</p>
                <p><span className="font-medium">Processing time:</span> {processingSeconds}s</p>
              </div>
            ) : null}
          </div>
        ) : null}
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

        <h3 className="mb-2 mt-4 text-base font-semibold">Uploaded Questions ({uploadedQuestions.length})</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><input type="checkbox" checked={allUploadedSelected} onChange={(e) => {
                if (e.target.checked) {
                  setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...pagedUploadedQuestions.map((q) => q.id)])));
                } else {
                  const pageIds = new Set(pagedUploadedQuestions.map((q) => q.id));
                  setSelectedQuestionIds((prev) => prev.filter((id) => !pageIds.has(id)));
                }
              }} /></TableHead>
              <TableHead>Subject</TableHead><TableHead>Question</TableHead><TableHead>Ans</TableHead><TableHead>Difficulty</TableHead><TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedUploadedQuestions.map((q) => (
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
          <p className="text-sm text-muted-foreground">Uploaded Page {uploadedPage} of {uploadedTotalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={uploadedPage <= 1} onClick={() => setUploadedPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" disabled={uploadedPage >= uploadedTotalPages} onClick={() => setUploadedPage((p) => p + 1)}>Next</Button>
          </div>
        </div>

        <h3 className="mb-2 mt-6 text-base font-semibold">AI Generated Questions ({aiGeneratedQuestions.length})</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><input type="checkbox" checked={allAiSelected} onChange={(e) => {
                if (e.target.checked) {
                  setSelectedQuestionIds((prev) => Array.from(new Set([...prev, ...pagedAiGeneratedQuestions.map((q) => q.id)])));
                } else {
                  const ids = new Set(pagedAiGeneratedQuestions.map((q) => q.id));
                  setSelectedQuestionIds((prev) => prev.filter((id) => !ids.has(id)));
                }
              }} /></TableHead>
              <TableHead>Subject</TableHead><TableHead>Question</TableHead><TableHead>Ans</TableHead><TableHead>Difficulty</TableHead><TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedAiGeneratedQuestions.map((q) => (
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
          <p className="text-sm text-muted-foreground">AI Page {aiPage} of {aiTotalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={aiPage <= 1} onClick={() => setAiPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" disabled={aiPage >= aiTotalPages} onClick={() => setAiPage((p) => p + 1)}>Next</Button>
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
