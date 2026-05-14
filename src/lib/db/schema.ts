import { relations } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const subjects = pgTable(
  "subjects",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 150 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("subjects_slug_unique").on(table.slug)]
);

export const questions = pgTable("questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: varchar("correct_answer", { length: 1 }).notNull(),
  explanation: text("explanation"),
  difficulty: varchar("difficulty", { length: 20 }),
  topic: varchar("topic", { length: 150 }),
  questionNormalized: text("question_normalized").notNull().default(""),
  uploadJobId: varchar("upload_job_id", { length: 80 }),
  source: varchar("source", { length: 24 }).notNull().default("admin_upload"),
  embeddingStatus: varchar("embedding_status", { length: 20 }).notNull().default("pending"),
  embeddingId: varchar("embedding_id", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subjectsRelations = relations(subjects, ({ many }) => ({
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  subject: one(subjects, {
    fields: [questions.subjectId],
    references: [subjects.id],
  }),
}));

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const uploadJobs = pgTable("upload_jobs", {
  id: varchar("id", { length: 80 }).primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).notNull(),
  totalRowsDetected: integer("total_rows_detected").notNull().default(0),
  validRows: integer("valid_rows").notNull().default(0),
  invalidRows: integer("invalid_rows").notNull().default(0),
  duplicateRows: integer("duplicate_rows").notNull().default(0),
  importedRows: integer("imported_rows").notNull().default(0),
  vectorsStored: integer("vectors_stored").notNull().default(0),
  error: text("error"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const uploadLogs = pgTable("upload_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  uploadJobId: varchar("upload_job_id", { length: 80 })
    .notNull()
    .references(() => uploadJobs.id, { onDelete: "cascade" }),
  subjectSlug: varchar("subject_slug", { length: 180 }),
  batchNumber: integer("batch_number"),
  level: varchar("level", { length: 16 }).notNull().default("info"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const uploadSubjectProgress = pgTable(
  "upload_subject_progress",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    uploadJobId: varchar("upload_job_id", { length: 80 })
      .notNull()
      .references(() => uploadJobs.id, { onDelete: "cascade" }),
    subjectSlug: varchar("subject_slug", { length: 180 }).notNull(),
    subjectName: varchar("subject_name", { length: 150 }).notNull(),
    namespace: varchar("namespace", { length: 220 }).notNull(),
    totalQuestions: integer("total_questions").notNull().default(0),
    totalBatches: integer("total_batches").notNull().default(0),
    completedBatches: integer("completed_batches").notNull().default(0),
    processedQuestions: integer("processed_questions").notNull().default(0),
    failedBatches: integer("failed_batches").notNull().default(0),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("upload_subject_progress_job_subject_unique").on(table.uploadJobId, table.subjectSlug)]
);
