import { createOpenAI } from "@ai-sdk/openai";

const DEFAULT_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

function withOpenAiPrefix(model: string) {
  return model.startsWith("openai/") ? model : `openai/${model}`;
}

export function resolveGatewayModel(model: string) {
  return withOpenAiPrefix(model);
}

const gatewayApiKey = process.env.AI_GATEWAY_API_KEY;
if (!gatewayApiKey) {
  throw new Error("AI_GATEWAY_API_KEY is required. This project is configured for Vercel AI Gateway only.");
}

export const aiOpenAI = createOpenAI({
  apiKey: gatewayApiKey,
  baseURL: process.env.AI_GATEWAY_BASE_URL || DEFAULT_GATEWAY_BASE_URL,
});
