import { HTMLAttributes } from "react";
import { cn } from "@lib/cn";

type BadgeTone = "gray" | "blue" | "green" | "yellow" | "red" | "purple";

const TONE_CLASSES: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ className, tone = "gray", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}

const DOCUMENT_STATUS_TONE: Record<string, BadgeTone> = {
  UPLOADED: "gray",
  PROCESSING: "yellow",
  CHUNKING: "yellow",
  EMBEDDING: "yellow",
  READY: "green",
  FAILED: "red",
};

const EXAM_STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "gray",
  PUBLISHED: "green",
  ARCHIVED: "red",
};

const DIFFICULTY_TONE: Record<string, BadgeTone> = {
  EASY: "green",
  MEDIUM: "yellow",
  HARD: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={DOCUMENT_STATUS_TONE[status] ?? "gray"}>{status}</Badge>;
}

export function ExamStatusBadge({ status }: { status: string }) {
  return <Badge tone={EXAM_STATUS_TONE[status] ?? "gray"}>{status}</Badge>;
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return <Badge tone={DIFFICULTY_TONE[difficulty] ?? "gray"}>{difficulty}</Badge>;
}
