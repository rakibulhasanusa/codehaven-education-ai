import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const mcqSchema = z.object({
  question: z.string().min(10),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(3),
  difficulty: z.string().optional(),
  topic: z.string().optional(),
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
  const model = process.env.OPENAI_GENERATION_MODEL || "gpt-4o-mini";
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
      model: openai(model),
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
