import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions, quizExams } from "@/lib/db/schema";
import { LeaderboardAnalyticsClient, type ExamOption, type LeaderboardAttempt, type Period, type QuestionInsight } from "./LeaderboardAnalyticsClient";

export const dynamic = "force-dynamic";

function getPeriodFromQuery(value: string | undefined): Period {
  if (value === "daily" || value === "weekly" || value === "monthly" || value === "all") return value;
  return "all";
}

function getPeriodStart(period: Period): Date | null {
  const now = new Date();
  if (period === "daily") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (period === "weekly") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "monthly") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export default async function AdminLeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; examId?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const period = getPeriodFromQuery(params.period);

  const exams = await db()
    .select({ id: quizExams.id, title: quizExams.title, createdAt: quizExams.createdAt })
    .from(quizExams)
    .orderBy(desc(quizExams.createdAt))
    .limit(200);

  const examOptions: ExamOption[] = exams.map((e) => ({ id: e.id, title: e.title }));
  const requestedExamId = Number(params.examId ?? 0);
  const defaultExamId = examOptions[0]?.id ?? null;
  const selectedExamId =
    Number.isInteger(requestedExamId) && examOptions.some((e) => e.id === requestedExamId)
      ? requestedExamId
      : defaultExamId;

  const periodStart = getPeriodStart(period);
  const attemptFilters = [eq(quizAttempts.status, "submitted")];
  if (selectedExamId) attemptFilters.push(eq(quizAttempts.examId, selectedExamId));
  if (periodStart) attemptFilters.push(gte(quizAttempts.createdAt, periodStart));

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
    .where(and(...attemptFilters))
    .orderBy(desc(quizAttempts.score), desc(quizAttempts.accuracyPercent), desc(quizAttempts.createdAt))
    .limit(3000);

  const insightFilters = [
    sql`${quizAttemptAnswers.selectedAnswer} is not null`,
    eq(quizAttempts.status, "submitted"),
  ];
  if (selectedExamId) insightFilters.push(eq(quizAttempts.examId, selectedExamId));
  if (periodStart) insightFilters.push(gte(quizAttempts.createdAt, periodStart));

  const mostFailed = await db()
    .select({ question: quizExamQuestions.question, count: sql<number>`count(*)::int` })
    .from(quizAttemptAnswers)
    .innerJoin(quizAttempts, eq(quizAttemptAnswers.attemptId, quizAttempts.id))
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(and(...insightFilters, sql`${quizAttemptAnswers.selectedAnswer} <> ${quizExamQuestions.correctAnswer}`))
    .groupBy(quizExamQuestions.question)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const mostCorrect = await db()
    .select({ question: quizExamQuestions.question, count: sql<number>`count(*)::int` })
    .from(quizAttemptAnswers)
    .innerJoin(quizAttempts, eq(quizAttemptAnswers.attemptId, quizAttempts.id))
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(and(...insightFilters, sql`${quizAttemptAnswers.selectedAnswer} = ${quizExamQuestions.correctAnswer}`))
    .groupBy(quizExamQuestions.question)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const clientAttempts: LeaderboardAttempt[] = attempts.map((attempt) => ({
    ...attempt,
    createdAt: attempt.createdAt.toISOString(),
  }));
  const failedInsight: QuestionInsight | null = mostFailed[0] ?? null;
  const correctInsight: QuestionInsight | null = mostCorrect[0] ?? null;

  return (
    <LeaderboardAnalyticsClient
      attempts={clientAttempts}
      mostFailed={failedInsight}
      mostCorrect={correctInsight}
      period={period}
      examOptions={examOptions}
      selectedExamId={selectedExamId}
    />
  );
}
