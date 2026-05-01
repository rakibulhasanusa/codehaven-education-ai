import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mcqAttemptResults, mcqGenerationRequests } from "@/lib/db/schema";
import type { QuestionLanguage, Subject } from "@/lib/mcq/types";

type SaveAttemptPayload = {
  requestId: number;
  learnerName: string;
  language: QuestionLanguage;
  subjects: Subject[];
  questionCount: number;
  score: number;
  wrong: number;
  unanswered: number;
  accuracyPercent: number;
  avgTimePerQuestion: number;
};

export async function GET() {
  try {
    const rows = await db()
      .select({
        id: mcqAttemptResults.id,
        learnerName: mcqAttemptResults.learnerName,
        createdAt: mcqAttemptResults.submittedAt,
        language: mcqAttemptResults.language,
        subjects: mcqAttemptResults.subjects,
        questionCount: mcqAttemptResults.questionCount,
        score: mcqAttemptResults.score,
        accuracyPercent: mcqAttemptResults.accuracyPercent,
        avgTimePerQuestion: mcqAttemptResults.avgTimePerQuestion,
      })
      .from(mcqAttemptResults)
      .orderBy(desc(mcqAttemptResults.submittedAt))
      .limit(100);

    return NextResponse.json(
      rows.map((row) => ({
        ...row,
        id: String(row.id),
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load attempts", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SaveAttemptPayload;

    if (!body.requestId || !Number.isInteger(body.requestId)) {
      return NextResponse.json({ error: "Valid requestId is required." }, { status: 400 });
    }

    const generationRequest = await db()
      .select({ id: mcqGenerationRequests.id })
      .from(mcqGenerationRequests)
      .where(eq(mcqGenerationRequests.id, body.requestId))
      .limit(1);

    if (!generationRequest.length) {
      return NextResponse.json({ error: "Generation request not found." }, { status: 404 });
    }

    await db().insert(mcqAttemptResults).values({
      requestId: body.requestId,
      learnerName: body.learnerName?.trim() || "Learner",
      language: body.language,
      subjects: body.subjects,
      questionCount: body.questionCount,
      score: body.score,
      wrong: body.wrong,
      unanswered: body.unanswered,
      accuracyPercent: body.accuracyPercent,
      avgTimePerQuestion: body.avgTimePerQuestion,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save attempt", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
