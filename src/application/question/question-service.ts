import { Chunk } from "@domain/chunk/entities/chunk";
import { Question } from "@domain/question/entities/question";
import { IQuestionRepository, QuestionFilter } from "@domain/question/repositories/question-repository";
import { IChunkRepository } from "@domain/chunk/repositories/chunk-repository";
import { IDocumentRepository } from "@domain/document/repositories/document-repository";
import { DocumentNotFoundError, DocumentNotReadyError } from "@domain/document/errors/document-errors";
import { IUserActivityRepository } from "@domain/activity/repositories/activity-repository";
import { ActivityType } from "@domain/activity/entities/user-activity";
import { Result } from "@domain/shared/result";
import { PageRequest, PageResult } from "@domain/shared/pagination";
import { ILlmClient } from "@application/ai/ports/llm-client.port";
import { EmbeddingService } from "@application/ai/embedding-service";
import {
  GenerateQuestionsInput,
  CreateManualQuestionInput,
  GeneratedQuestionItem,
  generatedQuestionsResponseSchema,
} from "@application/question/dto";
import { buildQuestionGenerationMessages } from "@application/question/question-generation-prompt";
import { getEnv } from "@infrastructure/config/env";

const CONTEXT_TOKEN_BUDGET = 6000;

export class QuestionGenerationParseError extends Error {
  constructor(raw: string) {
    super(`LLM response was not valid question JSON: ${raw.slice(0, 300)}`);
    this.name = "QuestionGenerationParseError";
  }
}

export class QuestionService {
  constructor(
    private readonly questionRepository: IQuestionRepository,
    private readonly chunkRepository: IChunkRepository,
    private readonly documentRepository: IDocumentRepository,
    private readonly embeddingService: EmbeddingService,
    private readonly llmClient: ILlmClient,
    private readonly activityRepository: IUserActivityRepository,
  ) {}

  async generateQuestions(
    input: GenerateQuestionsInput,
    createdById: string,
  ): Promise<Result<Question[], DocumentNotFoundError | DocumentNotReadyError | QuestionGenerationParseError>> {
    const document = await this.documentRepository.findById(input.documentId);
    if (!document) return Result.fail(new DocumentNotFoundError(input.documentId));
    if (!document.isReady()) return Result.fail(new DocumentNotReadyError(document.status));

    const contextChunks = await this.gatherContext(input.documentId, input.topic);
    const contextText = contextChunks.map((c) => c.content).join("\n\n");

    const messages = buildQuestionGenerationMessages({
      contextText,
      count: input.count,
      type: input.type,
      difficulty: input.difficulty,
      topic: input.topic,
    });

    const raw = await this.llmClient.chatCompletion(messages, { temperature: 0.5, jsonMode: true });

    const parsed = this.parseGeneratedQuestions(raw);
    if (!parsed.ok) return Result.fail(parsed.error);

    const env = getEnv();
    const primaryChunkId = contextChunks[0]?.id ?? null;

    const created = await this.questionRepository.createMany(
      parsed.value.map((item) => ({
        documentId: input.documentId,
        chunkId: primaryChunkId,
        createdById,
        type: input.type,
        difficulty: input.difficulty,
        prompt: item.prompt,
        options: item.options ?? null,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation ?? null,
        tags: item.tags ?? [],
        model: env.OLLAMA_CHAT_MODEL,
      })),
    );

    await this.activityRepository.record({
      userId: createdById,
      type: ActivityType.QUESTION_GENERATED,
      metadata: { documentId: input.documentId, count: created.length, type: input.type, difficulty: input.difficulty },
    });

    return Result.ok(created);
  }

  async createManualQuestion(input: CreateManualQuestionInput, createdById: string): Promise<Question> {
    return this.questionRepository.create({
      documentId: input.documentId ?? null,
      chunkId: null,
      createdById,
      type: input.type,
      difficulty: input.difficulty,
      prompt: input.prompt,
      options: input.options ?? null,
      correctAnswer: input.correctAnswer,
      explanation: input.explanation ?? null,
      tags: input.tags,
      model: null,
    });
  }

  async getQuestion(id: string): Promise<Question | null> {
    return this.questionRepository.findById(id);
  }

  async listQuestions(page: PageRequest, filter?: QuestionFilter): Promise<PageResult<Question>> {
    return this.questionRepository.list(page, filter);
  }

  async deleteQuestion(id: string): Promise<void> {
    await this.questionRepository.delete(id);
  }

  /** Retrieves representative context for generation: RAG search when a topic is given, else a token-budgeted sample spanning the whole document. */
  private async gatherContext(documentId: string, topic?: string): Promise<Chunk[]> {
    if (topic) {
      const matches = await this.embeddingService.searchSimilarChunks(documentId, topic, 8);
      if (matches.length > 0) {
        const chunkIds = matches
          .map((m) => (typeof m.metadata.chunkId === "string" ? m.metadata.chunkId : null))
          .filter((id): id is string => id !== null);
        const chunks = await this.chunkRepository.findManyByIds(chunkIds);
        if (chunks.length > 0) return chunks;
      }
    }

    const allChunks = await this.chunkRepository.listByDocument(documentId);
    return this.sampleWithinBudget(allChunks, CONTEXT_TOKEN_BUDGET);
  }

  private sampleWithinBudget(chunks: Chunk[], maxTokens: number): Chunk[] {
    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    if (totalTokens <= maxTokens || chunks.length === 0) return chunks;

    const avgTokens = totalTokens / chunks.length;
    const targetCount = Math.max(1, Math.floor(maxTokens / avgTokens));
    const stride = chunks.length / targetCount;

    const seen = new Set<number>();
    const sampled: Chunk[] = [];
    for (let i = 0; i < targetCount; i++) {
      const index = Math.min(chunks.length - 1, Math.floor(i * stride));
      if (seen.has(index)) continue;
      seen.add(index);
      sampled.push(chunks[index]!);
    }
    return sampled;
  }

  private parseGeneratedQuestions(
    raw: string,
  ): Result<GeneratedQuestionItem[], QuestionGenerationParseError> {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return Result.fail(new QuestionGenerationParseError(raw));
    }

    const result = generatedQuestionsResponseSchema.safeParse(json);
    if (!result.success) {
      return Result.fail(new QuestionGenerationParseError(raw));
    }
    return Result.ok(result.data.questions);
  }
}
