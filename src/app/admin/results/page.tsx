import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttempts, quizExams } from "@/lib/db/schema";
import { ResultsAnalyticsClient, type ResultAnalyticsRow } from "./ResultsAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  const results = await db()
    .select({
      id: quizAttempts.id,
      learnerName: quizAttempts.learnerName,
      score: quizAttempts.score,
      correct: quizAttempts.correct,
      wrong: quizAttempts.wrong,
      skipped: quizAttempts.skipped,
      totalQuestions: quizAttempts.totalQuestions,
      accuracyPercent: quizAttempts.accuracyPercent,
      timeTakenSeconds: quizAttempts.timeTakenSeconds,
      status: quizAttempts.status,
      createdAt: quizAttempts.createdAt,
      examTitle: quizExams.title,
    })
    .from(quizAttempts)
    .innerJoin(quizExams, eq(quizAttempts.examId, quizExams.id))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(500);

  const clientResults: ResultAnalyticsRow[] = results.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
  }));

  return <ResultsAnalyticsClient results={clientResults} />;
}
