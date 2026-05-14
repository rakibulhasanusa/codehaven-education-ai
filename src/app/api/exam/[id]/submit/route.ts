import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { aiInsightsByTopic, computeAttemptRank } from "@/lib/quiz";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions, quizExams } from "@/lib/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const examId = Number(id);
  const body = await req.json();
  const attemptId = String(body.attemptId ?? "");

  const [attempt] = await db().select().from(quizAttempts).where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.examId, examId))).limit(1);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const [exam] = await db().select().from(quizExams).where(eq(quizExams.id, examId)).limit(1);
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  const rows = await db()
    .select({
      answerId: quizAttemptAnswers.id,
      examQuestionId: quizAttemptAnswers.examQuestionId,
      selectedAnswer: quizAttemptAnswers.selectedAnswer,
      timeSpentSeconds: quizAttemptAnswers.timeSpentSeconds,
      correctAnswer: quizExamQuestions.correctAnswer,
      topic: quizExamQuestions.topic,
    })
    .from(quizAttemptAnswers)
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(eq(quizAttemptAnswers.attemptId, attemptId));

  let correct = 0;
  let wrong = 0;
  let skipped = 0;
  let totalTime = 0;

  for (const row of rows) {
    totalTime += row.timeSpentSeconds;
    if (!row.selectedAnswer) skipped += 1;
    else if (row.selectedAnswer === row.correctAnswer) correct += 1;
    else wrong += 1;
  }

  const score = Math.round(correct - wrong * exam.negativeMarking);
  const accuracyPercent = rows.length ? Math.round((correct / rows.length) * 100) : 0;

  const insights = aiInsightsByTopic(
    rows.map((r) => ({ topic: r.topic, isCorrect: !!r.selectedAnswer && r.selectedAnswer === r.correctAnswer }))
  );

  await db()
    .update(quizAttempts)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      correct,
      wrong,
      skipped,
      score,
      accuracyPercent,
      timeTakenSeconds: totalTime,
      aiStrongTopics: JSON.stringify(insights.strong),
      aiWeakTopics: JSON.stringify(insights.weak),
      aiRepeatedMistakes: JSON.stringify(insights.repeatedMistakes),
      aiSuggestions: JSON.stringify(insights.suggestions),
    })
    .where(eq(quizAttempts.id, attemptId));

  const rank = await computeAttemptRank(attemptId);

  return NextResponse.json({ ok: true, attemptId, rank });
}
