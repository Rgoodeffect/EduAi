export const ExamStatus = {
  DRAFT: "DRAFT",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ExamStatus = (typeof ExamStatus)[keyof typeof ExamStatus];
