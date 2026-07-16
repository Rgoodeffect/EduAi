import { Entity } from "@domain/shared/entity";
import { QuestionType, QuestionDifficulty } from "@domain/question/value-objects/question-type";

export interface QuestionOption {
  key: string;
  text: string;
}

export interface QuestionProps {
  documentId: string | null;
  chunkId: string | null;
  createdById: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string;
  options: QuestionOption[] | null;
  correctAnswer: string;
  explanation: string | null;
  tags: string[];
  model: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Question extends Entity<QuestionProps> {
  private constructor(props: QuestionProps, id: string) {
    super(props, id);
  }

  static create(props: QuestionProps, id: string): Question {
    return new Question(props, id);
  }

  get type(): QuestionType {
    return this.props.type;
  }

  get difficulty(): QuestionDifficulty {
    return this.props.difficulty;
  }

  get prompt(): string {
    return this.props.prompt;
  }

  get options(): QuestionOption[] | null {
    return this.props.options;
  }

  get correctAnswer(): string {
    return this.props.correctAnswer;
  }

  get documentId(): string | null {
    return this.props.documentId;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  /** Grades a submitted answer. Objective types are auto-graded; free text
   *  types (ESSAY) require manual/AI-assisted grading and always return false
   *  here so callers can route them appropriately. */
  isCorrect(submittedAnswer: string): boolean {
    if (this.props.type === QuestionType.ESSAY) return false;
    const normalize = (s: string) => s.trim().toLowerCase();
    return normalize(submittedAnswer) === normalize(this.props.correctAnswer);
  }

  toDTO(includeAnswer = false) {
    return {
      id: this.id,
      documentId: this.props.documentId,
      chunkId: this.props.chunkId,
      createdById: this.props.createdById,
      type: this.props.type,
      difficulty: this.props.difficulty,
      prompt: this.props.prompt,
      options: this.props.options,
      ...(includeAnswer
        ? { correctAnswer: this.props.correctAnswer, explanation: this.props.explanation }
        : {}),
      tags: this.props.tags,
      createdAt: this.props.createdAt,
    };
  }
}
