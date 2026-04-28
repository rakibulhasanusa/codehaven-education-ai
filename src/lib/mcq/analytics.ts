import type { AttemptRecord, MCQQuestion, QuestionLanguage, Subject, SubjectStat } from "./types";
import { BCS_SUBJECTS } from "./constants";

type BuildReviewInput = {
  questions: MCQQuestion[];
  answers: Array<number | null>;
  timeSpent: number[];
};

export function calculateScore(
  questions: MCQQuestion[],
  answers: Array<number | null>
): {
  correct: number;
  wrong: number;
  unanswered: number;
  accuracyPercent: number;
} {
  let correct = 0;
  let unanswered = 0;

  questions.forEach((q, index) => {
    const answer = answers[index];
    if (answer === null) {
      unanswered += 1;
      return;
    }
    if (answer === q.correctIndex) {
      correct += 1;
    }
  });

  const wrong = questions.length - correct - unanswered;
  const accuracyPercent = questions.length
    ? Math.round((correct / questions.length) * 100)
    : 0;

  return { correct, wrong, unanswered, accuracyPercent };
}

export function calculateSubjectStats(
  questions: MCQQuestion[],
  answers: Array<number | null>
): Record<Subject, SubjectStat> {
  const subjects: Subject[] = BCS_SUBJECTS;
  const result = Object.fromEntries(
    subjects.map((subject) => [subject, { total: 0, correct: 0, accuracy: 0 }])
  ) as Record<Subject, SubjectStat>;

  questions.forEach((q, index) => {
    result[q.subject].total += 1;
    if (answers[index] === q.correctIndex) {
      result[q.subject].correct += 1;
    }
  });

  subjects.forEach((subject) => {
    const stat = result[subject];
    stat.accuracy = stat.total ? Math.round((stat.correct / stat.total) * 100) : 0;
  });

  return result;
}

export function buildSmartReview({
  questions,
  answers,
  timeSpent,
}: BuildReviewInput): { summary: string; strengths: string[]; improvements: string[]; nextPlan: string[] } {
  const { correct, accuracyPercent } = calculateScore(questions, answers);
  const subjectStats = calculateSubjectStats(questions, answers);
  const avgTime = questions.length
    ? Math.round(timeSpent.reduce((sum, t) => sum + t, 0) / questions.length)
    : 0;

  const strengths: string[] = [];
  const improvements: string[] = [];

  (Object.keys(subjectStats) as Subject[]).forEach((subject) => {
    const stat = subjectStats[subject];
    if (stat.total === 0) {
      return;
    }
    if (stat.accuracy >= 75) {
      strengths.push(`${subject}: strong performance (${stat.accuracy}% correct).`);
    }
    if (stat.accuracy < 60) {
      improvements.push(`${subject}: revise core concepts and solve 10 extra MCQs daily.`);
    }
  });

  if (!strengths.length) {
    strengths.push("You stayed consistent and completed the test. That discipline matters.");
  }

  if (!improvements.length) {
    improvements.push("Focus on speed-accuracy balance to push your score even higher.");
  }

  const summary =
    accuracyPercent >= 85
      ? `Excellent work. You got ${correct}/${questions.length} correct.`
      : accuracyPercent >= 60
      ? `Good progress. You got ${correct}/${questions.length} correct with room to improve.`
      : `Solid effort. You got ${correct}/${questions.length} correct. Keep practicing, you are building momentum.`;

  const nextPlan = [
    `Average response time: ${avgTime} seconds/question. Aim to stay under 45 seconds with equal accuracy.`,
    "Review every wrong answer explanation once today and again tomorrow.",
    "Take another mixed-subject test in 24 hours to measure improvement.",
  ];

  return { summary, strengths, improvements, nextPlan };
}

export function buildAttemptRecord(input: {
  learnerName: string;
  language: QuestionLanguage;
  subjects: Subject[];
  questionCount: number;
  score: number;
  accuracyPercent: number;
  avgTimePerQuestion: number;
}): AttemptRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    learnerName: input.learnerName.trim() || "Learner",
    language: input.language,
    subjects: input.subjects,
    questionCount: input.questionCount,
    score: input.score,
    accuracyPercent: input.accuracyPercent,
    avgTimePerQuestion: input.avgTimePerQuestion,
  };
}
