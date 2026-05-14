import { NextRequest, NextResponse } from "next/server";
import { getExamLeaderboard } from "@/lib/quiz";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const examId = Number(id);
  if (!Number.isFinite(examId) || examId <= 0) {
    return NextResponse.json({ error: "Invalid exam id." }, { status: 400 });
  }
  const rangeParam = req.nextUrl.searchParams.get("range");
  const range = rangeParam === "daily" || rangeParam === "weekly" ? rangeParam : "overall";

  const rows = await getExamLeaderboard(examId, range);
  return NextResponse.json({ leaderboard: rows });
}
