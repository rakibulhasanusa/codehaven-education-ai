import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { deleteVectorById } from "@/lib/ai/pinecone";
import { questions, subjects } from "@/lib/db/schema";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const subjectId = Number(req.nextUrl.searchParams.get("subjectId"));
  const source = req.nextUrl.searchParams.get("source")?.trim();

  const filters = [];
  if (q) filters.push(ilike(questions.question, `%${q}%`));
  if (Number.isInteger(subjectId) && subjectId > 0) filters.push(eq(questions.subjectId, subjectId));
  if (source === "admin_upload" || source === "ai_generated") filters.push(eq(questions.source, source));

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
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(questions.createdAt))
    .limit(500);

  return NextResponse.json({ questions: rows });
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
