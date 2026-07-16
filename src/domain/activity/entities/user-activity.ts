export const ActivityType = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  DOCUMENT_UPLOAD: "DOCUMENT_UPLOAD",
  DOCUMENT_VIEW: "DOCUMENT_VIEW",
  SUMMARY_GENERATED: "SUMMARY_GENERATED",
  QUESTION_GENERATED: "QUESTION_GENERATED",
  EXAM_CREATED: "EXAM_CREATED",
  EXAM_STARTED: "EXAM_STARTED",
  EXAM_SUBMITTED: "EXAM_SUBMITTED",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export interface UserActivityDTO {
  id: string;
  userId: string;
  type: ActivityType;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}
