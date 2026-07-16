import { prisma } from "@infrastructure/database/prisma-client";
import { PrismaUserRepository } from "@infrastructure/database/repositories/prisma-user-repository";
import { PrismaDocumentRepository } from "@infrastructure/database/repositories/prisma-document-repository";
import { PrismaChunkRepository } from "@infrastructure/database/repositories/prisma-chunk-repository";
import { PrismaEmbeddingRepository } from "@infrastructure/database/repositories/prisma-embedding-repository";
import { PrismaSummaryRepository } from "@infrastructure/database/repositories/prisma-summary-repository";
import { PrismaQuestionRepository } from "@infrastructure/database/repositories/prisma-question-repository";
import { PrismaExamRepository } from "@infrastructure/database/repositories/prisma-exam-repository";
import { PrismaExamAttemptRepository } from "@infrastructure/database/repositories/prisma-exam-attempt-repository";
import { PrismaUserActivityRepository } from "@infrastructure/database/repositories/prisma-activity-repository";
import { PrismaRefreshTokenRepository } from "@infrastructure/database/repositories/prisma-refresh-token-repository";
import { PasswordService } from "@infrastructure/auth/password-service";
import { JwtService } from "@infrastructure/auth/jwt-service";
import { AuthService } from "@application/auth/auth-service";
import { LocalFileStorageService } from "@infrastructure/storage/local-file-storage";
import { PdfTextExtractor } from "@infrastructure/storage/pdf-extractor";
import { ChunkingEngine } from "@domain/chunk/services/chunking-engine";
import { BullDocumentProcessingQueue } from "@infrastructure/queue/queues/document-processing.queue";
import { DocumentService } from "@application/document/document-service";
import { OllamaClient } from "@infrastructure/ai/ollama-client";
import { ChromaVectorStore } from "@infrastructure/ai/chroma-vector-store";
import { EmbeddingService } from "@application/ai/embedding-service";
import { BullEmbeddingQueue } from "@infrastructure/queue/queues/embedding.queue";
import { SummarizationService } from "@application/ai/summarization-service";
import { BullSummarizationQueue } from "@infrastructure/queue/queues/summarization.queue";

/**
 * Lightweight, hand-rolled Dependency Injection container.
 *
 * Next.js API routes run as short-lived serverless-style functions, so a
 * heavyweight reflection-based DI framework (InversifyJS, tsyringe) buys
 * little: there is no long-lived object graph to manage, and decorators
 * complicate the Next.js/SWC build pipeline. Instead we use explicit,
 * type-safe factory functions with singleton caching — the same inversion
 * of control, without the metadata reflection machinery.
 *
 * Application services obtain their dependencies (repositories, external
 * clients) through this container rather than importing concrete classes
 * directly, which keeps them testable via constructor injection.
 */
class Container {
  private instances = new Map<string, unknown>();

  private singleton<T>(key: string, factory: () => T): T {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory());
    }
    return this.instances.get(key) as T;
  }

  get userRepository() {
    return this.singleton("userRepository", () => new PrismaUserRepository(prisma));
  }

  get documentRepository() {
    return this.singleton("documentRepository", () => new PrismaDocumentRepository(prisma));
  }

  get chunkRepository() {
    return this.singleton("chunkRepository", () => new PrismaChunkRepository(prisma));
  }

  get embeddingRepository() {
    return this.singleton("embeddingRepository", () => new PrismaEmbeddingRepository(prisma));
  }

  get summaryRepository() {
    return this.singleton("summaryRepository", () => new PrismaSummaryRepository(prisma));
  }

  get questionRepository() {
    return this.singleton("questionRepository", () => new PrismaQuestionRepository(prisma));
  }

  get examRepository() {
    return this.singleton("examRepository", () => new PrismaExamRepository(prisma));
  }

  get examAttemptRepository() {
    return this.singleton("examAttemptRepository", () => new PrismaExamAttemptRepository(prisma));
  }

  get activityRepository() {
    return this.singleton("activityRepository", () => new PrismaUserActivityRepository(prisma));
  }

  get refreshTokenRepository() {
    return this.singleton("refreshTokenRepository", () => new PrismaRefreshTokenRepository(prisma));
  }

  get passwordService() {
    return this.singleton("passwordService", () => new PasswordService());
  }

  get jwtService() {
    return this.singleton("jwtService", () => new JwtService());
  }

  get authService() {
    return this.singleton(
      "authService",
      () =>
        new AuthService(
          this.userRepository,
          this.refreshTokenRepository,
          this.activityRepository,
          this.passwordService,
          this.jwtService,
        ),
    );
  }

  get fileStorageService() {
    return this.singleton("fileStorageService", () => new LocalFileStorageService());
  }

  get pdfExtractor() {
    return this.singleton("pdfExtractor", () => new PdfTextExtractor());
  }

  get chunkingEngine() {
    return this.singleton("chunkingEngine", () => new ChunkingEngine());
  }

  get documentProcessingQueue() {
    return this.singleton("documentProcessingQueue", () => new BullDocumentProcessingQueue());
  }

  get documentService() {
    return this.singleton(
      "documentService",
      () =>
        new DocumentService(
          this.documentRepository,
          this.chunkRepository,
          this.fileStorageService,
          this.documentProcessingQueue,
          this.activityRepository,
        ),
    );
  }

  get ollamaClient() {
    return this.singleton("ollamaClient", () => new OllamaClient());
  }

  get vectorStore() {
    return this.singleton("vectorStore", () => new ChromaVectorStore());
  }

  get embeddingQueue() {
    return this.singleton("embeddingQueue", () => new BullEmbeddingQueue());
  }

  get embeddingService() {
    return this.singleton(
      "embeddingService",
      () =>
        new EmbeddingService(this.chunkRepository, this.embeddingRepository, this.ollamaClient, this.vectorStore),
    );
  }

  get summarizationService() {
    return this.singleton(
      "summarizationService",
      () =>
        new SummarizationService(
          this.chunkRepository,
          this.summaryRepository,
          this.documentRepository,
          this.ollamaClient,
          this.activityRepository,
        ),
    );
  }

  get summarizationQueue() {
    return this.singleton("summarizationQueue", () => new BullSummarizationQueue());
  }
}

export const container = new Container();
