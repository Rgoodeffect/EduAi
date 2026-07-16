import { Chunk } from "@domain/chunk/entities/chunk";
import { IChunkRepository } from "@domain/chunk/repositories/chunk-repository";
import { ISummaryRepository } from "@domain/summary/repositories/summary-repository";
import { IDocumentRepository } from "@domain/document/repositories/document-repository";
import { Summary } from "@domain/summary/entities/summary";
import { DocumentNotFoundError, DocumentNotReadyError } from "@domain/document/errors/document-errors";
import { IUserActivityRepository } from "@domain/activity/repositories/activity-repository";
import { ActivityType } from "@domain/activity/entities/user-activity";
import { Result } from "@domain/shared/result";
import { ILlmClient } from "@application/ai/ports/llm-client.port";
import { getEnv } from "@infrastructure/config/env";

const SUMMARY_SYSTEM_PROMPT =
  "You are an expert educational content summarizer. Produce a clear, well-structured summary of " +
  "the given course material using markdown headings and bullet points where helpful. Focus on key " +
  "concepts, definitions, and takeaways a student should remember. Do not invent information that " +
  "isn't in the source material.";

/**
 * Map-reduce budget: a conservative token ceiling for a single chat
 * completion call. Documents whose chunks exceed this are summarized in
 * batches ("map"), and the batch summaries are combined into one final
 * summary ("reduce") rather than sent to the LLM in a single oversized call.
 */
const MAX_DIRECT_TOKENS = 6000;

export class SummarizationService {
  constructor(
    private readonly chunkRepository: IChunkRepository,
    private readonly summaryRepository: ISummaryRepository,
    private readonly documentRepository: IDocumentRepository,
    private readonly llmClient: ILlmClient,
    private readonly activityRepository: IUserActivityRepository,
  ) {}

  async summarizeDocument(
    documentId: string,
    requestedById: string,
  ): Promise<Result<Summary, DocumentNotFoundError | DocumentNotReadyError>> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) return Result.fail(new DocumentNotFoundError(documentId));
    if (!document.isReady()) return Result.fail(new DocumentNotReadyError(document.status));

    const chunks = await this.chunkRepository.listByDocument(documentId);
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);

    const summaryText =
      totalTokens <= MAX_DIRECT_TOKENS
        ? await this.summarizeText(chunks.map((c) => c.content).join("\n\n"))
        : await this.mapReduceSummarize(chunks);

    const summary = await this.summaryRepository.create({
      documentId,
      createdById: requestedById,
      content: summaryText,
      model: getEnv().OLLAMA_CHAT_MODEL,
    });

    await this.activityRepository.record({
      userId: requestedById,
      type: ActivityType.SUMMARY_GENERATED,
      metadata: { documentId, summaryId: summary.id },
    });

    return Result.ok(summary);
  }

  async getLatestSummary(documentId: string): Promise<Summary | null> {
    return this.summaryRepository.findLatestByDocument(documentId);
  }

  private async summarizeText(text: string): Promise<string> {
    return this.llmClient.chatCompletion(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      { temperature: 0.3 },
    );
  }

  private async mapReduceSummarize(chunks: Chunk[]): Promise<string> {
    const batches = this.batchByTokenBudget(chunks, MAX_DIRECT_TOKENS);
    const partialSummaries = await Promise.all(
      batches.map((batch) => this.summarizeText(batch.map((c) => c.content).join("\n\n"))),
    );

    const combinePrompt =
      "The following are section-by-section summaries of a single longer document, in order. " +
      "Combine them into one cohesive overall summary without repeating yourself:\n\n" +
      partialSummaries.map((s, i) => `## Section ${i + 1}\n${s}`).join("\n\n");

    return this.summarizeText(combinePrompt);
  }

  private batchByTokenBudget(chunks: Chunk[], maxTokens: number): Chunk[][] {
    const batches: Chunk[][] = [];
    let current: Chunk[] = [];
    let currentTokens = 0;

    for (const chunk of chunks) {
      if (currentTokens + chunk.tokenCount > maxTokens && current.length > 0) {
        batches.push(current);
        current = [];
        currentTokens = 0;
      }
      current.push(chunk);
      currentTokens += chunk.tokenCount;
    }
    if (current.length > 0) batches.push(current);
    return batches;
  }
}
