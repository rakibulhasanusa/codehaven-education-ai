import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, subjects } from "@/lib/db/schema";
import { generateMcqSchema } from "@/lib/validation/mcq";
import { generateUniqueMcq } from "@/lib/ai/mcq-generator";
import { getSimilarityThreshold } from "@/lib/db/settings";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const parsed = generateMcqSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const subjectRow = await db().select().from(subjects).where(eq(subjects.id, parsed.data.subjectId)).limit(1);
  if (!subjectRow[0]) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  const existing = await db()
    .select({
      question: questions.question,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correctAnswer: questions.correctAnswer,
      difficulty: questions.difficulty,
      topic: questions.topic,
    })
    .from(questions)
    .where(eq(questions.subjectId, parsed.data.subjectId))
    .limit(200);

  if (existing.length < 5) {
    return NextResponse.json({ error: "Not enough source questions for this subject." }, { status: 400 });
  }

  const result = await generateUniqueMcq({
    subjectName: subjectRow[0].name,
    existing,
    similarityThreshold: parsed.data.similarityThreshold ?? (await getSimilarityThreshold()),
    maxRetries: parsed.data.maxRetries,
  });

  return NextResponse.json(result);
}
