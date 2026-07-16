import { describe, it, expect, beforeEach } from "vitest";
import { ExamService } from "@application/exam/exam-service";
import { ExamStatus } from "@domain/exam/value-objects/exam-status";
import {
  ExamHasNoQuestionsError,
  ExamNotPublishedError,
  InsufficientQuestionsError,
  ExamAttemptAlreadySubmittedError,
} from "@domain/exam/errors/exam-errors";
import { InsufficientPermissionsError } from "@domain/user/errors/user-errors";
import { FakeExamRepository } from "./fakes/fake-exam-repository";
import { FakeExamAttemptRepository } from "./fakes/fake-exam-attempt-repository";
import { FakeQuestionRepository } from "./fakes/fake-question-repository";
import { FakeUserActivityRepository } from "./fakes/fake-activity-repository";

function buildService() {
  const examRepository = new FakeExamRepository();
  const examAttemptRepository = new FakeExamAttemptRepository();
  const questionRepository = new FakeQuestionRepository();
  const activityRepository = new FakeUserActivityRepository();
  const service = new ExamService(examRepository, examAttemptRepository, questionRepository, activityRepository);
  return { service, examRepository, examAttemptRepository, questionRepository, activityRepository };
}

async function makeQuestion(
  questionRepository: FakeQuestionRepository,
  overrides: Partial<{ correctAnswer: string; difficulty: "EASY" | "MEDIUM" | "HARD" }> = {},
) {
  return questionRepository.create({
    documentId: null,
    chunkId: null,
    createdById: "teacher-1",
    type: "SHORT_ANSWER",
    difficulty: overrides.difficulty ?? "MEDIUM",
    prompt: "What is 2 + 2?",
    options: null,
    correctAnswer: overrides.correctAnswer ?? "4",
    explanation: null,
    tags: [],
    model: null,
  });
}

describe("ExamService", () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it("creates a manual exam in DRAFT status", async () => {
    const q1 = await makeQuestion(ctx.questionRepository);
    const exam = await ctx.service.createExam(
      { title: "Midterm", questions: [{ questionId: q1.id, points: 5 }] },
      "teacher-1",
    );
    expect(exam.status).toBe(ExamStatus.DRAFT);
    expect(exam.totalPoints()).toBe(5);
  });

  it("refuses to publish an exam with no questions", async () => {
    const emptyExam = await ctx.examRepository.create({
      createdById: "teacher-1",
      title: "Empty",
      description: null,
      durationMinutes: null,
      passingScore: null,
      questions: [],
    });
    const result = await ctx.service.publishExam(emptyExam.id, "teacher-1", false);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ExamHasNoQuestionsError);
  });

  it("prevents a non-owner, non-admin from publishing someone else's exam", async () => {
    const q1 = await makeQuestion(ctx.questionRepository);
    const exam = await ctx.service.createExam({ title: "X", questions: [{ questionId: q1.id, points: 1 }] }, "teacher-1");
    const result = await ctx.service.publishExam(exam.id, "teacher-2", false);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InsufficientPermissionsError);
  });

  it("publishes successfully when owned and has questions", async () => {
    const q1 = await makeQuestion(ctx.questionRepository);
    const exam = await ctx.service.createExam({ title: "X", questions: [{ questionId: q1.id, points: 1 }] }, "teacher-1");
    const result = await ctx.service.publishExam(exam.id, "teacher-1", false);
    expect(result.ok).toBe(true);
    const updated = await ctx.service.getExam(exam.id);
    expect(updated?.status).toBe(ExamStatus.PUBLISHED);
  });

  it("auto-generates an exam by sampling from the question bank", async () => {
    for (let i = 0; i < 5; i++) await makeQuestion(ctx.questionRepository, { correctAnswer: `answer-${i}` });

    const result = await ctx.service.autoGenerateExam(
      { title: "Auto Exam", totalQuestions: 3, pointsPerQuestion: 2 },
      "teacher-1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.questions).toHaveLength(3);
    expect(result.value.totalPoints()).toBe(6);
    // No duplicate questions selected.
    const ids = new Set(result.value.questions.map((q) => q.questionId));
    expect(ids.size).toBe(3);
  });

  it("fails auto-generation when the question bank doesn't have enough matching questions", async () => {
    await makeQuestion(ctx.questionRepository);
    const result = await ctx.service.autoGenerateExam({ title: "X", totalQuestions: 5, pointsPerQuestion: 1 }, "teacher-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InsufficientQuestionsError);
  });

  it("refuses to start an attempt on an unpublished exam", async () => {
    const q1 = await makeQuestion(ctx.questionRepository);
    const exam = await ctx.service.createExam({ title: "Draft", questions: [{ questionId: q1.id, points: 1 }] }, "teacher-1");
    const result = await ctx.service.startAttempt(exam.id, "student-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ExamNotPublishedError);
  });

  it("starts an attempt and strips answer keys from returned questions", async () => {
    const q1 = await makeQuestion(ctx.questionRepository);
    const exam = await ctx.service.createExam({ title: "Quiz", questions: [{ questionId: q1.id, points: 1 }] }, "teacher-1");
    await ctx.service.publishExam(exam.id, "teacher-1", false);

    const result = await ctx.service.startAttempt(exam.id, "student-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.questions).toHaveLength(1);
    expect(result.value.questions[0]).not.toHaveProperty("correctAnswer");
  });

  it("grades a submitted attempt: correct answers earn points, wrong answers don't", async () => {
    const q1 = await makeQuestion(ctx.questionRepository, { correctAnswer: "4" });
    const q2 = await makeQuestion(ctx.questionRepository, { correctAnswer: "paris" });
    const exam = await ctx.service.createExam(
      { title: "Quiz", questions: [{ questionId: q1.id, points: 3 }, { questionId: q2.id, points: 2 }] },
      "teacher-1",
    );
    await ctx.service.publishExam(exam.id, "teacher-1", false);
    const started = await ctx.service.startAttempt(exam.id, "student-1");
    if (!started.ok) throw new Error("setup failed");

    const submitted = await ctx.service.submitAttempt(started.value.attemptId, "student-1", {
      answers: [
        { questionId: q1.id, answer: "4" }, // correct
        { questionId: q2.id, answer: "london" }, // wrong
      ],
    });

    expect(submitted.ok).toBe(true);
    if (!submitted.ok) return;
    expect(submitted.value.score).toBe(3);
    expect(submitted.value.maxScore).toBe(5);
    expect(submitted.value.submittedAt).not.toBeNull();
  });

  it("rejects a second submission of the same attempt", async () => {
    const q1 = await makeQuestion(ctx.questionRepository, { correctAnswer: "4" });
    const exam = await ctx.service.createExam({ title: "Quiz", questions: [{ questionId: q1.id, points: 1 }] }, "teacher-1");
    await ctx.service.publishExam(exam.id, "teacher-1", false);
    const started = await ctx.service.startAttempt(exam.id, "student-1");
    if (!started.ok) throw new Error("setup failed");

    await ctx.service.submitAttempt(started.value.attemptId, "student-1", { answers: [{ questionId: q1.id, answer: "4" }] });
    const second = await ctx.service.submitAttempt(started.value.attemptId, "student-1", { answers: [] });

    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.error).toBeInstanceOf(ExamAttemptAlreadySubmittedError);
  });

  it("rejects submitting an attempt that belongs to a different user", async () => {
    const q1 = await makeQuestion(ctx.questionRepository, { correctAnswer: "4" });
    const exam = await ctx.service.createExam({ title: "Quiz", questions: [{ questionId: q1.id, points: 1 }] }, "teacher-1");
    await ctx.service.publishExam(exam.id, "teacher-1", false);
    const started = await ctx.service.startAttempt(exam.id, "student-1");
    if (!started.ok) throw new Error("setup failed");

    const result = await ctx.service.submitAttempt(started.value.attemptId, "student-2", { answers: [] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(InsufficientPermissionsError);
  });
});
