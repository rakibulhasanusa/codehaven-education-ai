import { NextResponse } from "next/server";
import { extractStructuredPayload, type GatewayResponseShape } from "@/lib/ai/response-parser";
import type { QuestionLanguage } from "@/lib/mcq/types";

const LANGUAGES: QuestionLanguage[] = ["English", "Bengali"];

function parseRetryAfterSeconds(value: string | null): number | null {
  if (!value) return null;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber >= 0) return Math.floor(asNumber);
  const retryDate = new Date(value);
  if (Number.isNaN(retryDate.getTime())) return null;
  const seconds = Math.ceil((retryDate.getTime() - Date.now()) / 1000);
  return seconds > 0 ? seconds : 0;
}

type SyllabusResult = {
  parts: Array<{
    partNumber: number;
    title: string;
    focus: string;
  }>;
};

function normalizeParts(input: SyllabusResult["parts"]): SyllabusResult["parts"] {
  const sorted = [...input]
    .filter((p) => p.title?.trim() && p.focus?.trim())
    .map((p) => ({
      partNumber: p.partNumber,
      title: p.title.trim(),
      focus: p.focus.trim(),
    }))
    .sort((a, b) => a.partNumber - b.partNumber);

  if (sorted.length !== 8) {
    return [];
  }

  const validNumbers = sorted.every((p, i) => p.partNumber === i + 1);
  if (!validNumbers) {
    return [];
  }

  return sorted;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const language = (form.get("language") as QuestionLanguage) || "English";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
    }
    if (!LANGUAGES.includes(language)) {
      return NextResponse.json({ error: "Invalid language." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF is supported." }, { status: 400 });
    }

    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI key missing. Add AI_GATEWAY_API_KEY or OPENAI_API_KEY in .env." },
        { status: 500 }
      );
    }

    const model = process.env.AI_MODEL || "openai/gpt-5.4-mini";
    const baseUrl = process.env.AI_GATEWAY_BASE_URL || "https://ai-gateway.vercel.sh/v1";
    const url = process.env.AI_RESPONSES_URL || `${baseUrl}/responses`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const fileData = `data:application/pdf;base64,${base64}`;
    const langInstruction =
      language === "Bengali"
        ? "Return titles and focus text in Bengali."
        : "Return titles and focus text in English.";

    const aiResponse = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_file",
                filename: file.name || "bcs-syllabus.pdf",
                file_data: fileData,
              },
              {
                type: "input_text",
                text: [
                  "Read this BCS MCQ syllabus PDF and split the full syllabus into exactly 8 balanced parts for exam preparation.",
                  langInstruction,
                  "Keep each part focused and practical for question generation.",
                ].join("\n"),
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "bcs_syllabus_8_parts",
            strict: true,
            schema: {
              type: "object",
              properties: {
                parts: {
                  type: "array",
                  minItems: 8,
                  maxItems: 8,
                  items: {
                    type: "object",
                    properties: {
                      partNumber: { type: "integer", minimum: 1, maximum: 8 },
                      title: { type: "string" },
                      focus: { type: "string" },
                    },
                    required: ["partNumber", "title", "focus"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["parts"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (aiResponse.status === 429) {
      const retryAfterSeconds = parseRetryAfterSeconds(aiResponse.headers.get("retry-after"));
      const errorText = await aiResponse.text();
      return NextResponse.json(
        {
          error: "AI provider rate limit reached. Please retry shortly.",
          retryAfterSeconds,
          details: errorText.slice(0, 900),
        },
        { status: 429 }
      );
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        { error: "Failed to parse syllabus PDF.", details: errorText.slice(0, 900) },
        { status: 502 }
      );
    }

    const json = (await aiResponse.json()) as GatewayResponseShape;
    const payload = extractStructuredPayload(json);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Unexpected AI payload for syllabus parsing." }, { status: 502 });
    }

    const parsed = payload as SyllabusResult;
    const parts = normalizeParts(parsed.parts ?? []);
    if (parts.length !== 8) {
      return NextResponse.json(
        { error: "Could not produce exactly 8 valid syllabus parts from the PDF." },
        { status: 502 }
      );
    }

    return NextResponse.json({ parts });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process syllabus PDF", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
