import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions, quizExams } from "@/lib/db/schema";
import ResultGraphsClient from "./ResultGraphsClient";

// ── tiny helpers ──────────────────────────────────────────────────────────────
function parseList(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw || "[]"); } catch { return []; }
}

function gradeLabel(pct: number) {
  if (pct >= 90) return { label: "Outstanding", color: "oklch(0.35 0.13 168)" };
  if (pct >= 75) return { label: "Excellent",   color: "oklch(0.42 0.17 250)" };
  if (pct >= 60) return { label: "Good",        color: "oklch(0.42 0.14 75)"  };
  if (pct >= 40) return { label: "Average",     color: "oklch(0.48 0.16 40)"  };
  return              { label: "Needs Work",    color: "oklch(0.45 0.22 27)"  };
}

// ── stat chip ─────────────────────────────────────────────────────────────────
function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="premium-stat flex flex-col items-center gap-0.5 text-center">
      <span className="text-xl font-black tabular-nums" style={{ color: accent ?? "var(--foreground)" }}>
        {value}
      </span>
      <span className="text-[0.67rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

// ── tag pill ──────────────────────────────────────────────────────────────────
function Tag({ text, variant }: { text: string; variant: "green" | "red" | "amber" }) {
  const styles = {
    green: { bg: "oklch(0.67 0.13 165/0.1)", color: "oklch(0.35 0.13 168)", border: "oklch(0.67 0.13 165/0.3)" },
    red:   { bg: "oklch(0.577 0.245 27/0.1)", color: "oklch(0.45 0.22 27)",  border: "oklch(0.577 0.245 27/0.3)" },
    amber: { bg: "oklch(0.72 0.15 78/0.1)",   color: "oklch(0.42 0.14 75)",  border: "oklch(0.72 0.15 78/0.3)"  },
  }[variant];
  return (
    <span className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold"
      style={{ background: styles.bg, color: styles.color, border: `1px solid ${styles.border}` }}>
      {text}
    </span>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default async function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [attempt] = await db()
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.id, id))
    .limit(1);

  if (!attempt) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="premium-panel rounded-2xl p-10 text-center">
          <p className="text-2xl font-black text-muted-foreground">Result not found.</p>
          <Link href="/" className="mt-4 inline-block text-sm underline">Go home</Link>
        </div>
      </main>
    );
  }

  const [exam] = await db()
    .select()
    .from(quizExams)
    .where(eq(quizExams.id, attempt.examId))
    .limit(1);

  const answers = await db()
    .select({
      selectedAnswer: quizAttemptAnswers.selectedAnswer,
      question:       quizExamQuestions.question,
      correctAnswer:  quizExamQuestions.correctAnswer,
      explanation:    quizExamQuestions.explanation,
    })
    .from(quizAttemptAnswers)
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(eq(quizAttemptAnswers.attemptId, id));

  const accuracy   = Number(attempt.accuracyPercent) || 0;
  const grade      = gradeLabel(accuracy);
  const timeMins   = Math.round((attempt.timeTakenSeconds || 0) / 60);
  const strongTopics    = parseList(attempt.aiStrongTopics);
  const weakTopics      = parseList(attempt.aiWeakTopics);
  const repeatedMistakes= parseList(attempt.aiRepeatedMistakes);
  const suggestions     = parseList(attempt.aiSuggestions);

  const correctCount  = attempt.correct   ?? 0;
  const wrongCount    = attempt.wrong     ?? 0;
  const skippedCount  = attempt.skipped   ?? 0;
  const totalCount    = attempt.totalQuestions ?? answers.length;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">

      {/* ── Hero card ─────────────────────────────────────────────────── */}
      <div className="premium-panel overflow-hidden rounded-2xl">
        {/* accent stripe */}
        <div className="h-1.5 w-full"
          style={{ background: "linear-gradient(90deg,oklch(0.49 0.17 250),oklch(0.67 0.13 165),oklch(0.72 0.15 78))" }} />

        <div className="p-6">
          {/* title row */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="premium-kicker mb-1">Exam Result</p>
              <h1 className="premium-title text-2xl font-extrabold tracking-tight sm:text-3xl">
                {exam?.title ?? "Result"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                Candidate: <strong>{attempt.learnerName}</strong>
                {attempt.rank != null && (
                  <> · Rank <strong>#{attempt.rank}</strong></>
                )}
                {timeMins > 0 && <> · {timeMins} min taken</>}
              </p>
            </div>

            <ResultGraphsClient
              accuracy={accuracy}
              gradeColor={grade.color}
              gradeLabel={grade.label}
              correctCount={correctCount}
              wrongCount={wrongCount}
              skippedCount={skippedCount}
              totalCount={totalCount}
            />
          </div>

          {/* stats row */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Score"   value={String(attempt.score ?? "-")} />
            <Stat label="Correct" value={correctCount}  accent="oklch(0.35 0.13 168)" />
            <Stat label="Wrong"   value={wrongCount}    accent="oklch(0.45 0.22 27)"  />
            <Stat label="Skipped" value={skippedCount}  accent="oklch(0.42 0.14 75)"  />
          </div>

          {/* mini progress bar */}
          <div className="mt-4 flex h-2 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
            <div style={{ width: `${(correctCount / totalCount) * 100}%`, background: "oklch(0.55 0.13 165)" }} />
            <div style={{ width: `${(wrongCount   / totalCount) * 100}%`, background: "oklch(0.52 0.22 27)"  }} />
            <div style={{ width: `${(skippedCount / totalCount) * 100}%`, background: "oklch(0.62 0.14 78)"  }} />
          </div>
          <div className="mt-1.5 flex flex-wrap gap-3 text-[0.67rem] text-muted-foreground">
            {[
              { color: "oklch(0.55 0.13 165)", label: "Correct" },
              { color: "oklch(0.52 0.22 27)",  label: "Wrong"   },
              { color: "oklch(0.62 0.14 78)",  label: "Skipped" },
            ].map(({ color, label }, index) => (
              <span key={`${label}-${index}`} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>

          {/* leaderboard link */}
          <div className="mt-5 flex items-center justify-between">
            <Link
              href={`/exam/leaderboard/${attempt.examId}`}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: "linear-gradient(135deg,oklch(0.49 0.17 250/0.1),oklch(0.49 0.17 250/0.05))",
                border: "1px solid oklch(0.49 0.17 250/0.25)",
                color: "oklch(0.42 0.18 252)",
              }}
            >
              🏆 View Leaderboard →
            </Link>
          </div>
        </div>
      </div>

      {/* ── AI Insights card ──────────────────────────────────────────── */}
      {(strongTopics.length > 0 || weakTopics.length > 0 || suggestions.length > 0 || repeatedMistakes.length > 0) && (
        <div className="premium-panel rounded-2xl p-6">
          <p className="premium-kicker mb-1">AI Insights</p>
          <h2 className="mb-4 text-lg font-bold">Personalised Analysis</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* strong topics */}
            {strongTopics.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: "oklch(0.67 0.13 165/0.06)", border: "1px solid oklch(0.67 0.13 165/0.2)" }}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.35 0.13 168)" }}>
                  💪 Strong Topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {strongTopics.map((t) => <Tag key={t} text={t} variant="green" />)}
                </div>
              </div>
            )}

            {/* weak topics */}
            {weakTopics.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: "oklch(0.577 0.245 27/0.05)", border: "1px solid oklch(0.577 0.245 27/0.18)" }}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.45 0.22 27)" }}>
                  📌 Weak Topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {weakTopics.map((t) => <Tag key={t} text={t} variant="red" />)}
                </div>
              </div>
            )}

            {/* repeated mistakes */}
            {repeatedMistakes.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: "oklch(0.72 0.15 78/0.07)", border: "1px solid oklch(0.72 0.15 78/0.2)" }}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.42 0.14 75)" }}>
                  🔁 Repeated Mistakes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {repeatedMistakes.map((t) => <Tag key={t} text={t} variant="amber" />)}
                </div>
              </div>
            )}

            {/* suggestions */}
            {suggestions.length > 0 && (
              <div className="rounded-xl p-4"
                style={{ background: "oklch(0.49 0.17 250/0.05)", border: "1px solid oklch(0.49 0.17 250/0.15)" }}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: "oklch(0.42 0.18 252)" }}>
                  💡 Suggestions
                </p>
                <ul className="space-y-1.5">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "oklch(0.49 0.17 250/0.5)", marginTop: "6px" }} />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Detailed review ───────────────────────────────────────────── */}
      <div className="premium-panel rounded-2xl overflow-hidden">
        <div className="border-b px-6 py-4" style={{ borderColor: "var(--border)", background: "rgb(255 255 255/0.5)" }}>
          <p className="premium-kicker mb-0.5">Question by Question</p>
          <h2 className="text-lg font-bold">Detailed Review</h2>
        </div>

        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {answers.map((a, i) => {
            const isSkipped = !a.selectedAnswer;
            const isCorrect = !isSkipped && a.selectedAnswer === a.correctAnswer;
            const isWrong   = !isSkipped && !isCorrect;

            const statusConfig = isSkipped
              ? { label: "Skipped", bg: "oklch(0.72 0.15 78/0.08)", border: "oklch(0.72 0.15 78/0.22)", color: "oklch(0.42 0.14 75)", icon: "–", iconBg: "oklch(0.72 0.15 78/0.15)" }
              : isCorrect
                ? { label: "Correct", bg: "oklch(0.67 0.13 165/0.06)", border: "oklch(0.67 0.13 165/0.2)", color: "oklch(0.35 0.13 168)", icon: "✓", iconBg: "oklch(0.67 0.13 165/0.15)" }
                : { label: "Wrong",   bg: "oklch(0.577 0.245 27/0.05)", border: "oklch(0.577 0.245 27/0.18)", color: "oklch(0.45 0.22 27)", icon: "✗", iconBg: "oklch(0.577 0.245 27/0.12)" };

            return (
              <div key={i} className="px-5 py-4"
                style={{ background: statusConfig.bg }}>
                <div className="flex items-start gap-3">
                  {/* status icon */}
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black"
                    style={{ background: statusConfig.iconBg, color: statusConfig.color }}>
                    {statusConfig.icon}
                  </span>

                  <div className="min-w-0 flex-1 space-y-2">
                    {/* question */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-6">
                        <span className="mr-1.5 text-muted-foreground">Q{i + 1}.</span>
                        {a.question}
                      </p>
                      <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.67rem] font-bold"
                        style={{
                          background: statusConfig.iconBg,
                          color: statusConfig.color,
                          border: `1px solid ${statusConfig.border}`,
                        }}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* answer row */}
                    <div className="grid gap-1.5 text-xs sm:grid-cols-2">
                      <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{
                          background: isCorrect ? "oklch(0.67 0.13 165/0.08)" : isWrong ? "oklch(0.577 0.245 27/0.08)" : "var(--muted)",
                          border: `1px solid ${isCorrect ? "oklch(0.67 0.13 165/0.25)" : isWrong ? "oklch(0.577 0.245 27/0.22)" : "var(--border)"}`,
                        }}>
                        <span className="font-semibold text-muted-foreground">Your answer:</span>
                        <span className="font-bold" style={{ color: isCorrect ? "oklch(0.35 0.13 168)" : isWrong ? "oklch(0.45 0.22 27)" : "var(--muted-foreground)" }}>
                          {a.selectedAnswer || "—"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg px-3 py-2"
                        style={{ background: "oklch(0.67 0.13 165/0.08)", border: "1px solid oklch(0.67 0.13 165/0.25)" }}>
                        <span className="font-semibold text-muted-foreground">Correct:</span>
                        <span className="font-bold" style={{ color: "oklch(0.35 0.13 168)" }}>
                          {a.correctAnswer}
                        </span>
                      </div>
                    </div>

                    {/* explanation */}
                    {a.explanation && (
                      <div className="rounded-lg px-3 py-2 text-xs leading-5 text-muted-foreground"
                        style={{ background: "rgb(255 255 255/0.6)", border: "1px solid var(--border)" }}>
                        <span className="premium-kicker mr-1.5 text-[0.6rem]">Explanation</span>
                        {a.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer CTA ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-3 py-2">
        <Link href={`/exam/leaderboard/${attempt.examId}`}
          className="rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:opacity-80"
          style={{
            background: "linear-gradient(135deg,oklch(0.49 0.17 250),oklch(0.42 0.18 252))",
            color: "white",
          }}>
          🏆 Leaderboard
        </Link>
        <Link href="/exam"
          className="rounded-xl px-5 py-2.5 text-sm font-bold"
          style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
          ← Back to Exams
        </Link>
      </div>

    </main>
  );
}
