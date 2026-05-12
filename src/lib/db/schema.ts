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
