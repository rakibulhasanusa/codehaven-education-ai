export type GatewayResponseShape = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
      json?: unknown;
    }>;
  }>;
  content?: Array<{
    type?: string;
    text?: string;
    json?: unknown;
  }>;
};

export function extractStructuredPayload(json: GatewayResponseShape): unknown | null {
  if (json.output_text?.trim()) {
    try {
      return JSON.parse(json.output_text);
    } catch {
      // Fall through to alternative shapes.
    }
  }

  const outputContent = json.output?.flatMap((item) => item.content ?? []) ?? [];
  for (const part of outputContent) {
    if (part.type === "output_json" && part.json) {
      return part.json;
    }
    if (part.type === "output_text" && part.text?.trim()) {
      try {
        return JSON.parse(part.text);
      } catch {
        // Continue searching for parseable JSON text.
      }
    }
  }

  for (const part of json.content ?? []) {
    if (part.type === "output_json" && part.json) {
      return part.json;
    }
    if (part.text?.trim()) {
      try {
        return JSON.parse(part.text);
      } catch {
        // Continue.
      }
    }
  }

  return null;
}
