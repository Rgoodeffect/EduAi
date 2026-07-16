import { v4 as uuidv4 } from "uuid";
import { Question } from "@domain/question/entities/question";
import {
  CreateQuestionData,
  IQuestionRepository,
  QuestionFilter,
} from "@domain/question/repositories/question-repository";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

export class FakeQuestionRepository implements IQuestionRepository {
  private questions = new Map<string, Question>();

  async create(data: CreateQuestionData): Promise<Question> {
    const id = uuidv4();
    const question = Question.create(
      {
        documentId: data.documentId,
        chunkId: data.chunkId,
        createdById: data.createdById,
        type: data.type,
        difficulty: data.difficulty,
        prompt: data.prompt,
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation,
        tags: data.tags,
        model: data.model,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    );
    this.questions.set(id, question);
    return question;
  }

  async createMany(data: CreateQuestionData[]): Promise<Question[]> {
    const created: Question[] = [];
    for (const d of data) created.push(await this.create(d));
    return created;
  }

  async findById(id: string): Promise<Question | null> {
    return this.questions.get(id) ?? null;
  }

  async findManyByIds(ids: string[]): Promise<Question[]> {
    return Array.from(this.questions.values()).filter((q) => ids.includes(q.id));
  }

  async list(page: PageRequest, filter?: QuestionFilter): Promise<PageResult<Question>> {
    let items = Array.from(this.questions.values());
    if (filter?.documentId) items = items.filter((q) => q.documentId === filter.documentId);
    if (filter?.createdById) items = items.filter((q) => q.createdById === filter.createdById);
    if (filter?.type) items = items.filter((q) => q.type === filter.type);
    if (filter?.difficulty) items = items.filter((q) => q.difficulty === filter.difficulty);
    return toPageResult(items, items.length, page);
  }

  async delete(id: string): Promise<void> {
    this.questions.delete(id);
  }

  async count(filter?: QuestionFilter): Promise<number> {
    return (await this.list({ page: 1, pageSize: 1_000_000 }, filter)).total;
  }
}
