import { generateObject } from "ai";
import { z } from "zod";
import { aiOpenAI, resolveGatewayModel } from "@/lib/ai/provider";

const mcqSchema = z.object({
  question: z.string().min(10),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(3),
  difficulty: z.enum(["Basic", "Medium", "Hard"]),
  topic: z.string().min(2),
});

const examMcqItemSchema = mcqSchema.extend({
  subject: z.string().min(2),
  language: z.enum(["English", "Bengali"]),
});

const aiReviewSchema = z.object({
  summary: z.string().min(10),
  strengths: z.array(z.string().min(3)).min(2).max(5),
  weakTopics: z.array(z.string().min(2)).min(1).max(6),
  improvements: z.array(z.string().min(3)).min(3).max(6),
  estimatedPreparationLevel: z.enum(["Beginner", "Intermediate", "Advanced", "Exam-Ready"]),
});

type ExistingQuestion = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  difficulty: string | null;
  topic: string | null;
};

export async function generateUniqueMcq(input: {
  subjectName: string;
  existing: ExistingQuestion[];
  similarityThreshold: number;
  maxRetries: number;
}) {
  const model = resolveGatewayModel(process.env.OPENAI_GENERATION_MODEL || "gpt-4o-mini");
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  const jaccard = (a: string, b: string) => {
    const aSet = new Set(normalize(a).split(" ").filter(Boolean));
    const bSet = new Set(normalize(b).split(" ").filter(Boolean));
    if (aSet.size === 0 && bSet.size === 0) return 1;
    let intersection = 0;
    for (const item of aSet) {
      if (bSet.has(item)) intersection += 1;
    }
    const union = new Set([...aSet, ...bSet]).size;
    return union === 0 ? 0 : intersection / union;
  };

  for (let attempt = 1; attempt <= input.maxRetries; attempt += 1) {
    const { object } = await generateObject({
      model: aiOpenAI(model),
      schema: mcqSchema,
      prompt: [
        `Generate ONE fresh MCQ for subject: ${input.subjectName}`,
        "Follow the same exam pattern, style and average difficulty as the examples.",
        "Do not repeat any exact previous question.",
        "Examples:",
        ...input.existing.slice(0, 25).map((q, i) =>
          `${i + 1}. ${q.question}\nA) ${q.optionA}\nB) ${q.optionB}\nC) ${q.optionC}\nD) ${q.optionD}\nAnswer:${q.correctAnswer}\nDifficulty:${q.difficulty ?? "N/A"}\nTopic:${q.topic ?? "N/A"}`
        ),
      ].join("\n\n"),
    });
    const generatedText = `${object.question} ${object.optionA} ${object.optionB} ${object.optionC} ${object.optionD}`;
    const topScore = input.existing.reduce((max, item) => {
      const existingText = `${item.question} ${item.optionA} ${item.optionB} ${item.optionC} ${item.optionD}`;
      const score = jaccard(generatedText, existingText);
      return score > max ? score : max;
    }, 0);

    if (topScore < input.similarityThreshold) {
      return {
        mcq: object,
        similarityScore: topScore,
      };
    }
  }

  throw new Error("Could not generate a sufficiently unique MCQ after retries.");
}

export async function generateExamMcqs(input: {
  subjects: string[];
  language: "English" | "Bengali";
  referenceContext: ExistingQuestion[];
  questionCount: number;
  referenceYearFrom?: number;
  referenceYearTo?: number;
}) {
  const model = resolveGatewayModel(process.env.OPENAI_GENERATION_MODEL || "gpt-4o-mini");
  const contextRows = input.referenceContext.slice(0, 32);

  const yearHint = input.referenceYearFrom || input.referenceYearTo
    ? `Reference exam years: ${input.referenceYearFrom ?? "N/A"} to ${input.referenceYearTo ?? "N/A"}.`
    : "No specific year range supplied.";

  const prompt = [
    `Generate exactly ${input.questionCount} realistic BCS/job-style MCQs in ${input.language}.`,
    `Subjects (must stay within these only): ${input.subjects.join(", ")}.`,
    yearHint,
    "Use historical exam patterns, wording style, option structure, and conceptual style.",
    "Produce fresh questions with controlled creativity. Do not copy references verbatim.",
    "Keep authenticity high, avoid hallucinated facts and unrealistic framing.",
    "Every question must include: subject, question, optionA-D, correctAnswer, explanation, difficulty, topic, language.",
    "Difficulty should be one of: Basic, Medium, Hard.",
    "Correct answer must be one of A/B/C/D and explanation must justify it clearly.",
    "Reference patterns only (do not copy):",
    ...contextRows.map((q, i) => `${i + 1}. ${q.question}\nA) ${q.optionA}\nB) ${q.optionB}\nC) ${q.optionC}\nD) ${q.optionD}\nAnswer: ${q.correctAnswer}\nTopic: ${q.topic ?? "N/A"}\nDifficulty: ${q.difficulty ?? "N/A"}`),
  ].join("\n\n");

  const examMcqSchema = z.object({
    questions: z.array(examMcqItemSchema).length(input.questionCount),
  });

  const { object } = await generateObject({
    model: aiOpenAI(model),
    schema: examMcqSchema,
    prompt,
  });

  return object.questions;
}

export async function generateAiReview(input: {
  language: "English" | "Bengali";
  subjects: string[];
  score: { correct: number; wrong: number; unanswered: number; accuracyPercent: number };
  weakTopics: string[];
}) {
  const model = resolveGatewayModel(process.env.OPENAI_REVIEW_MODEL || process.env.OPENAI_GENERATION_MODEL || "gpt-4o-mini");
  const prompt = [
    `Create an exam performance review in ${input.language}.`,
    `Subjects: ${input.subjects.join(", ")}.`,
    `Score: correct=${input.score.correct}, wrong=${input.score.wrong}, unanswered=${input.score.unanswered}, accuracy=${input.score.accuracyPercent}%.`,
    `Weak topics detected: ${input.weakTopics.join(", ") || "None explicit"}.`,
    "Give practical and exam-focused feedback for BCS/job preparation.",
    "Keep it concise, constructive, and realistic.",
  ].join("\n");

  const { object } = await generateObject({
    model: aiOpenAI(model),
    schema: aiReviewSchema,
    prompt,
  });

  return object;
}
