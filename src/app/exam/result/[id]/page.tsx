import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizAttemptAnswers, quizAttempts, quizExamQuestions, quizExams } from "@/lib/db/schema";

export default async function ExamResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [attempt] = await db().select().from(quizAttempts).where(eq(quizAttempts.id, id)).limit(1);
  if (!attempt) return <main className="p-8">Result not found.</main>;

  const [exam] = await db().select().from(quizExams).where(eq(quizExams.id, attempt.examId)).limit(1);
  const answers = await db()
    .select({
      selectedAnswer: quizAttemptAnswers.selectedAnswer,
      question: quizExamQuestions.question,
      correctAnswer: quizExamQuestions.correctAnswer,
      explanation: quizExamQuestions.explanation,
    })
    .from(quizAttemptAnswers)
    .innerJoin(quizExamQuestions, eq(quizAttemptAnswers.examQuestionId, quizExamQuestions.id))
    .where(eq(quizAttemptAnswers.attemptId, id));

  const total = attempt.totalQuestions;

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-4">
      <div className="premium-panel rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">{exam?.title} Result</h1>
        <p className="mt-2 text-sm">Total: {total} | Correct: {attempt.correct} | Wrong: {attempt.wrong} | Skipped: {attempt.skipped}</p>
        <p className="text-sm">Score: {attempt.score} | Accuracy: {attempt.accuracyPercent}% | Rank: {attempt.rank ?? "-"} | Time: {Math.round(attempt.timeTakenSeconds / 60)} min</p>
        <div className="mt-3 text-sm">
          <p><strong>Strong topics:</strong> {JSON.parse(attempt.aiStrongTopics || "[]").join(", ") || "-"}</p>
          <p><strong>Weak topics:</strong> {JSON.parse(attempt.aiWeakTopics || "[]").join(", ") || "-"}</p>
          <p><strong>Repeated mistakes:</strong> {JSON.parse(attempt.aiRepeatedMistakes || "[]").join(", ") || "-"}</p>
          <p><strong>Suggestions:</strong> {JSON.parse(attempt.aiSuggestions || "[]").join(" ") || "-"}</p>
        </div>
        <Link className="inline-block mt-4 underline" href={`/exam/leaderboard/${attempt.examId}`}>View leaderboard</Link>
      </div>

      <div className="premium-panel rounded-2xl p-6">
        <h2 className="text-xl font-semibold">Detailed Review</h2>
        <div className="mt-4 space-y-3">
          {answers.map((a, i) => {
            const isSkipped = !a.selectedAnswer;
            const isCorrect = !isSkipped && a.selectedAnswer === a.correctAnswer;
            return (
              <div key={i} className="border rounded-lg p-3 text-sm">
                <p className="font-medium">{i + 1}. {a.question}</p>
                <p>User answer: {a.selectedAnswer || "Skipped"}</p>
                <p>Correct answer: {a.correctAnswer}</p>
                <p>
                  Status:{" "}
                  <span className={isSkipped ? "text-amber-700" : isCorrect ? "text-green-700" : "text-red-700"}>
                    {isSkipped ? "Skipped" : isCorrect ? "Correct" : "Wrong"}
                  </span>
                </p>
                <p>Explanation: {a.explanation || "-"}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
