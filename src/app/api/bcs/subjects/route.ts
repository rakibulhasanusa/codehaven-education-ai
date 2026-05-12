import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, subjects } from "@/lib/db/schema";

export async function GET() {
  const rows = await db()
    .select({
      id: subjects.id,
      name: subjects.name,
      slug: subjects.slug,
      questionCount: sql<number>`count(${questions.id})`,
    })
    .from(subjects)
    .leftJoin(questions, eq(questions.subjectId, subjects.id))
    .groupBy(subjects.id)
    .orderBy(asc(subjects.name));

  return NextResponse.json({ subjects: rows.filter((s) => Number(s.questionCount) > 0) });
}
