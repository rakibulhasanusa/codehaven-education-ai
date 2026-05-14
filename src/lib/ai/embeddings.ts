import { embed, embedMany } from "ai";
import { aiOpenAI, resolveGatewayModel } from "@/lib/ai/provider";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_TIMEOUT_MS = Number(process.env.OPENAI_EMBEDDING_TIMEOUT_MS || 30000);
const EMBEDDING_MAX_RETRIES = Number(process.env.OPENAI_EMBEDDING_MAX_RETRIES || 5);
const EMBEDDING_RETRY_BASE_MS = Number(process.env.OPENAI_EMBEDDING_RETRY_BASE_MS || 700);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isTransientEmbeddingError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  const transientKeywords = [
    "cannot connect to api",
    "disconnected before secure tls connection",
    "econnreset",
    "etimedout",
    "eai_again",
    "socket hang up",
    "network",
    "timeout",
    "fetch failed",
    "503",
    "502",
    "429",
  ];
  return transientKeywords.some((keyword) => message.includes(keyword));
}

async function withEmbeddingRetries<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= EMBEDDING_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMBEDDING_TIMEOUT_MS);

    try {
      return await operation(controller.signal);
    } catch (error) {
      lastError = error;
      if (!isTransientEmbeddingError(error) || attempt === EMBEDDING_MAX_RETRIES) {
        throw error;
      }

      const jitter = Math.floor(Math.random() * 250);
      const delayMs = EMBEDDING_RETRY_BASE_MS * 2 ** (attempt - 1) + jitter;
      await sleep(delayMs);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const model = resolveGatewayModel(process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL);
  const result = await withEmbeddingRetries((signal) =>
    embed({
      model: aiOpenAI.embedding(model),
      value: text,
      abortSignal: signal,
    })
  );
  return result.embedding;
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const model = resolveGatewayModel(process.env.OPENAI_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL);
  const result = await withEmbeddingRetries((signal) =>
    embedMany({
      model: aiOpenAI.embedding(model),
      values: texts,
      abortSignal: signal,
    })
  );
  return result.embeddings;
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
