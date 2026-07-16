export const DocumentStatus = {
  UPLOADED: "UPLOADED",
  PROCESSING: "PROCESSING",
  CHUNKING: "CHUNKING",
  EMBEDDING: "EMBEDDING",
  READY: "READY",
  FAILED: "FAILED",
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
