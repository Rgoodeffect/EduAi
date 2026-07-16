import { Exam } from "@domain/exam/entities/exam";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { PageRequest, PageResult } from "@domain/shared/pagination";

export interface CreateExamData {
  createdById: string;
  title: string;
  description: string | null;
  durationMinutes: number | null;
  passingScore: number | null;
  questions: { questionId: string; order: number; points: number }[];
}

export interface ExamFilter {
  createdById?: string;
  status?: ExamStatus;
}

export interface IExamRepository {
  create(data: CreateExamData): Promise<Exam>;
  findById(id: string): Promise<Exam | null>;
  list(page: PageRequest, filter?: ExamFilter): Promise<PageResult<Exam>>;
  updateStatus(id: string, status: ExamStatus): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface ExamAttemptAnswer {
  questionId: string;
  answer: string;
}

export interface CreateExamAttemptData {
  examId: string;
  userId: string;
}

export interface SubmitExamAttemptData {
  answers: ExamAttemptAnswer[];
  score: number;
  maxScore: number;
}

export interface ExamAttemptDTO {
  id: string;
  examId: string;
  userId: string;
  answers: ExamAttemptAnswer[];
  score: number | null;
  maxScore: number | null;
  startedAt: Date;
  submittedAt: Date | null;
}

export interface IExamAttemptRepository {
  create(data: CreateExamAttemptData): Promise<ExamAttemptDTO>;
  findById(id: string): Promise<ExamAttemptDTO | null>;
  submit(id: string, data: SubmitExamAttemptData): Promise<ExamAttemptDTO>;
  listByExam(examId: string): Promise<ExamAttemptDTO[]>;
  listByUser(userId: string): Promise<ExamAttemptDTO[]>;
}
