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
}

export const container = new Container();
