import { z } from "zod";

export const questionTypeSchema = z.enum([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "ESSAY",
  "FILL_IN_BLANK",
]);
export const questionDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export const generateQuestionsSchema = z.object({
  documentId: z.string().uuid(),
  count: z.number().int().min(1).max(20).default(5),
  type: questionTypeSchema.default("MULTIPLE_CHOICE"),
  difficulty: questionDifficultySchema.default("MEDIUM"),
  /** Optional focus area; when set, retrieval is scoped to the most relevant chunks via RAG instead of sampling the whole document. */
  topic: z.string().max(300).optional(),
});
export type GenerateQuestionsInput = z.infer<typeof generateQuestionsSchema>;

export const createManualQuestionSchema = z.object({
  documentId: z.string().uuid().nullable().optional(),
  type: questionTypeSchema,
  difficulty: questionDifficultySchema,
  prompt: z.string().min(1).max(2000),
  options: z.array(z.object({ key: z.string(), text: z.string() })).nullable().optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().max(2000).nullable().optional(),
  tags: z.array(z.string()).default([]),
});
export type CreateManualQuestionInput = z.infer<typeof createManualQuestionSchema>;

/** Shape the LLM is instructed to return; validated before anything touches the database. */
export const generatedQuestionItemSchema = z.object({
  prompt: z.string().min(1),
  options: z
    .array(z.object({ key: z.string().min(1), text: z.string().min(1) }))
    .nullable()
    .optional(),
  correctAnswer: z.string().min(1),
  explanation: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});
export const generatedQuestionsResponseSchema = z.object({
  questions: z.array(generatedQuestionItemSchema),
});
export type GeneratedQuestionItem = z.infer<typeof generatedQuestionItemSchema>;
