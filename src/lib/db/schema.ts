import { relations } from "drizzle-orm";
import { foreignKey, integer, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

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

export const examSessions = pgTable("exam_sessions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  learnerName: varchar("learner_name", { length: 120 }).notNull(),
  language: varchar("language", { length: 20 }).notNull(),
  subjects: text("subjects").notNull(),
  questionCount: integer("question_count").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("generated"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const examSessionQuestions = pgTable("exam_session_questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examSessionId: varchar("exam_session_id", { length: 80 })
    .notNull()
    .references(() => examSessions.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const examAttempts = pgTable("exam_attempts", {
  id: varchar("id", { length: 80 }).primaryKey(),
  examSessionId: varchar("exam_session_id", { length: 80 })
    .notNull()
    .references(() => examSessions.id, { onDelete: "cascade" }),
  learnerName: varchar("learner_name", { length: 120 }).notNull(),
  score: integer("score").notNull().default(0),
  wrong: integer("wrong").notNull().default(0),
  unanswered: integer("unanswered").notNull().default(0),
  accuracyPercent: integer("accuracy_percent").notNull().default(0),
  avgTimePerQuestion: integer("avg_time_per_question").notNull().default(0),
  estimatedPreparationLevel: varchar("estimated_preparation_level", { length: 32 }),
  aiSummary: text("ai_summary"),
  aiStrengths: text("ai_strengths"),
  aiImprovements: text("ai_improvements"),
  aiWeakTopics: text("ai_weak_topics"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const examAttemptAnswers = pgTable("exam_attempt_answers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examAttemptId: varchar("exam_attempt_id", { length: 80 })
    .notNull()
    .references(() => examAttempts.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  selectedIndex: integer("selected_index"),
  isCorrect: integer("is_correct").notNull().default(0),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizExams = pgTable("quiz_exams", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  instructions: text("instructions"),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "restrict" }),
  topic: varchar("topic", { length: 150 }),
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
  durationMinutes: integer("duration_minutes").notNull().default(60),
  timingMode: varchar("timing_mode", { length: 24 }).notNull().default("fixed_end_time"),
  negativeMarking: integer("negative_marking").notNull().default(0),
  randomizeQuestions: integer("randomize_questions").notNull().default(1),
  randomizeOptions: integer("randomize_options").notNull().default(1),
  fullscreenRequired: integer("fullscreen_required").notNull().default(1),
  rightClickDisabled: integer("right_click_disabled").notNull().default(1),
  copyPasteDisabled: integer("copy_paste_disabled").notNull().default(1),
  multipleDeviceRestricted: integer("multiple_device_restricted").notNull().default(1),
  isPublished: integer("is_published").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizExamQuestions = pgTable("quiz_exam_questions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  examId: integer("exam_id")
    .notNull()
    .references(() => quizExams.id, { onDelete: "cascade" }),
  questionId: integer("question_id").references(() => questions.id, { onDelete: "set null" }),
  question: text("question").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: varchar("correct_answer", { length: 1 }).notNull(),
  explanation: text("explanation"),
  subjectId: integer("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  topic: varchar("topic", { length: 150 }),
  difficulty: varchar("difficulty", { length: 20 }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizAttempts = pgTable("quiz_attempts", {
  id: varchar("id", { length: 80 }).primaryKey(),
  examId: integer("exam_id")
    .notNull()
    .references(() => quizExams.id, { onDelete: "cascade" }),
  learnerName: varchar("learner_name", { length: 120 }).notNull(),
  deviceId: varchar("device_id", { length: 120 }),
  status: varchar("status", { length: 24 }).notNull().default("in_progress"),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  totalQuestions: integer("total_questions").notNull().default(0),
  correct: integer("correct").notNull().default(0),
  wrong: integer("wrong").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  score: integer("score").notNull().default(0),
  accuracyPercent: integer("accuracy_percent").notNull().default(0),
  timeTakenSeconds: integer("time_taken_seconds").notNull().default(0),
  rank: integer("rank"),
  aiStrongTopics: text("ai_strong_topics"),
  aiWeakTopics: text("ai_weak_topics"),
  aiRepeatedMistakes: text("ai_repeated_mistakes"),
  aiSuggestions: text("ai_suggestions"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const quizAttemptAnswers = pgTable("quiz_attempt_answers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  attemptId: varchar("attempt_id", { length: 80 })
    .notNull()
    .references(() => quizAttempts.id, { onDelete: "cascade" }),
  examQuestionId: integer("exam_question_id")
    .notNull()
    .references(() => quizExamQuestions.id, { onDelete: "cascade" }),
  selectedAnswer: varchar("selected_answer", { length: 1 }),
  isMarkedForReview: integer("is_marked_for_review").notNull().default(0),
  timeSpentSeconds: integer("time_spent_seconds").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    qualification: varchar("qualification", { length: 150 }),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 20 }).notNull().default("user"),
    createdByUserId: integer("created_by_user_id"),
    isActive: integer("is_active").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("users_phone_unique").on(table.phone),
    foreignKey({
      name: "users_created_by_user_id_fkey",
      columns: [table.createdByUserId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  ]
);

export const authSessions = pgTable("auth_sessions", {
  id: varchar("id", { length: 80 }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
