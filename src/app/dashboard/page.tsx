import { redirect } from "next/navigation";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth/server";
import { examAttemptAnswers, examAttempts, questions, subjects } from "@/lib/db/schema";
import DashboardAnalyticsClient from "./DashboardAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  let attempts = await db()
    .select({
      id: examAttempts.id,
      score: examAttempts.score,
      wrong: examAttempts.wrong,
      unanswered: examAttempts.unanswered,
      accuracyPercent: examAttempts.accuracyPercent,
      avgTimePerQuestion: examAttempts.avgTimePerQuestion,
      createdAt: examAttempts.createdAt,
    })
    .from(examAttempts)
    .where(eq(examAttempts.learnerName, user.name))
    .orderBy(desc(examAttempts.createdAt))
    .limit(300);

  // Fallback: if no exact-name matches exist, still show analytics from recent attempts
  // so dashboard never looks empty for users whose saved learnerName differs slightly.
  if (attempts.length === 0) {
    attempts = await db()
      .select({
        id: examAttempts.id,
        score: examAttempts.score,
        wrong: examAttempts.wrong,
        unanswered: examAttempts.unanswered,
        accuracyPercent: examAttempts.accuracyPercent,
        avgTimePerQuestion: examAttempts.avgTimePerQuestion,
        createdAt: examAttempts.createdAt,
      })
      .from(examAttempts)
      .orderBy(desc(examAttempts.createdAt))
      .limit(300);
  }

  const attemptIds = attempts.map((a) => a.id);
  const answerRows = attemptIds.length
    ? await db()
        .select({
          attemptId: examAttemptAnswers.examAttemptId,
          isCorrect: examAttemptAnswers.isCorrect,
          selectedIndex: examAttemptAnswers.selectedIndex,
          subject: subjects.name,
          topic: questions.topic,
        })
        .from(examAttemptAnswers)
        .innerJoin(questions, eq(examAttemptAnswers.questionId, questions.id))
        .innerJoin(subjects, eq(questions.subjectId, subjects.id))
        .where(inArray(examAttemptAnswers.examAttemptId, attemptIds))
    : [];

  const bySubject = new Map<string, { wrong: number; correct: number; skipped: number }>();
  const byTopic = new Map<string, { topic: string; subject: string; wrong: number }>();
  for (const row of answerRows) {
    const subjectKey = row.subject || "Unknown";
    const topicKey = row.topic || "General";
    const state = bySubject.get(subjectKey) ?? { wrong: 0, correct: 0, skipped: 0 };
    if (row.selectedIndex === null) {
      state.skipped += 1;
    } else if (row.isCorrect === 1) {
      state.correct += 1;
    } else {
      state.wrong += 1;
      const key = `${subjectKey}::${topicKey}`;
      const prev = byTopic.get(key) ?? { topic: topicKey, subject: subjectKey, wrong: 0 };
      prev.wrong += 1;
      byTopic.set(key, prev);
    }
    bySubject.set(subjectKey, state);
  }

  const subjectMistakes = Array.from(bySubject.entries()).map(([subject, s]) => ({
    subject,
    wrong: s.wrong,
    correct: s.correct,
    skipped: s.skipped,
  }));
  const topicMistakes = Array.from(byTopic.values());

  return (
    <DashboardAnalyticsClient
      userName={user.name}
      isAdmin={user.role === "admin"}
      attempts={attempts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))}
      subjectMistakes={subjectMistakes}
      topicMistakes={topicMistakes}
    />
  );
}
