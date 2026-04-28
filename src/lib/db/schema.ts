import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const subjectEnum = pgEnum("subject", [
    "বাংলা ভাষা ও সাহিত্য",
    "English Language and Literature",
    "বাংলাদেশ বিষয়াবলি",
    "আন্তর্জাতিক বিষয়াবলি",
    "ভূগোল, পরিবেশ ও দুর্যোগ ব্যবস্থাপনা",
    "সাধারণ বিজ্ঞান",
    "কম্পিউটার ও তথ্য প্রযুক্তি",
    "গাণিতিক যুক্তি",
    "মানসিক দক্ষতা",
    "নৈতিকতা, মূল্যবোধ ও সুশাসন",
]);
export const questionLanguageEnum = pgEnum("question_language", ["English", "Bengali"]);
export const questionDifficultyEnum = pgEnum("question_difficulty", ["Basic", "Medium", "Hard"]);

export const examAttempts = pgTable("exam_attempts", {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerName: text("learner_name").notNull(),
    language: questionLanguageEnum("language").notNull(),
    subjects: subjectEnum("subjects").array().notNull(),
    questionCount: integer("question_count").notNull(),
    score: integer("score").notNull(),
    accuracyPercent: integer("accuracy_percent").notNull(),
    avgTimePerQuestion: integer("avg_time_per_question").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const examQuestions = pgTable("exam_questions", {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
        .notNull()
        .references(() => examAttempts.id, { onDelete: "cascade" }),
    subject: subjectEnum("subject").notNull(),
    language: questionLanguageEnum("language").notNull(),
    difficulty: questionDifficultyEnum("difficulty").notNull(),
    syllabusPart: integer("syllabus_part"),
    topic: text("topic").notNull(),
    question: text("question").notNull(),
    options: text("options").array().notNull(),
    correctIndex: integer("correct_index").notNull(),
    explanation: text("explanation").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
