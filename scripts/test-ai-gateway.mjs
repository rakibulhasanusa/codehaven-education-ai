import dotenv from "dotenv";
import { embed, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env", override: false });

const gatewayKey = process.env.AI_GATEWAY_API_KEY;
const baseURL = process.env.AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh/v1";
const embeddingModelRaw = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const generationModelRaw = process.env.OPENAI_GENERATION_MODEL || "gpt-5.5";

function withOpenAiPrefix(model) {
  return model.startsWith("openai/") ? model : `openai/${model}`;
}

if (!gatewayKey) {
  console.error("FAIL: AI_GATEWAY_API_KEY is missing.");
  process.exit(1);
}

const client = createOpenAI({
  apiKey: gatewayKey,
  baseURL,
});

const embeddingModel = withOpenAiPrefix(embeddingModelRaw);
const generationModel = withOpenAiPrefix(generationModelRaw);

async function run() {
  const startedAt = Date.now();
  console.log("Testing Vercel AI Gateway...");
  console.log(`Base URL: ${baseURL}`);
  console.log(`Embedding Model: ${embeddingModel}`);
  console.log(`Generation Model: ${generationModel}`);

  const embedding = await embed({
    model: client.embedding(embeddingModel),
    value: "AI gateway connectivity test from mcq-ai project",
  });

  const generation = await generateText({
    model: client(generationModel),
    prompt: "Reply with exactly one word: connected",
    maxOutputTokens: 16,
  });

  console.log("PASS: AI Gateway connected.");
  console.log(`Embedding dimensions: ${embedding.embedding.length}`);
  console.log(`Generation response: ${generation.text.trim()}`);
  console.log(`Elapsed: ${Date.now() - startedAt} ms`);
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAIL: ${message}`);
  process.exit(2);
});
