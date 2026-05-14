import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { examSessionQuestions, examSessions, questions, subjects } from "@/lib/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { generateExamMcqs } from "@/lib/ai/mcq-generator";
import { querySimilarVectorsByNamespace } from "@/lib/ai/pinecone";
import { generateExamSchema } from "@/lib/validation/mcq";
import { slugify } from "@/lib/helpers/slug";

function normalizeQuestion(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST(req: NextRequest) {
  const parsed = generateExamSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const input = parsed.data;
  const expectedQuestionCount = input.subjects.length * 10;
  if (input.subjects.length > 2) {
    return NextResponse.json({ error: "Maximum 2 subjects are allowed." }, { status: 400 });
  }

  const subjectRows = await db().select().from(subjects).where(inArray(subjects.name, input.subjects));
  if (subjectRows.length !== input.subjects.length) {
    return NextResponse.json({ error: "One or more selected subjects are invalid." }, { status: 400 });
  }

  const retrievalQuery = [
    `BCS job exam MCQ pattern for subjects: ${input.subjects.join(", ")}`,
    `Language: ${input.language}`,
    input.referenceYearFrom || input.referenceYearTo
      ? `Exam years between ${input.referenceYearFrom ?? "N/A"} and ${input.referenceYearTo ?? "N/A"}`
      : "",
  ].filter(Boolean).join(" | ");

  const retrievalVector = await generateEmbedding(retrievalQuery);
  const pineconeResults = await Promise.all(
    subjectRows.map((s) => querySimilarVectorsByNamespace(retrievalVector, `mcq-${slugify(s.slug || s.name)}`, 24))
  );

  const retrievedQuestionIds = Array.from(
    new Set(
      pineconeResults
        .flat()
        .map((m) => Number((m.metadata as Record<string, unknown> | undefined)?.questionId))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );

  const selectedSubjectIds = subjectRows.map((s) => s.id);
  const pineconeContextRows = retrievedQuestionIds.length > 0
    ? await db()
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
      .where(inArray(questions.id, retrievedQuestionIds))
      .limit(60)
    : [];

  const dbFallbackRows = await db()
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
      .where(inArray(questions.subjectId, selectedSubjectIds))
      .orderBy(desc(questions.createdAt))
      .limit(60);

  const contextRows = [...pineconeContextRows, ...dbFallbackRows].slice(0, 60);
  if (contextRows.length < 10) {
    return NextResponse.json({ error: "Not enough source questions for the selected subjects." }, { status: 400 });
  }

  const generated = await generateExamMcqs({
    subjects: input.subjects,
    language: input.language,
    referenceContext: contextRows,
    questionCount: expectedQuestionCount,
    referenceYearFrom: input.referenceYearFrom,
    referenceYearTo: input.referenceYearTo,
  });

  const existingRows = await db()
    .select({ questionNormalized: questions.questionNormalized })
    .from(questions)
    .where(inArray(questions.subjectId, selectedSubjectIds))
    .limit(2000);
  const existingNormalized = new Set(existingRows.map((r) => r.questionNormalized));

  const uniqueGenerated = [];
  const generatedSet = new Set<string>();
  for (const row of generated) {
    const normalized = normalizeQuestion(row.question);
    if (generatedSet.has(normalized) || existingNormalized.has(normalized)) continue;
    generatedSet.add(normalized);
    uniqueGenerated.push(row);
  }

  if (uniqueGenerated.length < expectedQuestionCount) {
    return NextResponse.json({ error: `Could not generate ${expectedQuestionCount} unique exam-style MCQs. Please retry.` }, { status: 422 });
  }

  const examSessionId = randomUUID();
  const createdAt = new Date();

  const payload = uniqueGenerated.slice(0, expectedQuestionCount);
  const inserted = await db().transaction(async (tx) => {
    await tx.insert(examSessions).values({
      id: examSessionId,
      learnerName: input.learnerName,
      language: input.language,
      subjects: JSON.stringify(input.subjects),
      questionCount: expectedQuestionCount,
      status: "generated",
    });

    const insertedQuestions = await tx.insert(questions).values(
      payload.map((mcq) => {
        const subjectMatch = subjectRows.find((s) => s.name === mcq.subject) ?? subjectRows[0];
        return {
          subjectId: subjectMatch.id,
          question: mcq.question,
          optionA: mcq.optionA,
          optionB: mcq.optionB,
          optionC: mcq.optionC,
          optionD: mcq.optionD,
          correctAnswer: mcq.correctAnswer,
          explanation: mcq.explanation,
          difficulty: mcq.difficulty ?? "Medium",
          topic: mcq.topic ?? "General",
          questionNormalized: normalizeQuestion(mcq.question),
          source: "ai_generated",
          embeddingStatus: "pending",
        };
      })
    ).returning({ id: questions.id });

    await tx.insert(examSessionQuestions).values(
      insertedQuestions.map((q, idx) => ({ examSessionId, questionId: q.id, sortOrder: idx + 1 }))
    );

    return insertedQuestions;
  });

  const generatedQuestions = await db()
    .select({
      id: questions.id,
      subject: subjects.name,
      question: questions.question,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correctAnswer: questions.correctAnswer,
      explanation: questions.explanation,
      difficulty: questions.difficulty,
      topic: questions.topic,
    })
    .from(questions)
    .innerJoin(subjects, eq(questions.subjectId, subjects.id))
    .where(inArray(questions.id, inserted.map((i) => i.id)));

  const orderMap = new Map(inserted.map((x, i) => [x.id, i]));
  const sorted = generatedQuestions.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return NextResponse.json({
    requestId: examSessionId,
    questions: sorted.map((q) => ({
      id: `exam-${examSessionId}-${q.id}`,
      dbQuestionId: q.id,
      examSessionId,
      generatedAt: createdAt.toISOString(),
      subject: q.subject,
      language: input.language,
      difficulty: (q.difficulty ?? "Medium") as "Basic" | "Medium" | "Hard",
      topic: q.topic ?? "General",
      question: q.question,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctIndex: ["A", "B", "C", "D"].indexOf(q.correctAnswer),
      explanation: q.explanation ?? "",
    })),
  });
}
