import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { questions, subjects, uploadJobs, uploadLogs, uploadSubjectProgress } from "@/lib/db/schema";
import { slugify } from "@/lib/helpers/slug";
import { buildEmbeddingText, generateEmbeddings } from "@/lib/ai/embeddings";
import { upsertQuestionVectors } from "@/lib/ai/pinecone";
import { getMissingRequiredColumns, parseUploadFile, validateRows, type UploadRowWithMeta } from "@/lib/admin/upload-parser";

export const maxDuration = 60;

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function pickPreviewRows(rows: UploadRowWithMeta[], limit = 20) {
  return rows.slice(0, limit).map((row) => ({
    rowNumber: row.rowNumber,
    subject: row.subject,
    question: row.question,
    optionA: row.optionA,
    optionB: row.optionB,
    optionC: row.optionC,
    optionD: row.optionD,
    answer: row.answer,
    difficulty: row.difficulty ?? "",
  }));
}

async function getExistingSubjectsBySlug(slugs: string[]) {
  if (slugs.length === 0) return [];
  return db().select().from(subjects).where(inArray(subjects.slug, slugs));
}

function isUpstreamEmbeddingError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("network") || message.includes("timeout") || message.includes("503") || message.includes("502") || message.includes("429");
}

function toNamespace(subjectSlug: string) {
  return `mcq-${subjectSlug}`;
}

function toVectorId(subjectId: number, question: string) {
  return createHash("sha256").update(`${subjectId}:${normalizeQuestion(question)}`).digest("hex").slice(0, 48);
}

function formatErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const maybeCode = (error as unknown as { code?: unknown }).code;
    const code = typeof maybeCode === "string" ? maybeCode : "";
    const name = error.name || "Error";
    return `${name}${code ? `(${code})` : ""}: ${error.message}`;
  }
  return String(error);
}

async function appendUploadLog(uploadId: string, level: "info" | "warn" | "error", message: string, subjectSlug?: string, batchNumber?: number) {
  await db().insert(uploadLogs).values({
    uploadJobId: uploadId,
    level,
    message,
    subjectSlug: subjectSlug ?? null,
    batchNumber: batchNumber ?? null,
  });
}

async function isCancelled(uploadId: string) {
  const [job] = await db().select({ status: uploadJobs.status, cancelledAt: uploadJobs.cancelledAt }).from(uploadJobs).where(eq(uploadJobs.id, uploadId)).limit(1);
  return job?.status === "cancelled" || Boolean(job?.cancelledAt);
}

async function buildDbDuplicateKeySet(validRows: UploadRowWithMeta[]) {
  const subjectSlugs = Array.from(new Set(validRows.map((row) => slugify(row.subject))));
  const existingSubjectRows = await getExistingSubjectsBySlug(subjectSlugs);
  const subjectIdBySlug = new Map(existingSubjectRows.map((s) => [s.slug, s.id]));

  const duplicateKeys = new Set<string>();
  for (const [slug, subjectId] of subjectIdBySlug.entries()) {
    const rowsForSubject = validRows.filter((r) => slugify(r.subject) === slug);
    const uniqueQuestions = Array.from(new Set(rowsForSubject.map((r) => normalizeQuestion(r.question))));
    if (uniqueQuestions.length === 0) continue;

    const existingQuestions = await db()
      .select({ question: questions.question })
      .from(questions)
      .where(and(eq(questions.subjectId, subjectId), inArray(questions.questionNormalized, uniqueQuestions)));

    for (const item of existingQuestions) duplicateKeys.add(`${slug}|${normalizeQuestion(item.question)}`);
  }

  return duplicateKeys;
}

async function finalizeUploadStatus(uploadId: string) {
  const [job] = await db().select().from(uploadJobs).where(eq(uploadJobs.id, uploadId)).limit(1);
  if (!job || job.status === "cancelled") return;

  const progressRows = await db().select().from(uploadSubjectProgress).where(eq(uploadSubjectProgress.uploadJobId, uploadId));
  const allCompleted = progressRows.length > 0 && progressRows.every((s) => s.status === "completed");
  const allEnded = progressRows.length > 0 && progressRows.every((s) => ["completed", "failed", "partial_failed"].includes(s.status));

  if (!allEnded) return;

  const hasFailed = progressRows.some((s) => s.status === "failed" || s.status === "partial_failed");
  await db().update(uploadJobs).set({
    status: allCompleted ? "completed" : hasFailed ? "partial_failed" : "failed",
    updatedAt: new Date(),
    completedAt: new Date(),
    error: allCompleted ? null : "Some subject batches failed. Retry failed batches.",
  }).where(eq(uploadJobs.id, uploadId));
}

async function processOneTick(uploadId: string, batchSize: number, maxBatchRetries: number) {
  if (await isCancelled(uploadId)) return { done: true };

  const [subjectProgress] = await db()
    .select()
    .from(uploadSubjectProgress)
    .where(
      and(
        eq(uploadSubjectProgress.uploadJobId, uploadId),
        or(eq(uploadSubjectProgress.status, "processing"), eq(uploadSubjectProgress.status, "pending"), eq(uploadSubjectProgress.status, "partial_failed"), eq(uploadSubjectProgress.status, "failed"))
      )
    )
    .orderBy(uploadSubjectProgress.id)
    .limit(1);

  if (!subjectProgress) {
    await finalizeUploadStatus(uploadId);
    return { done: true };
  }

  const [subject] = await db().select().from(subjects).where(eq(subjects.slug, subjectProgress.subjectSlug)).limit(1);
  if (!subject) {
    await db().update(uploadSubjectProgress).set({ status: "failed", updatedAt: new Date() }).where(eq(uploadSubjectProgress.id, subjectProgress.id));
    return { done: false };
  }

  const candidates = await db()
    .select({
      id: questions.id,
      subjectId: questions.subjectId,
      question: questions.question,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      embeddingId: questions.embeddingId,
    })
    .from(questions)
    .where(
      and(
        eq(questions.uploadJobId, uploadId),
        eq(questions.source, "admin_upload"),
        eq(questions.subjectId, subject.id),
        or(isNull(questions.embeddingId), eq(questions.embeddingStatus, "failed"))
      )
    )
    .limit(batchSize);

  if (candidates.length === 0) {
    await db().update(uploadSubjectProgress).set({ status: "completed", updatedAt: new Date() }).where(eq(uploadSubjectProgress.id, subjectProgress.id));
    await finalizeUploadStatus(uploadId);
    return { done: false };
  }

  const safeBatchNumber = Math.max(1, Number(subjectProgress.completedBatches) + Number(subjectProgress.failedBatches) + 1);
  await db().update(uploadSubjectProgress).set({ status: "processing", updatedAt: new Date() }).where(eq(uploadSubjectProgress.id, subjectProgress.id));
  await db().update(questions).set({ embeddingStatus: "processing" }).where(inArray(questions.id, candidates.map((c) => c.id)));

  let success = false;
  for (let attempt = 1; attempt <= maxBatchRetries; attempt += 1) {
    try {
      const inputs = candidates.map((row) => buildEmbeddingText({
        subject: subject.name,
        question: row.question,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
      }));

      const embeddings = await generateEmbeddings(inputs);
      const vectors = candidates.map((row, idx) => ({
        id: toVectorId(row.subjectId, row.question),
        values: embeddings[idx] ?? [],
        metadata: { subjectId: row.subjectId, questionId: row.id },
      }));

      await upsertQuestionVectors(vectors, toNamespace(subject.slug));
      await db().transaction(async (tx) => {
        await Promise.all(
          candidates.map((row) =>
            tx
              .update(questions)
              .set({ embeddingId: toVectorId(row.subjectId, row.question), embeddingStatus: "completed" })
              .where(eq(questions.id, row.id))
          )
        );
      });

      await db().update(uploadSubjectProgress).set({
        completedBatches: sql`${uploadSubjectProgress.completedBatches} + 1`,
        processedQuestions: sql`${uploadSubjectProgress.processedQuestions} + ${candidates.length}`,
        status: "processing",
        updatedAt: new Date(),
      }).where(eq(uploadSubjectProgress.id, subjectProgress.id));

      await db().update(uploadJobs).set({ vectorsStored: sql`${uploadJobs.vectorsStored} + ${candidates.length}`, updatedAt: new Date() }).where(eq(uploadJobs.id, uploadId));
      success = true;
      break;
    } catch (error) {
      const errorDetails = formatErrorDetails(error);
      if (attempt < maxBatchRetries && isUpstreamEmbeddingError(error)) {
        await appendUploadLog(
          uploadId,
          "warn",
          `Batch retry ${attempt}/${maxBatchRetries} after error: ${errorDetails}`,
          subject.slug,
          safeBatchNumber
        );
        continue;
      }

      if (attempt === maxBatchRetries || !isUpstreamEmbeddingError(error)) {
        await db().update(questions).set({ embeddingStatus: "failed" }).where(inArray(questions.id, candidates.map((c) => c.id)));
        await db().update(uploadSubjectProgress).set({
          failedBatches: sql`${uploadSubjectProgress.failedBatches} + 1`,
          status: "partial_failed",
          updatedAt: new Date(),
        }).where(eq(uploadSubjectProgress.id, subjectProgress.id));
        await appendUploadLog(uploadId, "error", `Batch failed: ${errorDetails}`, subject.slug, safeBatchNumber);
      }
    }
  }

  if (!success) {
    await finalizeUploadStatus(uploadId);
    return { done: false };
  }

  const [remaining] = await db().select({ count: sql<number>`count(*)` }).from(questions).where(
    and(
      eq(questions.uploadJobId, uploadId),
      eq(questions.source, "admin_upload"),
      eq(questions.subjectId, subject.id),
      or(isNull(questions.embeddingId), eq(questions.embeddingStatus, "failed"))
    )
  );
  if (Number(remaining?.count ?? 0) === 0) {
    await db().update(uploadSubjectProgress).set({ status: "completed", updatedAt: new Date() }).where(eq(uploadSubjectProgress.id, subjectProgress.id));
  }

  await finalizeUploadStatus(uploadId);
  return { done: false };
}

export async function GET(req: NextRequest) {
  const uploadId = req.nextUrl.searchParams.get("uploadId");
  if (!uploadId) return NextResponse.json({ error: "uploadId query param is required." }, { status: 400 });

  const [job] = await db().select().from(uploadJobs).where(eq(uploadJobs.id, uploadId));
  if (!job) return NextResponse.json({ error: "Upload job not found." }, { status: 404 });

  const [subjectProgressRows, logs] = await Promise.all([
    db().select().from(uploadSubjectProgress).where(eq(uploadSubjectProgress.uploadJobId, uploadId)),
    db().select().from(uploadLogs).where(eq(uploadLogs.uploadJobId, uploadId)).orderBy(sql`${uploadLogs.createdAt} desc`).limit(20),
  ]);

  return NextResponse.json({
    ok: true,
    uploadId,
    job,
    subjectProgress: subjectProgressRows.map((item) => ({
      subject: item.subjectName,
      namespace: item.namespace,
      totalQuestions: item.totalQuestions,
      totalBatches: item.totalBatches,
      completedBatches: item.completedBatches,
      processedQuestions: item.processedQuestions,
      failedBatches: item.failedBatches,
      status: item.status,
      updatedAt: item.updatedAt,
    })),
    logs,
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const action = String(form.get("action") || "preview");

  if (action === "cancel") {
    const uploadId = String(form.get("uploadId") || "").trim();
    if (!uploadId) return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
    await db().update(uploadJobs).set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(eq(uploadJobs.id, uploadId));
    await appendUploadLog(uploadId, "warn", "Upload cancelled by admin");
    return NextResponse.json({ ok: true, uploadId, status: "cancelled" });
  }

  if (action === "retry_failed") {
    const uploadId = String(form.get("uploadId") || "").trim();
    if (!uploadId) return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
    await db().update(uploadJobs).set({ status: "processing", updatedAt: new Date(), completedAt: null, cancelledAt: null, error: null }).where(eq(uploadJobs.id, uploadId));
    await db().update(questions).set({ embeddingStatus: "pending" }).where(and(eq(questions.uploadJobId, uploadId), eq(questions.embeddingStatus, "failed")));
    await db().update(uploadSubjectProgress).set({ status: "pending", updatedAt: new Date() }).where(and(eq(uploadSubjectProgress.uploadJobId, uploadId), or(eq(uploadSubjectProgress.status, "failed"), eq(uploadSubjectProgress.status, "partial_failed"))));
    await appendUploadLog(uploadId, "info", "Retry requested for failed batches");
    return NextResponse.json({ ok: true, uploadId });
  }

  if (action === "process_tick") {
    const uploadId = String(form.get("uploadId") || "").trim();
    if (!uploadId) return NextResponse.json({ error: "uploadId is required" }, { status: 400 });
    const embeddingBatchSize = Number(process.env.UPLOAD_EMBED_BATCH_SIZE || 15);
    const safeEmbeddingBatchSize = Math.min(20, Math.max(10, embeddingBatchSize));
    const maxBatchRetries = Number(process.env.UPLOAD_EMBED_BATCH_RETRIES || 3);
    const safeMaxBatchRetries = Math.min(3, Math.max(1, maxBatchRetries));
    const result = await processOneTick(uploadId, safeEmbeddingBatchSize, safeMaxBatchRetries);
    return NextResponse.json({ ok: true, uploadId, ...result });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "File is required." }, { status: 400 });

  const uploadIdFromClient = String(form.get("uploadId") || "").trim();
  const parsed = await parseUploadFile(file);
  const missingColumns = getMissingRequiredColumns(parsed.headers);
  const { validRows, invalidRows } = validateRows(parsed.rows);

  const fileDuplicateKeys = new Set<string>();
  const dbDuplicateKeys = await buildDbDuplicateKeySet(validRows);
  const duplicateRows: Array<{ rowNumber: number; reason: string; question: string }> = [];

  for (const row of validRows) {
    const key = `${slugify(row.subject)}|${normalizeQuestion(row.question)}`;
    if (fileDuplicateKeys.has(key)) {
      duplicateRows.push({ rowNumber: row.rowNumber, reason: "Duplicate question in file", question: row.question });
      continue;
    }
    fileDuplicateKeys.add(key);
    if (dbDuplicateKeys.has(key)) duplicateRows.push({ rowNumber: row.rowNumber, reason: "Duplicate question already exists in database", question: row.question });
  }

  const invalidMap = new Map<number, string>();
  for (const item of invalidRows) invalidMap.set(item.rowNumber, item.reason);
  for (const item of duplicateRows) invalidMap.set(item.rowNumber, item.reason);
  const validImportRows = validRows.filter((row) => !invalidMap.has(row.rowNumber));

  const subjectValues = Array.from(new Set(validRows.map((row) => row.subject)));
  const selectedSubject = subjectValues.length === 1 ? subjectValues[0] : `${subjectValues.length} subjects`;

  if (action === "preview") {
    return NextResponse.json({
      ok: true,
      fileName: file.name,
      totalRowsDetected: parsed.rows.length,
      selectedSubject,
      missingColumns,
      validationStatus: missingColumns.length > 0 || invalidRows.length > 0 || duplicateRows.length > 0 ? "has_issues" : "ready",
      summary: { validRows: validImportRows.length, invalidRows: invalidRows.length, duplicateRows: duplicateRows.length },
      previewRows: pickPreviewRows(validImportRows),
      invalidRows: [...invalidRows, ...duplicateRows].slice(0, 100),
    });
  }

  if (missingColumns.length > 0) return NextResponse.json({ error: `Missing required columns: ${missingColumns.join(", ")}` }, { status: 400 });
  if (validImportRows.length === 0) return NextResponse.json({ error: "No valid rows available for import." }, { status: 400 });

  const uploadId = /^[a-zA-Z0-9-]{16,80}$/.test(uploadIdFromClient) ? uploadIdFromClient : crypto.randomUUID();

  await db().insert(uploadJobs).values({
    id: uploadId,
    fileName: file.name,
    status: "processing",
    totalRowsDetected: parsed.rows.length,
    validRows: validImportRows.length,
    invalidRows: invalidRows.length,
    duplicateRows: duplicateRows.length,
  });

  const allSubjectSlugs = Array.from(new Set(validImportRows.map((row) => slugify(row.subject))));
  const subjectRows = await getExistingSubjectsBySlug(allSubjectSlugs);
  const subjectBySlug = new Map(subjectRows.map((s) => [s.slug, s]));

  for (const row of validImportRows) {
    const slug = slugify(row.subject);
    if (!subjectBySlug.has(slug)) {
      const [created] = await db().insert(subjects).values({ name: row.subject, slug }).returning();
      subjectBySlug.set(slug, created);
    }
  }

  const insertValues = validImportRows.map((row) => {
    const subject = subjectBySlug.get(slugify(row.subject));
    if (!subject) throw new Error("Subject mapping failed during import.");
    return {
      subjectId: subject.id,
      question: row.question,
      questionNormalized: normalizeQuestion(row.question),
      optionA: row.optionA,
      optionB: row.optionB,
      optionC: row.optionC,
      optionD: row.optionD,
      correctAnswer: row.answer,
      explanation: row.explanation ?? null,
      difficulty: row.difficulty ?? null,
      topic: row.topic ?? null,
      source: "admin_upload" as const,
      embeddingId: null,
      embeddingStatus: "pending",
      uploadJobId: uploadId,
    };
  });

  await db().insert(questions).values(insertValues);

  const insertedCounts = await db()
    .select({ subjectId: questions.subjectId, totalQuestions: sql<number>`count(*)` })
    .from(questions)
    .where(eq(questions.uploadJobId, uploadId))
    .groupBy(questions.subjectId);

  const batchSize = Math.min(20, Math.max(10, Number(process.env.UPLOAD_EMBED_BATCH_SIZE || 15)));
  const subjectById = new Map(Array.from(subjectBySlug.values()).map((s) => [s.id, s]));
  for (const item of insertedCounts) {
    const subject = subjectById.get(item.subjectId);
    if (!subject) continue;
    const totalQ = Number(item.totalQuestions);
    await db().insert(uploadSubjectProgress).values({
      uploadJobId: uploadId,
      subjectSlug: subject.slug,
      subjectName: subject.name,
      namespace: toNamespace(subject.slug),
      totalQuestions: totalQ,
      totalBatches: Math.ceil(totalQ / batchSize),
      completedBatches: 0,
      processedQuestions: 0,
      failedBatches: 0,
      status: "pending",
    });
  }

  await appendUploadLog(uploadId, "info", `Import accepted: ${validImportRows.length} valid, ${invalidRows.length + duplicateRows.length} skipped`);
  return NextResponse.json({ ok: true, uploadId, accepted: true, imported: validImportRows.length, skipped: invalidRows.length + duplicateRows.length, status: "processing" });
}
