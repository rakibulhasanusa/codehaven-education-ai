import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { deleteVectorById } from "@/lib/ai/pinecone";
import { questions, subjects } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const subjectId = Number(req.nextUrl.searchParams.get("subjectId"));
  const source = req.nextUrl.searchParams.get("source")?.trim();
  const topic = req.nextUrl.searchParams.get("topic")?.trim();
  const difficulty = req.nextUrl.searchParams.get("difficulty")?.trim();
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize")) || 20));

  const filters = [];
  if (q) filters.push(ilike(questions.question, `%${q}%`));
  if (Number.isInteger(subjectId) && subjectId > 0) filters.push(eq(questions.subjectId, subjectId));
  if (source === "admin_upload" || source === "ai_generated") filters.push(eq(questions.source, source));
  if (topic) filters.push(ilike(questions.topic, `%${topic}%`));
  if (difficulty) filters.push(eq(questions.difficulty, difficulty));

  const whereClause = filters.length ? and(...filters) : undefined;

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
      difficulty: questions.difficulty,
      topic: questions.topic,
      source: questions.source,
      embeddingId: questions.embeddingId,
      createdAt: questions.createdAt,
      subjectId: subjects.id,
      subjectName: subjects.name,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(whereClause)
    .orderBy(desc(questions.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(whereClause);

  return NextResponse.json({
    questions: rows,
    pagination: {
      page,
      pageSize,
      total: count,
      totalPages: Math.max(1, Math.ceil(count / pageSize)),
    },
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    id?: number;
    subjectId?: number;
    question?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctAnswer?: string;
    explanation?: string | null;
    topic?: string | null;
    difficulty?: string | null;
  } | null;

  if (!body || !Number.isInteger(body.id) || body.id! <= 0) {
    return NextResponse.json({ error: "Valid question id is required." }, { status: 400 });
  }

  const id = body.id!;
  const updateData = {
    ...(Number.isInteger(body.subjectId) && body.subjectId! > 0 ? { subjectId: body.subjectId! } : {}),
    ...(typeof body.question === "string" ? { question: body.question.trim() } : {}),
    ...(typeof body.optionA === "string" ? { optionA: body.optionA.trim() } : {}),
    ...(typeof body.optionB === "string" ? { optionB: body.optionB.trim() } : {}),
    ...(typeof body.optionC === "string" ? { optionC: body.optionC.trim() } : {}),
    ...(typeof body.optionD === "string" ? { optionD: body.optionD.trim() } : {}),
    ...(typeof body.correctAnswer === "string" ? { correctAnswer: body.correctAnswer.trim().toUpperCase() } : {}),
    ...(typeof body.explanation === "string" || body.explanation === null ? { explanation: body.explanation } : {}),
    ...(typeof body.topic === "string" || body.topic === null ? { topic: body.topic } : {}),
    ...(typeof body.difficulty === "string" || body.difficulty === null ? { difficulty: body.difficulty } : {}),
  };

  if (
    "correctAnswer" in updateData &&
    !["A", "B", "C", "D"].includes(updateData.correctAnswer as string)
  ) {
    return NextResponse.json({ error: "Correct answer must be one of A/B/C/D." }, { status: 400 });
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const requiredText = ["question", "optionA", "optionB", "optionC", "optionD"] as const;
  for (const key of requiredText) {
    if (key in updateData && !(updateData[key] as string)) {
      return NextResponse.json({ error: `${key} cannot be empty.` }, { status: 400 });
    }
  }

  const [updated] = await db()
    .update(questions)
    .set(updateData)
    .where(eq(questions.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, question: updated });
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  const body = await req.json().catch(() => null) as { ids?: number[] } | null;
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x) => Number.isInteger(x) && x > 0) : [];

  const targetIds = Number.isInteger(id) && id > 0 ? [id] : ids;
  if (targetIds.length === 0) {
    return NextResponse.json({ error: "Provide id or ids." }, { status: 400 });
  }

  const rows = await db().select().from(questions).where(inArray(questions.id, targetIds));
  for (const row of rows) {
    if (row.embeddingId) await deleteVectorById(row.embeddingId).catch(() => undefined);
  }

  await db().delete(questions).where(inArray(questions.id, targetIds));
  return NextResponse.json({ ok: true, deleted: rows.length });
}
