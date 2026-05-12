import { embed } from "ai";
import { openai } from "@ai-sdk/openai";

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const result = await embed({ model: openai.embedding(model), value: text });
  return result.embedding;
}

export function buildEmbeddingText(input: {
  subject: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}) {
  return [
    `Subject: ${input.subject}`,
    `Question: ${input.question}`,
    `A) ${input.optionA}`,
    `B) ${input.optionB}`,
    `C) ${input.optionC}`,
    `D) ${input.optionD}`,
  ].join("\n");
}
