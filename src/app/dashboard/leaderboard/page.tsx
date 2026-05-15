import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { quizAttempts, quizExams } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth/server";
import UserLeaderboardClient from "./UserLeaderboardClient";

export const dynamic = "force-dynamic";

type ExamOption = { id: number; title: string };

type AttemptRow = {
  learnerName: string;
  score: number;
  accuracyPercent: number;
  timeTakenSeconds: number;
};

function rankRows(rows: AttemptRow[]) {
  const bestByLearner = new Map<string, AttemptRow>();
  for (const row of rows) {
    const prev = bestByLearner.get(row.learnerName);
    if (!prev) {
      bestByLearner.set(row.learnerName, row);
      continue;
    }
    const better =
      row.score > prev.score ||
      (row.score === prev.score && row.accuracyPercent > prev.accuracyPercent) ||
      (row.score === prev.score &&
        row.accuracyPercent === prev.accuracyPercent &&
        row.timeTakenSeconds < prev.timeTakenSeconds);
    if (better) bestByLearner.set(row.learnerName, row);
  }

  return Array.from(bestByLearner.values())
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.accuracyPercent - a.accuracyPercent ||
        a.timeTakenSeconds - b.timeTakenSeconds,
    )
    .map((row, idx) => ({ rank: idx + 1, ...row }));
}

export default async function DashboardLeaderboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ examId?: string }>;
}) {
  const auth = await getAuthUser();
  if (!auth) redirect("/login");

  const params = (await searchParams) ?? {};
  const examsRaw = await db()
    .select({ id: quizExams.id, title: quizExams.title, createdAt: quizExams.createdAt })
    .from(quizExams)
    .where(eq(quizExams.isPublished, 1))
    .orderBy(desc(quizExams.createdAt))
    .limit(200);

  const examOptions: ExamOption[] = examsRaw.map((e) => ({ id: e.id, title: e.title }));
  const requestedExamId = Number(params.examId ?? 0);
  const defaultExamId = examOptions[0]?.id ?? null; // most recent first
  const selectedExamId =
    Number.isInteger(requestedExamId) && examOptions.some((e) => e.id === requestedExamId)
      ? requestedExamId
      : defaultExamId;

  const attempts = selectedExamId
    ? await db()
        .select({
          learnerName: quizAttempts.learnerName,
          score: quizAttempts.score,
          accuracyPercent: quizAttempts.accuracyPercent,
          timeTakenSeconds: quizAttempts.timeTakenSeconds,
        })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.examId, selectedExamId), eq(quizAttempts.status, "submitted")))
        .orderBy(desc(quizAttempts.score), desc(quizAttempts.accuracyPercent))
        .limit(5000)
    : [];

  const ranked = rankRows(attempts as AttemptRow[]);
  const myEntry = ranked.find((r) => r.learnerName === auth.name) ?? null;
  const myRank = myEntry?.rank ?? null;

  return (
    <UserLeaderboardClient
      examOptions={examOptions}
      selectedExamId={selectedExamId}
      rows={ranked}
      myRank={myRank}
      currentUserName={auth.name}
    />
  );
}
