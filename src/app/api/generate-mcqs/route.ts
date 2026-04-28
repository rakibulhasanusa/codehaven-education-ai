import { NextResponse } from "next/server";
import { extractStructuredPayload, type GatewayResponseShape } from "@/lib/ai/response-parser";
import { BCS_SUBJECTS } from "@/lib/mcq/constants";
import type { Difficulty, QuestionLanguage, Subject, SyllabusPart } from "@/lib/mcq/types";

type GeneratePayload = {
  subjects: Subject[];
  language: QuestionLanguage;
  questionCount: number;
  syllabusParts?: SyllabusPart[];
  learnerName?: string;
};

type GeneratedQuestion = {
  id: string;
  subject: Subject;
  language: QuestionLanguage;
  difficulty: Difficulty;
  syllabusPart?: number;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const SUBJECTS: Subject[] = BCS_SUBJECTS;
const LANGUAGES: QuestionLanguage[] = ["English", "Bengali"];
const DIFFICULTY: Difficulty[] = ["Basic", "Medium", "Hard"];

function validatePayload(payload: GeneratePayload): string | null {
  if (!Array.isArray(payload.subjects) || payload.subjects.length === 0) {
    return "At least one subject is required.";
  }
  if (payload.subjects.some((s) => !SUBJECTS.includes(s))) {
    return "Invalid subject provided.";
  }
  const expectedCount = payload.subjects.length * 10;
  if (!Number.isInteger(payload.questionCount) || payload.questionCount !== expectedCount) {
    return `Question count must be exactly ${expectedCount} (10 per selected subject).`;
  }
  if (!LANGUAGES.includes(payload.language)) {
    return "Invalid language provided.";
  }
  if (payload.syllabusParts && payload.syllabusParts.length > 0 && payload.syllabusParts.length !== 8) {
    return "Syllabus must be split into exactly 8 parts.";
  }
  return null;
}

function sanitizeQuestions(
  questions: GeneratedQuestion[],
  requestedCount: number,
  requestedLanguage: QuestionLanguage
): GeneratedQuestion[] {
  return questions
    .filter(
      (q) =>
        q.question?.trim() &&
        Array.isArray(q.options) &&
        q.options.length === 4 &&
        q.correctIndex >= 0 &&
        q.correctIndex <= 3 &&
        q.explanation?.trim() &&
        SUBJECTS.includes(q.subject) &&
        LANGUAGES.includes(q.language) &&
        DIFFICULTY.includes(q.difficulty)
    )
    .slice(0, requestedCount)
    .map((q, idx) => ({
      ...q,
      id: q.id || `ai-${Date.now()}-${idx + 1}`,
      language: requestedLanguage,
      difficulty: q.difficulty,
      syllabusPart:
        typeof q.syllabusPart === "number" && q.syllabusPart >= 1 && q.syllabusPart <= 8
          ? q.syllabusPart
          : ((idx % 8) + 1),
      topic: q.topic || "General",
      options: q.options.map((opt) => String(opt)),
    }));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GeneratePayload;
    const validationError = validatePayload(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
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
    const learnerLabel = body.learnerName?.trim() || "the learner";
    const languageInstruction =
      body.language === "Bengali"
        ? "Write all questions, options, and explanations in natural, fluent Bengali (Bangla)."
        : "Write all questions, options, and explanations in clear English.";

    const syllabusInstruction =
      body.syllabusParts && body.syllabusParts.length === 8
        ? [
            "Follow this BCS syllabus split (8 parts), and distribute questions across these parts as evenly as possible:",
            ...body.syllabusParts.map(
              (part) => `Part ${part.partNumber}: ${part.title} - ${part.focus}`
            ),
          ].join("\n")
        : "No syllabus split provided. Generate from the selected subjects.";

    const prompt = [
      `Generate exactly ${body.questionCount} MCQs for ${learnerLabel}.`,
      `Subjects: ${body.subjects.join(", ")}.`,
      `Question language: ${body.language}.`,
      "Generate exactly 10 questions per selected subject.",
      "For each subject include a difficulty mix across Basic, Medium, Hard (at least one from each).",
      languageInstruction,
      "Use difficulty labels exactly: Basic, Medium, Hard.",
      "Each question must have exactly 4 options, one correct answer, and a short, accurate explanation.",
      "Avoid repeated questions.",
      "Set syllabusPart (1-8) for each question.",
      syllabusInstruction,
    ].join("\n");

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
            role: "system",
            content: [
              {
                type: "input_text",
                text: "You are an MCQ generator. Return valid JSON only.",
              },
            ],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "mcq_questions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      subject: { type: "string", enum: SUBJECTS },
                      language: { type: "string", enum: LANGUAGES },
                      difficulty: { type: "string", enum: DIFFICULTY },
                      syllabusPart: { type: "integer", minimum: 1, maximum: 8 },
                      topic: { type: "string" },
                      question: { type: "string" },
                      options: {
                        type: "array",
                        items: { type: "string" },
                        minItems: 4,
                        maxItems: 4,
                      },
                      correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                      explanation: { type: "string" },
                    },
                    required: [
                      "id",
                      "subject",
                      "language",
                      "difficulty",
                      "topic",
                      "question",
                      "options",
                      "correctIndex",
                      "explanation",
                      "syllabusPart",
                    ],
                    additionalProperties: false,
                  },
                  minItems: body.questionCount,
                },
              },
              required: ["questions"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        { error: "AI request failed", details: errorText.slice(0, 900) },
        { status: 502 }
      );
    }

    const json = (await aiResponse.json()) as GatewayResponseShape;
    const payload = extractStructuredPayload(json);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        {
          error: "AI returned an unexpected payload shape.",
          details: "No parseable JSON object was found in the AI response.",
        },
        { status: 502 }
      );
    }

    const parsed = payload as { questions: GeneratedQuestion[] };
    const clean = sanitizeQuestions(parsed.questions ?? [], body.questionCount, body.language);
    if (clean.length < body.questionCount) {
      return NextResponse.json(
        {
          error: "AI response did not include enough valid questions.",
          details: `Requested ${body.questionCount}, received ${clean.length} valid questions.`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ questions: clean });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate MCQs", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
