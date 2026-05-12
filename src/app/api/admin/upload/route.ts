import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, subjects } from "@/lib/db/schema";
import { slugify } from "@/lib/helpers/slug";
import { parseUploadFile } from "@/lib/admin/upload-parser";
import { buildEmbeddingText, generateEmbedding } from "@/lib/ai/embeddings";
import { upsertQuestionVector } from "@/lib/ai/pinecone";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const rows = await parseUploadFile(file);
  let inserted = 0;

  for (const row of rows) {
    const slug = slugify(row.subject);
    const existingSubject = await db().select().from(subjects).where(eq(subjects.slug, slug)).limit(1);

    const subject =
      existingSubject[0] ||
      (
        await db()
          .insert(subjects)
          .values({ name: row.subject, slug })
          .returning()
      )[0];

    const [createdQuestion] = await db()
      .insert(questions)
      .values({
        subjectId: subject.id,
        question: row.question,
        optionA: row.optionA,
        optionB: row.optionB,
        optionC: row.optionC,
        optionD: row.optionD,
        correctAnswer: row.answer,
        explanation: row.explanation ?? null,
        difficulty: row.difficulty ?? null,
        topic: row.topic ?? null,
      })
      .returning({ id: questions.id });

    const vectorId = `q-${createdQuestion.id}`;
    const embeddingInput = buildEmbeddingText({
      subject: subject.name,
      question: row.question,
      optionA: row.optionA,
      optionB: row.optionB,
      optionC: row.optionC,
      optionD: row.optionD,
    });
    const embedding = await generateEmbedding(embeddingInput);

    await upsertQuestionVector({
      id: vectorId,
      values: embedding,
      metadata: {
        subject: subject.name,
        questionId: createdQuestion.id,
      },
    });

    await db().update(questions).set({ embeddingId: vectorId }).where(eq(questions.id, createdQuestion.id));
    inserted += 1;
  }

  return NextResponse.json({ ok: true, inserted, total: rows.length });
}
