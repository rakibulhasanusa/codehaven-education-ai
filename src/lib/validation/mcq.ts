import { z } from "zod";

export const answerSchema = z.enum(["A", "B", "C", "D"]);

export const uploadRowSchema = z.object({
  subject: z.string().min(1),
  question: z.string().min(8),
  optionA: z.string().min(1),
  optionB: z.string().min(1),
  optionC: z.string().min(1),
  optionD: z.string().min(1),
  answer: answerSchema,
  explanation: z.string().optional(),
  difficulty: z.string().optional(),
  topic: z.string().optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(2).max(150),
});

export const generateMcqSchema = z.object({
  subjectId: z.number().int().positive(),
  similarityThreshold: z.number().min(0).max(1).optional(),
  maxRetries: z.number().int().min(1).max(5).default(3),
});

export const generateExamSchema = z.object({
  learnerName: z.string().trim().min(1).max(120).default("Learner"),
  subjects: z.array(z.string().trim().min(1)).min(1).max(2),
  language: z.enum(["English", "Bengali"]),
  questionCount: z.number().int().default(10),
  referenceYearFrom: z.number().int().optional(),
  referenceYearTo: z.number().int().optional(),
}).superRefine((value, ctx) => {
  const expected = value.subjects.length * 10;
  if (value.questionCount !== expected) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Question count must be ${expected} (${value.subjects.length} subject x 10).`,
      path: ["questionCount"],
    });
  }
});

export const submitAttemptSchema = z.object({
  requestId: z.string().trim().min(1),
  learnerName: z.string().trim().min(1).max(120).default("Learner"),
  language: z.enum(["English", "Bengali"]),
  subjects: z.array(z.string().trim().min(1)).min(1).max(2),
  answers: z.array(z.number().int().min(0).max(3).nullable()),
  timeSpent: z.array(z.number().int().min(0)).optional(),
  questionCount: z.number().int().min(1),
  score: z.number().int().min(0),
  wrong: z.number().int().min(0),
  unanswered: z.number().int().min(0),
  accuracyPercent: z.number().int().min(0).max(100),
  avgTimePerQuestion: z.number().int().min(0),
});
