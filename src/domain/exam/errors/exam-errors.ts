import { DomainError } from "@domain/shared/result";

export class ExamNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Exam "${id}" was not found.`, "EXAM_NOT_FOUND");
  }
}

export class ExamNotPublishedError extends DomainError {
  constructor() {
    super("This exam is not published yet.", "EXAM_NOT_PUBLISHED");
  }
}

export class ExamHasNoQuestionsError extends DomainError {
  constructor() {
    super("An exam must have at least one question before it can be published.", "EXAM_HAS_NO_QUESTIONS");
  }
}

export class InsufficientQuestionsError extends DomainError {
  constructor(requested: number, available: number) {
    super(
      `Requested ${requested} questions but only ${available} matching questions exist in the question bank. ` +
        "Generate more questions first, or lower the requested count.",
      "INSUFFICIENT_QUESTIONS",
    );
  }
}

export class ExamAttemptNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Exam attempt "${id}" was not found.`, "EXAM_ATTEMPT_NOT_FOUND");
  }
}

export class ExamAttemptAlreadySubmittedError extends DomainError {
  constructor() {
    super("This exam attempt has already been submitted.", "EXAM_ATTEMPT_ALREADY_SUBMITTED");
  }
}
