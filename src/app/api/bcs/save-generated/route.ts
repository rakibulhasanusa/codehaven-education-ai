import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { questions, subjects } from "@/lib/db/schema";

const schema = z.object({
  subjectId: z.number().int().positive(),
  mcq: z.object({
    question: z.string().min(10),
    optionA: z.string().min(1),
    optionB: z.string().min(1),
    optionC: z.string().min(1),
    optionD: z.string().min(1),
    correctAnswer: z.enum(["A", "B", "C", "D"]),
    explanation: z.string().optional(),
    difficulty: z.string().optional(),
    topic: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const subjectRows = await db().select().from(subjects).where(eq(subjects.id, parsed.data.subjectId)).limit(1);
  const subject = subjectRows[0];
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  const [created] = await db()
    .insert(questions)
    .values({
      subjectId: subject.id,
      question: parsed.data.mcq.question,
      optionA: parsed.data.mcq.optionA,
      optionB: parsed.data.mcq.optionB,
      optionC: parsed.data.mcq.optionC,
      optionD: parsed.data.mcq.optionD,
      correctAnswer: parsed.data.mcq.correctAnswer,
      explanation: parsed.data.mcq.explanation ?? null,
      difficulty: parsed.data.mcq.difficulty ?? null,
      topic: parsed.data.mcq.topic ?? null,
      source: "ai_generated",
    })
    .returning({ id: questions.id });
  return NextResponse.json({ ok: true, questionId: created.id });
}
