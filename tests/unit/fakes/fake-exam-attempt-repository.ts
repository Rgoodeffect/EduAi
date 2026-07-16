import { v4 as uuidv4 } from "uuid";
import {
  CreateExamAttemptData,
  ExamAttemptDTO,
  IExamAttemptRepository,
  SubmitExamAttemptData,
} from "@domain/exam/repositories/exam-repository";

export class FakeExamAttemptRepository implements IExamAttemptRepository {
  private attempts = new Map<string, ExamAttemptDTO>();

  async create(data: CreateExamAttemptData): Promise<ExamAttemptDTO> {
    const attempt: ExamAttemptDTO = {
      id: uuidv4(),
      examId: data.examId,
      userId: data.userId,
      answers: [],
      score: null,
      maxScore: null,
      startedAt: new Date(),
      submittedAt: null,
    };
    this.attempts.set(attempt.id, attempt);
    return attempt;
  }

  async findById(id: string): Promise<ExamAttemptDTO | null> {
    return this.attempts.get(id) ?? null;
  }

  async submit(id: string, data: SubmitExamAttemptData): Promise<ExamAttemptDTO> {
    const existing = this.attempts.get(id);
    if (!existing) throw new Error(`Attempt ${id} not found`);
    const updated: ExamAttemptDTO = {
      ...existing,
      answers: data.answers,
      score: data.score,
      maxScore: data.maxScore,
      submittedAt: new Date(),
    };
    this.attempts.set(id, updated);
    return updated;
  }

  async listByExam(examId: string): Promise<ExamAttemptDTO[]> {
    return Array.from(this.attempts.values()).filter((a) => a.examId === examId);
  }

  async listByUser(userId: string): Promise<ExamAttemptDTO[]> {
    return Array.from(this.attempts.values()).filter((a) => a.userId === userId);
  }
}
