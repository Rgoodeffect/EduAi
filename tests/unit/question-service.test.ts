import { describe, it, expect, beforeEach } from "vitest";
import { QuestionService, QuestionGenerationParseError } from "@application/question/question-service";
import { EmbeddingService } from "@application/ai/embedding-service";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { DocumentNotFoundError, DocumentNotReadyError } from "@domain/document/errors/document-errors";
import { FakeQuestionRepository } from "./fakes/fake-question-repository";
import { FakeChunkRepository } from "./fakes/fake-chunk-repository";
import { FakeDocumentRepository } from "./fakes/fake-document-repository";
import { FakeEmbeddingRepository } from "./fakes/fake-embedding-repository";
import { FakeEmbeddingClient } from "./fakes/fake-embedding-client";
import { FakeVectorStore } from "./fakes/fake-vector-store";
import { FakeLlmClient } from "./fakes/fake-llm-client";
import { FakeUserActivityRepository } from "./fakes/fake-activity-repository";

const VALID_MC_RESPONSE = JSON.stringify({
  questions: [
    {
      prompt: "What pigment absorbs light in photosynthesis?",
      options: [
        { key: "A", text: "Chlorophyll" },
        { key: "B", text: "Melanin" },
        { key: "C", text: "Keratin" },
        { key: "D", text: "Collagen" },
      ],
      correctAnswer: "A",
      explanation: "Chlorophyll absorbs blue and red light.",
      tags: ["photosynthesis"],
    },
  ],
});

function buildService(responder?: (m: { role: string; content: string }[]) => string) {
  const questionRepository = new FakeQuestionRepository();
  const chunkRepository = new FakeChunkRepository();
  const documentRepository = new FakeDocumentRepository();
  const embeddingRepository = new FakeEmbeddingRepository();
  const embeddingClient = new FakeEmbeddingClient();
  const vectorStore = new FakeVectorStore();
  const embeddingService = new EmbeddingService(chunkRepository, embeddingRepository, embeddingClient, vectorStore);
  const llmClient = new FakeLlmClient(responder ?? (() => VALID_MC_RESPONSE));
  const activityRepository = new FakeUserActivityRepository();

  const service = new QuestionService(
    questionRepository,
    chunkRepository,
    documentRepository,
    embeddingService,
    llmClient,
    activityRepository,
  );
  return { service, questionRepository, chunkRepository, documentRepository, llmClient, activityRepository };
}

async function makeReadyDocument(documentRepository: FakeDocumentRepository) {
  const doc = await documentRepository.create({
    ownerId: "teacher-1",
    title: "Doc",
    fileName: "doc.pdf",
    storagePath: "documents/doc.pdf",
    mimeType: "application/pdf",
    fileSizeBytes: 100,
  });
  await documentRepository.updateStatus(doc.id, DocumentStatus.READY);
  return doc;
}

describe("QuestionService", () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it("rejects generation for a document that doesn't exist", async () => {
    const result = await ctx.service.generateQuestions(
      { documentId: "00000000-0000-0000-0000-000000000000", count: 1, type: "MULTIPLE_CHOICE", difficulty: "MEDIUM" },
      "teacher-1",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(DocumentNotFoundError);
  });

  it("rejects generation for a document that isn't READY", async () => {
    const doc = await ctx.documentRepository.create({
      ownerId: "teacher-1",
      title: "Doc",
      fileName: "doc.pdf",
      storagePath: "documents/doc.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 100,
    });
    const result = await ctx.service.generateQuestions(
      { documentId: doc.id, count: 1, type: "MULTIPLE_CHOICE", difficulty: "MEDIUM" },
      "teacher-1",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(DocumentNotReadyError);
  });

  it("generates and persists valid multiple-choice questions from a well-formed LLM response", async () => {
    const doc = await makeReadyDocument(ctx.documentRepository);
    await ctx.chunkRepository.createMany([
      { documentId: doc.id, chunkIndex: 0, content: "Photosynthesis uses chlorophyll to absorb light.", tokenCount: 20, pageNumber: null },
    ]);

    const result = await ctx.service.generateQuestions(
      { documentId: doc.id, count: 1, type: "MULTIPLE_CHOICE", difficulty: "MEDIUM" },
      "teacher-1",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    expect(result.value[0]!.prompt).toContain("photosynthesis");
    expect(result.value[0]!.options).toHaveLength(4);
    expect(result.value[0]!.correctAnswer).toBe("A");
    expect(ctx.activityRepository.records).toHaveLength(1);
  });

  it("returns a parse error when the LLM response isn't valid JSON", async () => {
    const { service, documentRepository, chunkRepository } = buildService(() => "not json at all");
    const doc = await makeReadyDocument(documentRepository);
    await chunkRepository.createMany([
      { documentId: doc.id, chunkIndex: 0, content: "Some content.", tokenCount: 10, pageNumber: null },
    ]);

    const result = await service.generateQuestions(
      { documentId: doc.id, count: 1, type: "MULTIPLE_CHOICE", difficulty: "MEDIUM" },
      "teacher-1",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(QuestionGenerationParseError);
  });

  it("returns a parse error when the LLM response doesn't match the expected schema", async () => {
    const { service, documentRepository, chunkRepository } = buildService(() => JSON.stringify({ notQuestions: [] }));
    const doc = await makeReadyDocument(documentRepository);
    await chunkRepository.createMany([
      { documentId: doc.id, chunkIndex: 0, content: "Some content.", tokenCount: 10, pageNumber: null },
    ]);

    const result = await service.generateQuestions(
      { documentId: doc.id, count: 1, type: "MULTIPLE_CHOICE", difficulty: "MEDIUM" },
      "teacher-1",
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(QuestionGenerationParseError);
  });

  it("creates a manual question without invoking the LLM", async () => {
    const question = await ctx.service.createManualQuestion(
      {
        documentId: null,
        type: "SHORT_ANSWER",
        difficulty: "EASY",
        prompt: "What is 2 + 2?",
        options: null,
        correctAnswer: "4",
        explanation: null,
        tags: ["math"],
      },
      "teacher-1",
    );

    expect(question.prompt).toBe("What is 2 + 2?");
    expect(ctx.llmClient.calls).toHaveLength(0);
  });

  it("hides the correct answer/explanation from non-privileged DTOs but includes them for privileged ones", async () => {
    const question = await ctx.service.createManualQuestion(
      {
        documentId: null,
        type: "SHORT_ANSWER",
        difficulty: "EASY",
        prompt: "What is 2 + 2?",
        options: null,
        correctAnswer: "4",
        explanation: "Basic addition.",
        tags: [],
      },
      "teacher-1",
    );

    const studentView = question.toDTO(false);
    const teacherView = question.toDTO(true);
    expect(studentView).not.toHaveProperty("correctAnswer");
    expect(teacherView).toHaveProperty("correctAnswer", "4");
  });

  it("lists and deletes questions", async () => {
    const doc = await makeReadyDocument(ctx.documentRepository);
    await ctx.chunkRepository.createMany([
      { documentId: doc.id, chunkIndex: 0, content: "Content.", tokenCount: 10, pageNumber: null },
    ]);
    const generated = await ctx.service.generateQuestions(
      { documentId: doc.id, count: 1, type: "MULTIPLE_CHOICE", difficulty: "MEDIUM" },
      "teacher-1",
    );
    if (!generated.ok) throw new Error("setup failed");

    const list = await ctx.service.listQuestions({ page: 1, pageSize: 10 }, { documentId: doc.id });
    expect(list.total).toBe(1);

    await ctx.service.deleteQuestion(generated.value[0]!.id);
    const listAfter = await ctx.service.listQuestions({ page: 1, pageSize: 10 }, { documentId: doc.id });
    expect(listAfter.total).toBe(0);
  });
});
