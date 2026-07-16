import { QuestionDifficulty, QuestionType } from "@domain/question/value-objects/question-type";
import { ChatMessage } from "@application/ai/ports/llm-client.port";

const TYPE_INSTRUCTIONS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE:
    'Each question must have exactly 4 "options" with keys "A", "B", "C", "D". ' +
    '"correctAnswer" must be exactly one of those keys (e.g. "B").',
  TRUE_FALSE:
    'Each question must have "options" set to [{"key":"True","text":"True"},{"key":"False","text":"False"}]. ' +
    '"correctAnswer" must be exactly "True" or "False".',
  SHORT_ANSWER:
    'Omit "options" (set it to null). "correctAnswer" should be a concise model answer (1-2 sentences).',
  ESSAY:
    'Omit "options" (set it to null). "correctAnswer" should be a grading rubric or model answer outline ' +
    "covering the key points a strong response would include.",
  FILL_IN_BLANK:
    'The "prompt" must contain a blank written as "_____". Omit "options" (set it to null). ' +
    '"correctAnswer" must be the exact word or phrase that belongs in the blank.',
};

const DIFFICULTY_GUIDANCE: Record<QuestionDifficulty, string> = {
  EASY: "Test recall of explicitly stated facts and definitions.",
  MEDIUM: "Test understanding and the ability to connect two or more concepts from the material.",
  HARD: "Test application, analysis, or synthesis — require reasoning beyond a single sentence in the source text.",
};

export interface BuildQuestionPromptInput {
  contextText: string;
  count: number;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  topic?: string;
}

export function buildQuestionGenerationMessages(input: BuildQuestionPromptInput): ChatMessage[] {
  const system =
    "You are an expert educator generating exam questions strictly from the provided source material. " +
    "Never introduce facts that are not supported by the material. " +
    `Question type: ${input.type}. ${TYPE_INSTRUCTIONS[input.type]} ` +
    `Difficulty: ${input.difficulty}. ${DIFFICULTY_GUIDANCE[input.difficulty]} ` +
    "Respond with ONLY a JSON object of the exact shape " +
    '{"questions":[{"prompt":string,"options":array|null,"correctAnswer":string,"explanation":string,"tags":string[]}]}. ' +
    "No markdown, no commentary outside the JSON.";

  const focus = input.topic ? `Focus specifically on: ${input.topic}\n\n` : "";
  const user = `${focus}Generate exactly ${input.count} ${input.difficulty.toLowerCase()} ${input.type
    .toLowerCase()
    .replace("_", " ")} question(s) from the following source material:\n\n${input.contextText}`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
