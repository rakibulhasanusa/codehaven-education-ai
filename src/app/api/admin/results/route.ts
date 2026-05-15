import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttempts, quizExams } from "@/lib/db/schema";

export async function GET() {
  const rows = await db()
    .select({
      id: quizAttempts.id,
      learnerName: quizAttempts.learnerName,
      score: quizAttempts.score,
      accuracyPercent: quizAttempts.accuracyPercent,
      timeTakenSeconds: quizAttempts.timeTakenSeconds,
      status: quizAttempts.status,
      createdAt: quizAttempts.createdAt,
      examTitle: quizExams.title,
    })
    .from(quizAttempts)
    .innerJoin(quizExams, eq(quizAttempts.examId, quizExams.id))
    .orderBy(desc(quizAttempts.createdAt))
    .limit(500);

  return NextResponse.json({ results: rows });
}
