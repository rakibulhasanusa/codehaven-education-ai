import { NextResponse } from "next/server";
import { getExamMeta } from "@/lib/quiz";

export async function GET() {
  const exams = await getExamMeta();
  return NextResponse.json({ exams });
}
