import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { examAttempts, examQuestions } from "@/lib/db/schema";
import type { Difficulty, QuestionLanguage, Subject } from "@/lib/mcq/types";

type AttemptPayload = {
  learnerName: string;
  language: QuestionLanguage;
  subjects: Subject[];
  questionCount: number;
  score: number;
  accuracyPercent: number;
  avgTimePerQuestion: number;
  questions: Array<{
    subject: Subject;
    language: QuestionLanguage;
    difficulty: Difficulty;
    syllabusPart?: number;
    topic: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const learnerName = searchParams.get("learnerName");

    if (learnerName) {
      const rows = await db()
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.learnerName, learnerName))
        .orderBy(desc(examAttempts.createdAt))
        .limit(20);
      return NextResponse.json(rows);
    }

    const rows = await db().select().from(examAttempts).orderBy(desc(examAttempts.createdAt)).limit(30);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch attempts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AttemptPayload;
    if (!body.learnerName?.trim()) {
      return NextResponse.json({ error: "Learner name is required" }, { status: 400 });
    }
    if (!Array.isArray(body.subjects) || body.subjects.length === 0) {
      return NextResponse.json({ error: "At least one subject is required" }, { status: 400 });
    }
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json({ error: "Questions are required" }, { status: 400 });
    }

    const database = db();
    const created = await database.transaction(async (tx) => {
      const [attempt] = await tx
        .insert(examAttempts)
        .values({
          learnerName: body.learnerName.trim(),
          language: body.language,
          subjects: body.subjects,
          questionCount: body.questionCount,
          score: body.score,
          accuracyPercent: body.accuracyPercent,
          avgTimePerQuestion: body.avgTimePerQuestion,
        })
        .returning();

      await tx.insert(examQuestions).values(
        body.questions.map((q) => ({
          attemptId: attempt.id,
          subject: q.subject,
          language: q.language,
          difficulty: q.difficulty,
          syllabusPart: q.syllabusPart,
          topic: q.topic,
          question: q.question,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        }))
      );

      return attempt;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save attempt", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
