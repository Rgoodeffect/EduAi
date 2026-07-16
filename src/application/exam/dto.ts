import { z } from "zod";
import { questionDifficultySchema, questionTypeSchema } from "@application/question/dto";

export const createExamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  durationMinutes: z.number().int().min(1).max(600).nullable().optional(),
  passingScore: z.number().int().min(0).max(100).nullable().optional(),
  questions: z
    .array(z.object({ questionId: z.string().uuid(), points: z.number().int().min(1).default(1) }))
    .min(1, "An exam needs at least one question."),
});
export type CreateExamInput = z.infer<typeof createExamSchema>;

export const autoGenerateExamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable().optional(),
  documentId: z.string().uuid().optional(),
  totalQuestions: z.number().int().min(1).max(100),
  difficulty: questionDifficultySchema.optional(),
  types: z.array(questionTypeSchema).optional(),
  durationMinutes: z.number().int().min(1).max(600).nullable().optional(),
  passingScore: z.number().int().min(0).max(100).nullable().optional(),
  pointsPerQuestion: z.number().int().min(1).max(100).default(1),
});
export type AutoGenerateExamInput = z.infer<typeof autoGenerateExamSchema>;

export const submitExamAttemptSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.string() })),
});
export type SubmitExamAttemptInput = z.infer<typeof submitExamAttemptSchema>;
