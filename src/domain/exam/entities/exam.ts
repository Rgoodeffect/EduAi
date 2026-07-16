import { Entity } from "@domain/shared/entity";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";

export interface ExamQuestionRef {
  questionId: string;
  order: number;
  points: number;
}

export interface ExamProps {
  createdById: string;
  title: string;
  description: string | null;
  status: ExamStatus;
  durationMinutes: number | null;
  passingScore: number | null;
  questions: ExamQuestionRef[];
  createdAt: Date;
  updatedAt: Date;
}

export class Exam extends Entity<ExamProps> {
  private constructor(props: ExamProps, id: string) {
    super(props, id);
  }

  static create(props: ExamProps, id: string): Exam {
    return new Exam(props, id);
  }

  get title(): string {
    return this.props.title;
  }

  get status(): ExamStatus {
    return this.props.status;
  }

  get questions(): ExamQuestionRef[] {
    return this.props.questions;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get durationMinutes(): number | null {
    return this.props.durationMinutes;
  }

  totalPoints(): number {
    return this.props.questions.reduce((sum, q) => sum + q.points, 0);
  }

  isPublished(): boolean {
    return this.props.status === ExamStatus.PUBLISHED;
  }

  toDTO() {
    return {
      id: this.id,
      createdById: this.props.createdById,
      title: this.props.title,
      description: this.props.description,
      status: this.props.status,
      durationMinutes: this.props.durationMinutes,
      passingScore: this.props.passingScore,
      totalPoints: this.totalPoints(),
      questionCount: this.props.questions.length,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
