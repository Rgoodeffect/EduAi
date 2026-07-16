import { Exam } from "@domain/exam/entities/exam";
import { IExamRepository, IExamAttemptRepository, ExamAttemptDTO, ExamFilter } from "@domain/exam/repositories/exam-repository";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import {
  ExamAttemptAlreadySubmittedError,
  ExamAttemptNotFoundError,
  ExamHasNoQuestionsError,
  ExamNotFoundError,
  ExamNotPublishedError,
  InsufficientQuestionsError,
} from "@domain/exam/errors/exam-errors";
import { InsufficientPermissionsError } from "@domain/user/errors/user-errors";
import { IQuestionRepository } from "@domain/question/repositories/question-repository";
import { Question } from "@domain/question/entities/question";
import { QuestionType } from "@domain/question/value-objects/question-type";
import { IUserActivityRepository } from "@domain/activity/repositories/activity-repository";
import { ActivityType } from "@domain/activity/entities/user-activity";
import { Result } from "@domain/shared/result";
import { PageRequest, PageResult } from "@domain/shared/pagination";
import { AutoGenerateExamInput, CreateExamInput, SubmitExamAttemptInput } from "@application/exam/dto";

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

export interface AttemptQuestionsResult {
  attemptId: string;
  exam: ReturnType<Exam["toDTO"]>;
  questions: ReturnType<Question["toDTO"]>[];
}

export class ExamService {
  constructor(
    private readonly examRepository: IExamRepository,
    private readonly examAttemptRepository: IExamAttemptRepository,
    private readonly questionRepository: IQuestionRepository,
    private readonly activityRepository: IUserActivityRepository,
  ) {}

  async createExam(input: CreateExamInput, createdById: string): Promise<Exam> {
    return this.examRepository.create({
      createdById,
      title: input.title,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes ?? null,
      passingScore: input.passingScore ?? null,
      questions: input.questions.map((q, index) => ({ questionId: q.questionId, order: index + 1, points: q.points })),
    });
  }

  /** Assembles an exam automatically by randomly sampling matching questions from the question bank. */
  async autoGenerateExam(
    input: AutoGenerateExamInput,
    createdById: string,
  ): Promise<Result<Exam, InsufficientQuestionsError>> {
    const pool = await this.gatherCandidatePool(input);
    if (pool.length < input.totalQuestions) {
      return Result.fail(new InsufficientQuestionsError(input.totalQuestions, pool.length));
    }

    const selected = shuffle(pool).slice(0, input.totalQuestions);
    const exam = await this.examRepository.create({
      createdById,
      title: input.title,
      description: input.description ?? null,
      durationMinutes: input.durationMinutes ?? null,
      passingScore: input.passingScore ?? null,
      questions: selected.map((q, index) => ({
        questionId: q.id,
        order: index + 1,
        points: input.pointsPerQuestion,
      })),
    });

    return Result.ok(exam);
  }

  private async gatherCandidatePool(input: AutoGenerateExamInput): Promise<Question[]> {
    const types = input.types && input.types.length > 0 ? input.types : [undefined];
    const seen = new Map<string, Question>();

    for (const type of types) {
      const page = await this.questionRepository.list(
        { page: 1, pageSize: 500 },
        { documentId: input.documentId, difficulty: input.difficulty, type: type as QuestionType | undefined },
      );
      for (const question of page.items) seen.set(question.id, question);
    }

    return Array.from(seen.values());
  }

  async getExam(id: string): Promise<Exam | null> {
    return this.examRepository.findById(id);
  }

  async listExams(page: PageRequest, filter?: ExamFilter): Promise<PageResult<Exam>> {
    return this.examRepository.list(page, filter);
  }

  async publishExam(
    id: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<Result<void, ExamNotFoundError | InsufficientPermissionsError | ExamHasNoQuestionsError>> {
    const exam = await this.examRepository.findById(id);
    if (!exam) return Result.fail(new ExamNotFoundError(id));
    if (!isAdmin && exam.createdById !== requesterId) {
      return Result.fail(new InsufficientPermissionsError("publish this exam"));
    }
    if (exam.questions.length === 0) return Result.fail(new ExamHasNoQuestionsError());

    await this.examRepository.updateStatus(id, ExamStatus.PUBLISHED);
    return Result.ok(undefined);
  }

  async archiveExam(
    id: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<Result<void, ExamNotFoundError | InsufficientPermissionsError>> {
    const exam = await this.examRepository.findById(id);
    if (!exam) return Result.fail(new ExamNotFoundError(id));
    if (!isAdmin && exam.createdById !== requesterId) {
      return Result.fail(new InsufficientPermissionsError("archive this exam"));
    }
    await this.examRepository.updateStatus(id, ExamStatus.ARCHIVED);
    return Result.ok(undefined);
  }

  async deleteExam(
    id: string,
    requesterId: string,
    isAdmin: boolean,
  ): Promise<Result<void, ExamNotFoundError | InsufficientPermissionsError>> {
    const exam = await this.examRepository.findById(id);
    if (!exam) return Result.fail(new ExamNotFoundError(id));
    if (!isAdmin && exam.createdById !== requesterId) {
      return Result.fail(new InsufficientPermissionsError("delete this exam"));
    }
    await this.examRepository.delete(id);
    return Result.ok(undefined);
  }

  /** Returns a published exam's questions, answer keys stripped, in configured order — used both to start an attempt and to re-render the taking UI on resume without minting a duplicate attempt. */
  async getPublishedExamQuestions(
    examId: string,
  ): Promise<Result<{ exam: Exam; questions: Question[] }, ExamNotFoundError | ExamNotPublishedError>> {
    const exam = await this.examRepository.findById(examId);
    if (!exam) return Result.fail(new ExamNotFoundError(examId));
    if (!exam.isPublished()) return Result.fail(new ExamNotPublishedError());

    const questions = await this.questionRepository.findManyByIds(exam.questions.map((q) => q.questionId));
    const byId = new Map(questions.map((q) => [q.id, q]));
    const ordered = exam.questions
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ref) => byId.get(ref.questionId))
      .filter((q): q is Question => q !== undefined);

    return Result.ok({ exam, questions: ordered });
  }

  /** Starts an attempt and returns the exam's questions WITHOUT answer keys, ordered as configured. */
  async startAttempt(
    examId: string,
    userId: string,
  ): Promise<Result<AttemptQuestionsResult, ExamNotFoundError | ExamNotPublishedError>> {
    const loaded = await this.getPublishedExamQuestions(examId);
    if (!loaded.ok) return loaded;
    const { exam, questions: ordered } = loaded.value;

    const attempt = await this.examAttemptRepository.create({ examId, userId });

    await this.activityRepository.record({
      userId,
      type: ActivityType.EXAM_STARTED,
      metadata: { examId, attemptId: attempt.id },
    });

    return Result.ok({
      attemptId: attempt.id,
      exam: exam.toDTO(),
      questions: ordered.map((q) => q.toDTO(false)),
    });
  }

  async submitAttempt(
    attemptId: string,
    userId: string,
    input: SubmitExamAttemptInput,
  ): Promise<
    Result<ExamAttemptDTO, ExamAttemptNotFoundError | InsufficientPermissionsError | ExamAttemptAlreadySubmittedError | ExamNotFoundError>
  > {
    const attempt = await this.examAttemptRepository.findById(attemptId);
    if (!attempt) return Result.fail(new ExamAttemptNotFoundError(attemptId));
    if (attempt.userId !== userId) {
      return Result.fail(new InsufficientPermissionsError("submit this exam attempt"));
    }
    if (attempt.submittedAt) return Result.fail(new ExamAttemptAlreadySubmittedError());

    const exam = await this.examRepository.findById(attempt.examId);
    if (!exam) return Result.fail(new ExamNotFoundError(attempt.examId));

    const questions = await this.questionRepository.findManyByIds(exam.questions.map((q) => q.questionId));
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const pointsByQuestionId = new Map(exam.questions.map((q) => [q.questionId, q.points]));
    const answerByQuestionId = new Map(input.answers.map((a) => [a.questionId, a.answer]));

    let score = 0;
    let maxScore = 0;
    for (const ref of exam.questions) {
      const points = pointsByQuestionId.get(ref.questionId) ?? 0;
      maxScore += points;

      const question = questionById.get(ref.questionId);
      const submittedAnswer = answerByQuestionId.get(ref.questionId);
      if (question && submittedAnswer !== undefined && question.isCorrect(submittedAnswer)) {
        score += points;
      }
    }

    const submitted = await this.examAttemptRepository.submit(attemptId, {
      answers: input.answers,
      score,
      maxScore,
    });

    await this.activityRepository.record({
      userId,
      type: ActivityType.EXAM_SUBMITTED,
      metadata: { examId: attempt.examId, attemptId, score, maxScore },
    });

    return Result.ok(submitted);
  }

  async getAttempt(id: string): Promise<ExamAttemptDTO | null> {
    return this.examAttemptRepository.findById(id);
  }

  async listAttemptsByExam(examId: string): Promise<ExamAttemptDTO[]> {
    return this.examAttemptRepository.listByExam(examId);
  }

  async listMyAttempts(userId: string): Promise<ExamAttemptDTO[]> {
    return this.examAttemptRepository.listByUser(userId);
  }
}
