import { describe, it, expect, beforeEach } from "vitest";
import { SummarizationService } from "@application/ai/summarization-service";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { DocumentNotFoundError, DocumentNotReadyError } from "@domain/document/errors/document-errors";
import { FakeChunkRepository } from "./fakes/fake-chunk-repository";
import { FakeSummaryRepository } from "./fakes/fake-summary-repository";
import { FakeDocumentRepository } from "./fakes/fake-document-repository";
import { FakeLlmClient } from "./fakes/fake-llm-client";
import { FakeUserActivityRepository } from "./fakes/fake-activity-repository";

function buildService(responder?: (messages: { role: string; content: string }[]) => string) {
  const chunkRepository = new FakeChunkRepository();
  const summaryRepository = new FakeSummaryRepository();
  const documentRepository = new FakeDocumentRepository();
  const llmClient = new FakeLlmClient(responder);
  const activityRepository = new FakeUserActivityRepository();
  const service = new SummarizationService(
    chunkRepository,
    summaryRepository,
    documentRepository,
    llmClient,
    activityRepository,
  );
  return { service, chunkRepository, summaryRepository, documentRepository, llmClient, activityRepository };
}

describe("SummarizationService", () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it("rejects summarizing a document that doesn't exist", async () => {
    const result = await ctx.service.summarizeDocument("missing-doc", "user-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(DocumentNotFoundError);
  });

  it("rejects summarizing a document that isn't READY yet", async () => {
    const doc = await ctx.documentRepository.create({
      ownerId: "teacher-1",
      title: "Doc",
      fileName: "doc.pdf",
      storagePath: "documents/doc.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 100,
    });
    // still UPLOADED by default — never transitioned to READY
    const result = await ctx.service.summarizeDocument(doc.id, "user-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(DocumentNotReadyError);
  });

  it("summarizes a small document in a single LLM call", async () => {
    const doc = await ctx.documentRepository.create({
      ownerId: "teacher-1",
      title: "Small Doc",
      fileName: "doc.pdf",
      storagePath: "documents/doc.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 100,
    });
    await ctx.documentRepository.updateStatus(doc.id, DocumentStatus.READY);
    await ctx.chunkRepository.createMany([
      { documentId: doc.id, chunkIndex: 0, content: "Short chunk one.", tokenCount: 50, pageNumber: null },
      { documentId: doc.id, chunkIndex: 1, content: "Short chunk two.", tokenCount: 50, pageNumber: null },
    ]);

    const result = await ctx.service.summarizeDocument(doc.id, "teacher-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.content).toBe("Fake summary response.");
    expect(ctx.llmClient.calls).toHaveLength(1); // single direct call, no map-reduce
    expect(ctx.activityRepository.records).toHaveLength(1);

    const latest = await ctx.service.getLatestSummary(doc.id);
    expect(latest?.id).toBe(result.value.id);
  });

  it("map-reduces a large document into batch summaries plus one combine call", async () => {
    let callCount = 0;
    const { service, documentRepository, chunkRepository, llmClient } = buildService(() => {
      callCount += 1;
      return `Summary #${callCount}`;
    });

    const doc = await documentRepository.create({
      ownerId: "teacher-1",
      title: "Huge Doc",
      fileName: "doc.pdf",
      storagePath: "documents/doc.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 100,
    });
    await documentRepository.updateStatus(doc.id, DocumentStatus.READY);

    // 3 chunks of 4000 tokens each = 12000 tokens, well above the 6000-token direct budget,
    // and each pair would exceed the budget too, forcing multiple batches.
    await chunkRepository.createMany([
      { documentId: doc.id, chunkIndex: 0, content: "A".repeat(100), tokenCount: 4000, pageNumber: null },
      { documentId: doc.id, chunkIndex: 1, content: "B".repeat(100), tokenCount: 4000, pageNumber: null },
      { documentId: doc.id, chunkIndex: 2, content: "C".repeat(100), tokenCount: 4000, pageNumber: null },
    ]);

    const result = await service.summarizeDocument(doc.id, "teacher-1");
    expect(result.ok).toBe(true);
    // At least 2 batch summaries + 1 combine call.
    expect(llmClient.calls.length).toBeGreaterThanOrEqual(3);
  });
});
