import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, quizExamQuestions, quizExams, subjects } from "@/lib/db/schema";
import { normalizeAnswer } from "@/lib/quiz";

export async function GET() {
  const rows = await db()
    .select({
      id: quizExams.id,
      title: quizExams.title,
      subject: subjects.name,
      topic: quizExams.topic,
      startTime: quizExams.startTime,
      endTime: quizExams.endTime,
      durationMinutes: quizExams.durationMinutes,
      timingMode: quizExams.timingMode,
      createdAt: quizExams.createdAt,
    })
    .from(quizExams)
    .innerJoin(subjects, eq(quizExams.subjectId, subjects.id))
    .orderBy(desc(quizExams.createdAt));

  return NextResponse.json({ quizzes: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsedNegativeMarking = Number(body.negativeMarking);
  const safeNegativeMarking = Number.isFinite(parsedNegativeMarking)
    ? Math.max(0, Math.round(parsedNegativeMarking * 100) / 100)
    : 0;

  const title = String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const selectedQuestionIds = Array.isArray(body.selectedQuestionIds)
    ? body.selectedQuestionIds.map(Number).filter((x: number) => Number.isInteger(x) && x > 0)
    : [];

  const manualQuestions = Array.isArray(body.manualQuestions) ? body.manualQuestions : [];
  const selectedSubjectId = Number(body.subjectId);
  let examSubjectId = Number.isInteger(selectedSubjectId) && selectedSubjectId > 0 ? selectedSubjectId : 0;

  const rows: Array<Omit<typeof quizExamQuestions.$inferInsert, "examId">> = [];
  let sortOrder = 0;

  if (selectedQuestionIds.length) {
    const selectedRows = await db().select().from(questions).where(inArray(questions.id, selectedQuestionIds));
    if (!examSubjectId && selectedRows[0]?.subjectId) examSubjectId = selectedRows[0].subjectId;
    for (const q of selectedRows) {
      rows.push({
        questionId: q.id,
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        subjectId: q.subjectId,
        topic: q.topic,
        difficulty: q.difficulty,
        sortOrder: sortOrder++,
      });
    }
  }

  if (!examSubjectId) {
    const [firstSubject] = await db().select({ id: subjects.id }).from(subjects).limit(1);
    if (firstSubject?.id) examSubjectId = firstSubject.id;
  }

  if (!examSubjectId) {
    return NextResponse.json({ error: "No subject available for this quiz." }, { status: 400 });
  }

  for (const m of manualQuestions) {
    const correctAnswer = normalizeAnswer(m.correctAnswer);
    if (!m.question || !m.optionA || !m.optionB || !m.optionC || !m.optionD || !correctAnswer) continue;
    rows.push({
      questionId: null,
      question: String(m.question),
      optionA: String(m.optionA),
      optionB: String(m.optionB),
      optionC: String(m.optionC),
      optionD: String(m.optionD),
      correctAnswer,
      explanation: m.explanation ? String(m.explanation) : null,
      subjectId: examSubjectId,
      topic: m.topic ? String(m.topic) : null,
      difficulty: m.difficulty ? String(m.difficulty) : null,
      sortOrder: sortOrder++,
    });
  }

  if (!rows.length) return NextResponse.json({ error: "Add at least one question." }, { status: 400 });

  const [exam] = await db()
    .insert(quizExams)
    .values({
      title,
      description: body.description ? String(body.description) : null,
      instructions: body.instructions ? String(body.instructions) : null,
      subjectId: examSubjectId,
      topic: body.topic ? String(body.topic) : null,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      durationMinutes: Math.max(1, Number(body.durationMinutes) || 60),
      timingMode: body.timingMode === "full_duration" ? "full_duration" : "fixed_end_time",
      negativeMarking: safeNegativeMarking,
      randomizeQuestions: body.randomizeQuestions === false ? 0 : 1,
      randomizeOptions: body.randomizeOptions === false ? 0 : 1,
      fullscreenRequired: body.fullscreenRequired === false ? 0 : 1,
      rightClickDisabled: body.rightClickDisabled === false ? 0 : 1,
      copyPasteDisabled: body.copyPasteDisabled === false ? 0 : 1,
      multipleDeviceRestricted: body.multipleDeviceRestricted === false ? 0 : 1,
    })
    .returning();

  await db().insert(quizExamQuestions).values(rows.map((row) => ({ ...row, examId: exam.id })));

  return NextResponse.json({ ok: true, examId: exam.id });
}

export async function PUT(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const subjectId = Number(params.get("subjectId") || 0);
  const subjectIds = params
    .get("subjectIds")
    ?.split(",")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0) ?? [];
  const topic = params.get("topic")?.trim();
  const difficulty = params.get("difficulty")?.trim();
  const source = params.get("source")?.trim();

  const filters = [];
  if (q) filters.push(ilike(questions.question, `%${q}%`));
  if (subjectIds.length > 0) filters.push(inArray(questions.subjectId, subjectIds));
  else if (subjectId > 0) filters.push(eq(questions.subjectId, subjectId));
  if (topic) filters.push(ilike(questions.topic, `%${topic}%`));
  if (difficulty) filters.push(eq(questions.difficulty, difficulty));
  if (source === "admin_upload" || source === "ai_generated") {
    filters.push(eq(questions.source, source));
  }

  const rows = await db()
    .select({
      id: questions.id,
      question: questions.question,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      topic: questions.topic,
      difficulty: questions.difficulty,
      source: questions.source,
      subjectName: subjects.name,
      subjectId: questions.subjectId,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(questions.createdAt))
    .limit(300);

  return NextResponse.json({ questions: rows });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id") || 0);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Quiz id is required." }, { status: 400 });
  }

  const [deleted] = await db()
    .delete(quizExams)
    .where(eq(quizExams.id, id))
    .returning({ id: quizExams.id });

  if (!deleted) {
    return NextResponse.json({ error: "Quiz not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, id: deleted.id });
}
