export const QuestionType = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  TRUE_FALSE: "TRUE_FALSE",
  SHORT_ANSWER: "SHORT_ANSWER",
  ESSAY: "ESSAY",
  FILL_IN_BLANK: "FILL_IN_BLANK",
} as const;
export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];

export const QuestionDifficulty = {
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
} as const;
export type QuestionDifficulty = (typeof QuestionDifficulty)[keyof typeof QuestionDifficulty];
