import { Question } from "@domain/question/entities/question";
import { QuestionType, QuestionDifficulty } from "@domain/question/value-objects/question-type";
import { PageRequest, PageResult } from "@domain/shared/pagination";

export interface CreateQuestionData {
  documentId: string | null;
  chunkId: string | null;
  createdById: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string;
  options: { key: string; text: string }[] | null;
  correctAnswer: string;
  explanation: string | null;
  tags: string[];
  model: string | null;
}

export interface QuestionFilter {
  documentId?: string;
  createdById?: string;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  tags?: string[];
  search?: string;
}

export interface IQuestionRepository {
  create(data: CreateQuestionData): Promise<Question>;
  createMany(data: CreateQuestionData[]): Promise<Question[]>;
  findById(id: string): Promise<Question | null>;
  findManyByIds(ids: string[]): Promise<Question[]>;
  list(page: PageRequest, filter?: QuestionFilter): Promise<PageResult<Question>>;
  delete(id: string): Promise<void>;
  count(filter?: QuestionFilter): Promise<number>;
}
