import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { normalizeAnswer } from "@/lib/quiz";
import { quizAttemptAnswers, quizAttempts } from "@/lib/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const examId = Number(id);
  const body = await req.json();
  const attemptId = String(body.attemptId ?? "");

  const [attempt] = await db().select().from(quizAttempts).where(and(eq(quizAttempts.id, attemptId), eq(quizAttempts.examId, examId))).limit(1);
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });

  const updates = Array.isArray(body.answers) ? body.answers : [];
  for (const u of updates) {
    const examQuestionId = Number(u.examQuestionId);
    if (!examQuestionId) continue;
    await db()
      .update(quizAttemptAnswers)
      .set({
        selectedAnswer: normalizeAnswer(u.selectedAnswer),
        isMarkedForReview: u.isMarkedForReview ? 1 : 0,
        timeSpentSeconds: Math.max(0, Number(u.timeSpentSeconds) || 0),
        updatedAt: new Date(),
      })
      .where(and(eq(quizAttemptAnswers.attemptId, attemptId), eq(quizAttemptAnswers.examQuestionId, examQuestionId)));
  }

  return NextResponse.json({ ok: true });
}
