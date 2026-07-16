import { Prisma, PrismaClient, ExamAttempt as PrismaExamAttempt } from "@prisma/client";
import {
  CreateExamAttemptData,
  ExamAttemptAnswer,
  ExamAttemptDTO,
  IExamAttemptRepository,
  SubmitExamAttemptData,
} from "@domain/exam/repositories/exam-repository";

function toDTO(record: PrismaExamAttempt): ExamAttemptDTO {
  return {
    id: record.id,
    examId: record.examId,
    userId: record.userId,
    answers: (record.answers as unknown as ExamAttemptAnswer[]) ?? [],
    score: record.score,
    maxScore: record.maxScore,
    startedAt: record.startedAt,
    submittedAt: record.submittedAt,
  };
}

export class PrismaExamAttemptRepository implements IExamAttemptRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateExamAttemptData): Promise<ExamAttemptDTO> {
    const record = await this.db.examAttempt.create({
      data: { examId: data.examId, userId: data.userId, answers: [] },
    });
    return toDTO(record);
  }

  async findById(id: string): Promise<ExamAttemptDTO | null> {
    const record = await this.db.examAttempt.findUnique({ where: { id } });
    return record ? toDTO(record) : null;
  }

  async submit(id: string, data: SubmitExamAttemptData): Promise<ExamAttemptDTO> {
    const record = await this.db.examAttempt.update({
      where: { id },
      data: {
        answers: data.answers as unknown as Prisma.InputJsonValue,
        score: data.score,
        maxScore: data.maxScore,
        submittedAt: new Date(),
      },
    });
    return toDTO(record);
  }

  async listByExam(examId: string): Promise<ExamAttemptDTO[]> {
    const records = await this.db.examAttempt.findMany({ where: { examId }, orderBy: { startedAt: "desc" } });
    return records.map(toDTO);
  }

  async listByUser(userId: string): Promise<ExamAttemptDTO[]> {
    const records = await this.db.examAttempt.findMany({ where: { userId }, orderBy: { startedAt: "desc" } });
    return records.map(toDTO);
  }
}
