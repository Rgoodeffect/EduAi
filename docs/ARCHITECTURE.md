# Architecture

## Layering (Clean Architecture / DDD)

```
src/domain/            Entities, value objects, repository INTERFACES, domain errors.
                        No framework imports, no I/O. Pure business rules
                        (e.g. Question.isCorrect(), Exam.totalPoints(),
                        User.hasRole()).

src/application/        Use-case services (AuthService, DocumentService,
                        EmbeddingService, SummarizationService, QuestionService,
                        ExamService). Each depends only on domain repository
                        interfaces and "ports" (e.g. ILlmClient, IVectorStore,
                        IFileStorageService) — never on a concrete Prisma
                        client or the Ollama SDK directly. Returns
                        Result<T, DomainError> for expected failures instead
                        of throwing, so callers get typed, exhaustive error
                        handling instead of try/catch on stringly-typed errors.

src/infrastructure/     Concrete implementations of the above interfaces:
                        Prisma repositories, OllamaClient, ChromaVectorStore,
                        BullMQ queues/workers, JWT/password services, local
                        file storage — plus the DI container that wires
                        everything together.

src/app/                Next.js App Router: page routes (src/app/(app),
                        src/app/(auth)) and REST API routes (src/app/api/**).
                        Route handlers are thin: parse/validate input (zod),
                        call an application service via the DI container,
                        map the Result to an HTTP response.

src/components/         React components: components/ui (design-system
                        primitives), and feature folders (documents/,
                        questions/, exams/, admin/, layout/).
```

Dependency direction is strictly inward: `infrastructure` and `app` depend on `application`, which depends on `domain`. `domain` depends on nothing else in the codebase.

## Repository Pattern

Every aggregate (User, Document, Chunk, Embedding, Summary, Question, Exam, ExamAttempt, UserActivity, RefreshToken) has a repository **interface** in `src/domain/<aggregate>/repositories/`, and a Prisma-backed **implementation** in `src/infrastructure/database/repositories/`. Application services depend on the interface (constructor injection), which is what makes them unit-testable with in-memory fakes (see `tests/unit/fakes/`) instead of needing a real database for every test.

## Dependency Injection

`src/infrastructure/di/container.ts` is a small hand-rolled container: a class with lazy, memoized getters (`get documentService() { return this.singleton(...) }`). This is a deliberate choice over a reflection-based DI framework (InversifyJS, tsyringe, NestJS-style decorators):

- Next.js API routes are short-lived, serverless-style functions — there's no long-lived application object graph to manage, so DI-framework machinery (metadata reflection, module registration) buys little.
- Decorators complicate the Next.js/SWC build pipeline.
- A plain class with getters gives the same inversion of control (services declare their dependencies via constructor parameters; nothing reaches out and imports a concrete class directly) with zero extra dependencies and full type inference.

## RBAC

Three roles: `ADMIN`, `TEACHER`, `STUDENT` (`src/domain/user/value-objects/role-name.ts`). Enforced at two layers:

1. **Edge middleware** (`src/middleware.ts`) — UX-layer redirect: unauthenticated users get sent to `/login`; non-admins get redirected away from `/admin/*`. Runs in the Edge runtime, so it verifies the JWT with `jose` (Web Crypto) rather than the Node-only `jsonwebtoken` used elsewhere.
2. **API route guards** (`src/infrastructure/http/api-guard.ts`) — the actual enforcement. `withAuth`/`withRole` wrap route handlers, centralizing authentication + role checks so they're not reimplemented per route, with consistent JSON error responses via `handleApiError`.

Answer-key visibility (hiding `correctAnswer`/`explanation` from students) is decided in exactly one place: `Question.toDTO(includeAnswer)` on the domain entity. Every route/page that renders question data goes through this method rather than reading the entity's raw getters directly — see the Phase 7 commit for a real leak this caught (a page that briefly read `question.correctAnswer` off the entity instead of `toDTO(false)`, which would have exposed answers to students in server-rendered HTML).

## Async job pipeline

PDF processing, embedding, summarization, and question generation all run as BullMQ jobs in a **separate worker process** (`npm run worker` / the `worker` Docker service), not inline in API routes:

```
Upload (POST /api/documents)
  → Document status: UPLOADED
  → enqueue "document-processing"
       → extract text (unpdf) + chunk (ChunkingEngine)
       → status: PROCESSING → CHUNKING
       → enqueue "embedding-generation"
            → embed each chunk (OllamaClient, batched) → store vectors (ChromaDB) + metadata (Postgres)
            → status: EMBEDDING → READY  (or FAILED, with the error persisted, at any stage)

Summarize (POST /api/documents/[id]/summary)
  → enqueue "summarization" → LLM call (single-shot or map-reduce for long docs) → Summary row
  → client polls GET for the result

Generate questions (POST /api/documents/[id]/questions)
  → enqueue "question-generation" → RAG-scoped or sampled context → LLM call with a strict JSON
    contract → zod-validated → Question rows
  → client polls GET for the results
```

Reasons for this split rather than doing the work inline in the request:

- LLM calls can take anywhere from seconds to a minute+; holding open an HTTP request that long is fragile (proxy/gateway timeouts) and blocks the Node event loop from serving other requests.
- Retries/backoff (BullMQ's `attempts` + exponential `backoff`) are a natural fit for "external service occasionally flakes" failure modes.
- The worker can be scaled independently of the web tier.

## AI pipeline specifics

- **Chunking**: sentence-aligned (not naive character-count slicing), with configurable overlap so context isn't lost at chunk boundaries. Token counts are a documented ~4-chars/token heuristic (`estimateTokenCount`) since there's no client-side tokenizer for Qwen3 available from Node — good enough for sizing chunks/prompts; the actual LLM call still enforces its own context limit.
- **Embeddings**: one ChromaDB collection (`<CHROMA_COLLECTION_PREFIX>_chunks`) shared across all documents, scoped per query via a `documentId` metadata filter — simpler operationally than one collection per document.
- **Retrieval for question generation**: RAG search (`EmbeddingService.searchSimilarChunks`) when a `topic` is given; otherwise an evenly-spaced sample of the document's chunks within a token budget, for broad coverage without exceeding the model's practical context.
- **Question generation contract**: the LLM is instructed (via `format: "json"` on the Ollama chat call) to return a specific JSON shape; the response is parsed and validated with zod (`generatedQuestionsResponseSchema`) before any database write. A malformed or off-contract response surfaces as a typed `QuestionGenerationParseError` rather than corrupting the question bank.
- **Exam auto-generation** does *not* call the LLM — it randomly samples matching questions already in the bank (Fisher-Yates shuffle), since the questions already exist from the generation engine or manual authoring.

## Why `unpdf` instead of `pdf-parse`

The original plan used `pdf-parse`, but its vendored `pdf.js` (v1.10.100, unmaintained since 2020) threw `bad XRef entry` on well-formed PDFs from multiple generators during testing — confirmed this wasn't a fixture problem before switching to `unpdf`, an actively maintained wrapper around current `pdfjs-dist` built for Node/serverless use.
