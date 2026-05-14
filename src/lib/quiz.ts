import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions, quizExams, subjects } from "@/lib/db/schema";

export function normalizeAnswer(v: string | null | undefined) {
  if (!v) return null;
  const n = v.toUpperCase();
  return ["A", "B", "C", "D"].includes(n) ? n : null;
}

export async function computeAttemptRank(attemptId: string) {
  const [attempt] = await db().select().from(quizAttempts).where(eq(quizAttempts.id, attemptId)).limit(1);
  if (!attempt) return null;

  const better = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.examId, attempt.examId),
        eq(quizAttempts.status, "submitted"),
        sql`(
          ${quizAttempts.score} > ${attempt.score}
          OR (${quizAttempts.score} = ${attempt.score} AND ${quizAttempts.accuracyPercent} > ${attempt.accuracyPercent})
          OR (${quizAttempts.score} = ${attempt.score} AND ${quizAttempts.accuracyPercent} = ${attempt.accuracyPercent} AND ${quizAttempts.timeTakenSeconds} < ${attempt.timeTakenSeconds})
        )`
      )
    );

  const rank = (better[0]?.count ?? 0) + 1;
  await db().update(quizAttempts).set({ rank }).where(eq(quizAttempts.id, attemptId));
  return rank;
}

export async function getExamLeaderboard(examId: number, range: "daily" | "weekly" | "overall") {
  const now = new Date();
  const from =
    range === "daily"
      ? new Date(now.getTime() - 24 * 3600 * 1000)
      : range === "weekly"
      ? new Date(now.getTime() - 7 * 24 * 3600 * 1000)
      : null;

  const rows = await db()
    .select({
      id: quizAttempts.id,
      learnerName: quizAttempts.learnerName,
      score: quizAttempts.score,
      accuracyPercent: quizAttempts.accuracyPercent,
      timeTakenSeconds: quizAttempts.timeTakenSeconds,
      submittedAt: quizAttempts.submittedAt,
    })
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.examId, examId),
        eq(quizAttempts.status, "submitted"),
        from ? gte(quizAttempts.submittedAt, from) : undefined
      )
    )
    .orderBy(desc(quizAttempts.score), desc(quizAttempts.accuracyPercent), asc(quizAttempts.timeTakenSeconds))
    .limit(100);

  return rows.map((row, idx) => ({
    rank: idx + 1,
    id: row.id,
    name: row.learnerName,
    score: row.score,
    accuracy: row.accuracyPercent,
    speed: row.timeTakenSeconds > 0 ? Number((row.score / (row.timeTakenSeconds / 60)).toFixed(2)) : 0,
    timeTakenSeconds: row.timeTakenSeconds,
    submittedAt: row.submittedAt,
  }));
}

export function shuffleArray<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildOptionShuffle(question: {
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
}) {
  const original = [
    { key: "A", text: question.optionA },
    { key: "B", text: question.optionB },
    { key: "C", text: question.optionC },
    { key: "D", text: question.optionD },
  ];
  const shuffled = shuffleArray(original);
  const correct = shuffled.find((x) => x.key === question.correctAnswer)?.key ?? question.correctAnswer;
  return {
    options: shuffled.map((x) => x.text),
    optionKeys: shuffled.map((x) => x.key),
    correct,
  };
}

export function aiInsightsByTopic(input: Array<{ topic: string | null; isCorrect: boolean }>) {
  const topicMap = new Map<string, { total: number; correct: number; wrong: number }>();

  for (const row of input) {
    const t = row.topic?.trim() || "General";
    const prev = topicMap.get(t) ?? { total: 0, correct: 0, wrong: 0 };
    prev.total += 1;
    if (row.isCorrect) prev.correct += 1;
    else prev.wrong += 1;
    topicMap.set(t, prev);
  }

  const entries = [...topicMap.entries()];
  const strong = entries.filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.7).map(([k]) => k).slice(0, 5);
  const weak = entries.filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5).map(([k]) => k).slice(0, 5);
  const repeatedMistakes = entries.filter(([, v]) => v.wrong >= 2).map(([k]) => k).slice(0, 5);

  const suggestions = [
    ...(weak.length ? [`Focus revision on: ${weak.join(", ")}.`] : []),
    ...(repeatedMistakes.length ? [`Practice repeated-mistake topics with 20 timed MCQs each: ${repeatedMistakes.join(", ")}.`] : []),
    "Review explanations for every wrong answer before attempting again.",
  ];

  return { strong, weak, repeatedMistakes, suggestions };
}

export async function getExamMeta() {
  try {
    return await db()
      .select({
        id: quizExams.id,
        title: quizExams.title,
        description: quizExams.description,
        instructions: quizExams.instructions,
        startTime: quizExams.startTime,
        endTime: quizExams.endTime,
        durationMinutes: quizExams.durationMinutes,
        timingMode: quizExams.timingMode,
        negativeMarking: quizExams.negativeMarking,
        subjectName: subjects.name,
        topic: quizExams.topic,
        createdAt: quizExams.createdAt,
      })
      .from(quizExams)
      .innerJoin(subjects, eq(quizExams.subjectId, subjects.id))
      .orderBy(desc(quizExams.createdAt));
  } catch {
    return [];
  }
}
