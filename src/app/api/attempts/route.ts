import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { examAttemptAnswers, examAttempts, examSessionQuestions, examSessions, questions, subjects } from "@/lib/db/schema";
import { generateAiReview } from "@/lib/ai/mcq-generator";
import { submitAttemptSchema } from "@/lib/validation/mcq";

export async function GET(req: NextRequest) {
  const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("limit") || 20), 50));
  const rows = await db()
    .select()
    .from(examAttempts)
    .orderBy(desc(examAttempts.createdAt))
    .limit(limit);

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      learnerName: row.learnerName,
      createdAt: row.createdAt,
      language: "English",
      subjects: [] as string[],
      questionCount: row.score + row.wrong + row.unanswered,
      score: row.score,
      accuracyPercent: row.accuracyPercent,
      avgTimePerQuestion: row.avgTimePerQuestion,
    }))
  );
}

export async function POST(req: NextRequest) {
  const parsed = submitAttemptSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const payload = parsed.data;
  if (payload.subjects.length > 2) {
    return NextResponse.json({ error: "Maximum 2 subjects are allowed." }, { status: 400 });
  }

  const [session] = await db().select().from(examSessions).where(eq(examSessions.id, payload.requestId)).limit(1);
  if (!session) return NextResponse.json({ error: "Exam session not found." }, { status: 404 });

  const sessionQuestions = await db()
    .select({ questionId: examSessionQuestions.questionId })
    .from(examSessionQuestions)
    .where(eq(examSessionQuestions.examSessionId, payload.requestId))
    .orderBy(asc(examSessionQuestions.sortOrder));

  if (sessionQuestions.length !== payload.questionCount || sessionQuestions.length !== payload.answers.length) {
    return NextResponse.json({ error: "Answer payload does not match generated exam questions." }, { status: 400 });
  }

  const questionRows = await db()
    .select({
      id: questions.id,
      correctAnswer: questions.correctAnswer,
      topic: questions.topic,
      subject: subjects.name,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(inArray(questions.id, sessionQuestions.map((q) => q.questionId)));
  const questionById = new Map(questionRows.map((q) => [q.id, q]));

  const weakTopicsCounter = new Map<string, number>();
  const answerRows = sessionQuestions.map((sq, index) => {
    const row = questionById.get(sq.questionId);
    const selected = payload.answers[index];
    const expected = row ? ["A", "B", "C", "D"].indexOf(row.correctAnswer) : -1;
    const isCorrect = selected !== null && selected === expected;

    if (!isCorrect) {
      const key = `${row?.subject ?? "Unknown"} - ${row?.topic ?? "General"}`;
      weakTopicsCounter.set(key, (weakTopicsCounter.get(key) ?? 0) + 1);
    }

    return {
      questionId: sq.questionId,
      selectedIndex: selected,
      isCorrect: isCorrect ? 1 : 0,
      timeSpentSeconds: payload.timeSpent?.[index] ?? payload.avgTimePerQuestion,
    };
  });

  const weakTopics = Array.from(weakTopicsCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([topic]) => topic);

  const aiReview = await generateAiReview({
    language: payload.language,
    subjects: payload.subjects,
    score: {
      correct: payload.score,
      wrong: payload.wrong,
      unanswered: payload.unanswered,
      accuracyPercent: payload.accuracyPercent,
    },
    weakTopics,
  });

  const attemptId = randomUUID();
  await db().transaction(async (tx) => {
    await tx.insert(examAttempts).values({
      id: attemptId,
      examSessionId: payload.requestId,
      learnerName: payload.learnerName,
      score: payload.score,
      wrong: payload.wrong,
      unanswered: payload.unanswered,
      accuracyPercent: payload.accuracyPercent,
      avgTimePerQuestion: payload.avgTimePerQuestion,
      estimatedPreparationLevel: aiReview.estimatedPreparationLevel,
      aiSummary: aiReview.summary,
      aiStrengths: JSON.stringify(aiReview.strengths),
      aiImprovements: JSON.stringify(aiReview.improvements),
      aiWeakTopics: JSON.stringify(aiReview.weakTopics),
    });

    await tx.insert(examAttemptAnswers).values(
      answerRows.map((answer) => ({
        examAttemptId: attemptId,
        questionId: answer.questionId,
        selectedIndex: answer.selectedIndex,
        isCorrect: answer.isCorrect,
        timeSpentSeconds: answer.timeSpentSeconds,
      }))
    );

    await tx.update(examSessions).set({ status: "submitted" }).where(and(eq(examSessions.id, payload.requestId)));
  });

  return NextResponse.json({
    ok: true,
    attemptId,
    review: aiReview,
  });
}
