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
