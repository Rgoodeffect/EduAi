import { PrismaClient, Question as PrismaQuestion, Prisma } from "@prisma/client";
import { Question, QuestionOption } from "@domain/question/entities/question";
import {
  CreateQuestionData,
  IQuestionRepository,
  QuestionFilter,
} from "@domain/question/repositories/question-repository";
import { QuestionDifficulty, QuestionType } from "@domain/question/value-objects/question-type";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

function toDomain(record: PrismaQuestion): Question {
  return Question.create(
    {
      documentId: record.documentId,
      chunkId: record.chunkId,
      createdById: record.createdById,
      type: record.type as QuestionType,
      difficulty: record.difficulty as QuestionDifficulty,
      prompt: record.prompt,
      options: (record.options as unknown as QuestionOption[] | null) ?? null,
      correctAnswer: record.correctAnswer,
      explanation: record.explanation,
      tags: record.tags,
      model: record.model,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    },
    record.id,
  );
}

export class PrismaQuestionRepository implements IQuestionRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateQuestionData): Promise<Question> {
    const record = await this.db.question.create({
      data: { ...data, options: data.options ?? Prisma.JsonNull },
    });
    return toDomain(record);
  }

  async createMany(data: CreateQuestionData[]): Promise<Question[]> {
    if (data.length === 0) return [];
    await this.db.question.createMany({
      data: data.map((d) => ({ ...d, options: d.options ?? Prisma.JsonNull })),
    });
    const created = await this.db.question.findMany({
      where: { createdById: data[0]!.createdById },
      orderBy: { createdAt: "desc" },
      take: data.length,
    });
    return created.map(toDomain);
  }

  async findById(id: string): Promise<Question | null> {
    const record = await this.db.question.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findManyByIds(ids: string[]): Promise<Question[]> {
    const records = await this.db.question.findMany({ where: { id: { in: ids } } });
    return records.map(toDomain);
  }

  private buildWhere(filter?: QuestionFilter): Prisma.QuestionWhereInput {
    return {
      ...(filter?.documentId ? { documentId: filter.documentId } : {}),
      ...(filter?.createdById ? { createdById: filter.createdById } : {}),
      ...(filter?.type ? { type: filter.type } : {}),
      ...(filter?.difficulty ? { difficulty: filter.difficulty } : {}),
      ...(filter?.tags && filter.tags.length > 0 ? { tags: { hasSome: filter.tags } } : {}),
      ...(filter?.search ? { prompt: { contains: filter.search, mode: "insensitive" } } : {}),
    };
  }

  async list(page: PageRequest, filter?: QuestionFilter): Promise<PageResult<Question>> {
    const where = this.buildWhere(filter);
    const [records, total] = await Promise.all([
      this.db.question.findMany({
        where,
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.db.question.count({ where }),
    ]);
    return toPageResult(records.map(toDomain), total, page);
  }

  async delete(id: string): Promise<void> {
    await this.db.question.delete({ where: { id } });
  }

  async count(filter?: QuestionFilter): Promise<number> {
    return this.db.question.count({ where: this.buildWhere(filter) });
  }
}
