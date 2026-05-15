import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions } from "@/lib/db/schema";

export async function GET() {
  const totalParticipants = await db().select({ c: sql<number>`count(*)::int` }).from(quizAttempts).where(eq(quizAttempts.status, "submitted"));
  const avgScore = await db().select({ v: sql<number>`coalesce(avg(${quizAttempts.score}),0)::int` }).from(quizAttempts).where(eq(quizAttempts.status, "submitted"));
  const highestScore = await db().select({ v: sql<number>`coalesce(max(${quizAttempts.score}),0)::int` }).from(quizAttempts).where(eq(quizAttempts.status, "submitted"));

  const mostFailed = await db()
    .select({ question: quizExamQuestions.question, wrongCount: sql<number>`count(*)::int` })
    .from(quizAttemptAnswers)
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(sql`${quizAttemptAnswers.selectedAnswer} is not null and ${quizAttemptAnswers.selectedAnswer} <> ${quizExamQuestions.correctAnswer}`)
    .groupBy(quizExamQuestions.question)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const mostCorrect = await db()
    .select({ question: quizExamQuestions.question, correctCount: sql<number>`count(*)::int` })
    .from(quizAttemptAnswers)
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(sql`${quizAttemptAnswers.selectedAnswer} is not null and ${quizAttemptAnswers.selectedAnswer} = ${quizExamQuestions.correctAnswer}`)
    .groupBy(quizExamQuestions.question)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  return NextResponse.json({
    totalParticipants: totalParticipants[0]?.c ?? 0,
    averageScore: avgScore[0]?.v ?? 0,
    highestScore: highestScore[0]?.v ?? 0,
    mostFailedQuestion: mostFailed[0] ?? null,
    mostCorrectQuestion: mostCorrect[0] ?? null,
  });
}
