import { v4 as uuidv4 } from "uuid";
import { Exam } from "@domain/exam/entities/exam";
import { CreateExamData, ExamFilter, IExamRepository } from "@domain/exam/repositories/exam-repository";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import { PageRequest, PageResult, toPageResult } from "@domain/shared/pagination";

export class FakeExamRepository implements IExamRepository {
  private exams = new Map<string, Exam>();

  async create(data: CreateExamData): Promise<Exam> {
    const id = uuidv4();
    const exam = Exam.create(
      {
        createdById: data.createdById,
        title: data.title,
        description: data.description,
        status: ExamStatus.DRAFT,
        durationMinutes: data.durationMinutes,
        passingScore: data.passingScore,
        questions: data.questions,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      id,
    );
    this.exams.set(id, exam);
    return exam;
  }

  async findById(id: string): Promise<Exam | null> {
    return this.exams.get(id) ?? null;
  }

  async list(page: PageRequest, filter?: ExamFilter): Promise<PageResult<Exam>> {
    let items = Array.from(this.exams.values());
    if (filter?.createdById) items = items.filter((e) => e.createdById === filter.createdById);
    if (filter?.status) items = items.filter((e) => e.status === filter.status);
    return toPageResult(items, items.length, page);
  }

  async updateStatus(id: string, status: ExamStatus): Promise<void> {
    const exam = this.exams.get(id);
    if (!exam) return;
    this.exams.set(
      id,
      Exam.create(
        {
          createdById: exam.createdById,
          title: exam.title,
          description: exam.description,
          status,
          durationMinutes: exam.durationMinutes,
          passingScore: exam.passingScore,
          questions: exam.questions,
          createdAt: exam.createdAt,
          updatedAt: new Date(),
        },
        id,
      ),
    );
  }

  async delete(id: string): Promise<void> {
    this.exams.delete(id);
  }
}
