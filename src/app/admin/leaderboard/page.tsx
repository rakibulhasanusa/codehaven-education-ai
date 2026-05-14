import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions, quizExams } from "@/lib/db/schema";
import { LeaderboardAnalyticsClient, type LeaderboardAttempt, type QuestionInsight } from "./LeaderboardAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AdminLeaderboardPage() {
  const attempts = await db()
    .select({
      id: quizAttempts.id,
      learnerName: quizAttempts.learnerName,
      examTitle: quizExams.title,
      score: quizAttempts.score,
      accuracyPercent: quizAttempts.accuracyPercent,
      correct: quizAttempts.correct,
      wrong: quizAttempts.wrong,
      skipped: quizAttempts.skipped,
      timeTakenSeconds: quizAttempts.timeTakenSeconds,
      createdAt: quizAttempts.createdAt,
    })
    .from(quizAttempts)
    .innerJoin(quizExams, eq(quizAttempts.examId, quizExams.id))
    .where(eq(quizAttempts.status, "submitted"))
    .orderBy(desc(quizAttempts.score), desc(quizAttempts.accuracyPercent), desc(quizAttempts.createdAt))
    .limit(1000);

  const mostFailed = await db()
    .select({ question: quizExamQuestions.question, count: sql<number>`count(*)::int` })
    .from(quizAttemptAnswers)
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(sql`${quizAttemptAnswers.selectedAnswer} is not null and ${quizAttemptAnswers.selectedAnswer} <> ${quizExamQuestions.correctAnswer}`)
    .groupBy(quizExamQuestions.question)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const mostCorrect = await db()
    .select({ question: quizExamQuestions.question, count: sql<number>`count(*)::int` })
    .from(quizAttemptAnswers)
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(sql`${quizAttemptAnswers.selectedAnswer} is not null and ${quizAttemptAnswers.selectedAnswer} = ${quizExamQuestions.correctAnswer}`)
    .groupBy(quizExamQuestions.question)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const clientAttempts: LeaderboardAttempt[] = attempts.map((attempt) => ({
    ...attempt,
    createdAt: attempt.createdAt.toISOString(),
  }));
  const failedInsight: QuestionInsight | null = mostFailed[0] ?? null;
  const correctInsight: QuestionInsight | null = mostCorrect[0] ?? null;

  return <LeaderboardAnalyticsClient attempts={clientAttempts} mostFailed={failedInsight} mostCorrect={correctInsight} />;
}
