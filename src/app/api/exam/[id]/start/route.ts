import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions, quizExams } from "@/lib/db/schema";
import { buildOptionShuffle, shuffleArray } from "@/lib/quiz";
import { getExamStatus } from "@/lib/exam-status";

function resolveRemainingSeconds(exam: typeof quizExams.$inferSelect, startedAt: Date, now: Date) {
  if (exam.timingMode === "fixed_end_time") {
    if (!exam.endTime) return 0;
    return Math.max(0, Math.floor((new Date(exam.endTime).getTime() - now.getTime()) / 1000));
  }

  const fullSeconds = Math.max(1, exam.durationMinutes) * 60;
  const elapsed = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  return Math.max(0, fullSeconds - elapsed);
}

function buildQuestionsPayload(exam: typeof quizExams.$inferSelect, rows: Array<typeof quizExamQuestions.$inferSelect>) {
  return rows.map((q) => {
    const shuffled = exam.randomizeOptions
      ? buildOptionShuffle({ optionA: q.optionA, optionB: q.optionB, optionC: q.optionC, optionD: q.optionD, correctAnswer: q.correctAnswer })
      : { options: [q.optionA, q.optionB, q.optionC, q.optionD], optionKeys: ["A", "B", "C", "D"] };

    return {
      id: q.id,
      question: q.question,
      options: shuffled.options,
      optionKeys: shuffled.optionKeys,
      explanation: q.explanation,
      topic: q.topic,
    };
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const examId = Number(id);
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const deviceId = String(body.deviceId ?? "").trim();

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const [exam] = await db().select().from(quizExams).where(eq(quizExams.id, examId)).limit(1);
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  const now = new Date();
  const status = getExamStatus(
    {
      startTime: exam.startTime,
      endTime: exam.endTime,
      timingMode: exam.timingMode,
      durationMinutes: exam.durationMinutes,
    },
    now
  );

  if (status === "upcoming") {
    return NextResponse.json({ error: "Exam has not started yet." }, { status: 403 });
  }
  if (status === "closed") {
    return NextResponse.json({ error: "Exam is closed. You can no longer join this quiz." }, { status: 403 });
  }

  if (exam.multipleDeviceRestricted && deviceId) {
    const [existingOther] = await db()
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.examId, examId), eq(quizAttempts.learnerName, name), eq(quizAttempts.status, "in_progress")))
      .limit(1);

    if (existingOther && existingOther.deviceId && existingOther.deviceId !== deviceId) {
      return NextResponse.json({ error: "This attempt is active on another device." }, { status: 403 });
    }
  }

  const [ongoing] = await db()
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.examId, examId), eq(quizAttempts.learnerName, name), eq(quizAttempts.status, "in_progress")))
    .limit(1);

  if (ongoing) {
    const answerRows = await db().select().from(quizAttemptAnswers).where(eq(quizAttemptAnswers.attemptId, ongoing.id));
    const questionIds = answerRows.map((x) => x.examQuestionId);
    const qRows = questionIds.length ? await db().select().from(quizExamQuestions).where(inArray(quizExamQuestions.id, questionIds)) : [];
    const qMap = new Map(qRows.map((q) => [q.id, q]));
    const ordered = questionIds.map((qid) => qMap.get(qid)).filter(Boolean) as Array<typeof quizExamQuestions.$inferSelect>;
    const remainingSeconds = resolveRemainingSeconds(exam, new Date(ongoing.startedAt), now);

    if (remainingSeconds <= 0) {
      return NextResponse.json({ error: "Exam time is over. Please submit." }, { status: 403 });
    }

    return NextResponse.json({
      ok: true,
      resumed: true,
      attemptId: ongoing.id,
      remainingSeconds,
      answers: answerRows,
      questions: buildQuestionsPayload(exam, ordered),
    });
  }

  const rawQuestions = await db().select().from(quizExamQuestions).where(eq(quizExamQuestions.examId, examId));
  const ordered = exam.randomizeQuestions ? shuffleArray(rawQuestions) : rawQuestions.sort((a, b) => a.sortOrder - b.sortOrder);

  const attemptId = randomUUID();
  await db().insert(quizAttempts).values({
    id: attemptId,
    examId,
    learnerName: name,
    deviceId: deviceId || null,
    totalQuestions: ordered.length,
    status: "in_progress",
  });

  await db().insert(quizAttemptAnswers).values(ordered.map((q) => ({ attemptId, examQuestionId: q.id })));

  const remainingSeconds = resolveRemainingSeconds(exam, now, now);
  if (remainingSeconds <= 0) {
    return NextResponse.json({ error: "Exam time is over." }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    attemptId,
    resumed: false,
    remainingSeconds,
    questions: buildQuestionsPayload(exam, ordered),
  });
}
