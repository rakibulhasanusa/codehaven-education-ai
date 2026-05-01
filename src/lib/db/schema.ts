import { integer, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const mcqGenerationRequests = pgTable("mcq_generation_requests", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    learnerName: varchar("learner_name", { length: 120 }),
    language: varchar("language", { length: 20 }).notNull(),
    requestedSubjects: jsonb("requested_subjects").$type<string[]>().notNull(),
    requestedSubjectCount: integer("requested_subject_count").notNull(),
    requestedQuestionCount: integer("requested_question_count").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    generatedQuestionCount: integer("generated_question_count").notNull().default(0),
    failureReason: text("failure_reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const generatedMcqs = pgTable("generated_mcqs", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    requestId: integer("request_id")
        .notNull()
        .references(() => mcqGenerationRequests.id, { onDelete: "cascade" }),
    questionId: varchar("question_id", { length: 128 }).notNull(),
    learnerName: varchar("learner_name", { length: 120 }),
    subject: varchar("subject", { length: 120 }).notNull(),
    language: varchar("language", { length: 20 }).notNull(),
    difficulty: varchar("difficulty", { length: 20 }).notNull(),
    syllabusPart: integer("syllabus_part").notNull(),
    topic: text("topic").notNull(),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mcqAttemptResults = pgTable("mcq_attempt_results", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    requestId: integer("request_id")
        .notNull()
        .references(() => mcqGenerationRequests.id, { onDelete: "cascade" }),
    learnerName: varchar("learner_name", { length: 120 }).notNull(),
    language: varchar("language", { length: 20 }).notNull(),
    subjects: jsonb("subjects").$type<string[]>().notNull(),
    questionCount: integer("question_count").notNull(),
    score: integer("score").notNull(),
    wrong: integer("wrong").notNull(),
    unanswered: integer("unanswered").notNull(),
    accuracyPercent: integer("accuracy_percent").notNull(),
    avgTimePerQuestion: integer("avg_time_per_question").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
});
