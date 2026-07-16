import { PrismaClient, Exam as PrismaExam, ExamQuestion as PrismaExamQuestion, Prisma } from "@prisma/client";
import { Exam } from "@domain/exam/entities/exam";
import {
  CreateExamData,
  ExamFilter,
  IExamRepository,
} from "@domain/exam/repositories/exam-repository";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

type PrismaExamWithQuestions = PrismaExam & { examQuestions: PrismaExamQuestion[] };

function toDomain(record: PrismaExamWithQuestions): Exam {
  return Exam.create(
    {
      createdById: record.createdById,
      title: record.title,
      description: record.description,
      status: record.status as ExamStatus,
      durationMinutes: record.durationMinutes,
      passingScore: record.passingScore,
      questions: record.examQuestions
        .sort((a, b) => a.order - b.order)
        .map((q) => ({ questionId: q.questionId, order: q.order, points: q.points })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    record.id,
  );
}

const includeQuestions = { examQuestions: true } as const;

export class PrismaExamRepository implements IExamRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateExamData): Promise<Exam> {
    const record = await this.db.exam.create({
      data: {
        createdById: data.createdById,
        title: data.title,
        description: data.description,
        durationMinutes: data.durationMinutes,
        passingScore: data.passingScore,
        examQuestions: {
          create: data.questions.map((q) => ({
            questionId: q.questionId,
            order: q.order,
            points: q.points,
          })),
        },
      },
      include: includeQuestions,
    });
    return toDomain(record);
  }

  async findById(id: string): Promise<Exam | null> {
    const record = await this.db.exam.findUnique({ where: { id }, include: includeQuestions });
    return record ? toDomain(record) : null;
  }

  private buildWhere(filter?: ExamFilter): Prisma.ExamWhereInput {
    return {
      ...(filter?.createdById ? { createdById: filter.createdById } : {}),
      ...(filter?.status ? { status: filter.status } : {}),
    };
  }

  async list(page: PageRequest, filter?: ExamFilter): Promise<PageResult<Exam>> {
    const where = this.buildWhere(filter);
    const [records, total] = await Promise.all([
      this.db.exam.findMany({
        where,
        include: includeQuestions,
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.db.exam.count({ where }),
    ]);
    return toPageResult(records.map(toDomain), total, page);
  }

  async updateStatus(id: string, status: ExamStatus): Promise<void> {
    await this.db.exam.update({ where: { id }, data: { status } });
  }

  async delete(id: string): Promise<void> {
    await this.db.exam.delete({ where: { id } });
  }
}
