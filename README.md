# EduAi

A production-oriented educational AI platform: upload PDF course material, and get local-LLM-powered summaries, generated questions, and auto-assembled exams — with no paid or external AI APIs. Everything (inference, embeddings, vector search) runs against services you host yourself (Ollama + Qwen3, ChromaDB).

## Feature overview

| Area | What it does |
|---|---|
| **User management** | JWT auth (access + rotating refresh tokens), role-based access control (Admin / Teacher / Student), admin user management (roles, activate/deactivate) |
| **PDF upload & processing** | Teachers/admins upload PDFs; a background pipeline extracts text, chunks it, embeds it, and reports live status |
| **Chunking engine** | Sentence-aligned, overlapping chunking sized to a token budget |
| **Embedding engine** | Local embeddings via Ollama (`nomic-embed-text` by default), stored in ChromaDB |
| **Summarization engine** | Single-shot or map-reduce (for long documents) summarization via a local chat model |
| **Question generation engine** | RAG-scoped or whole-document generation of MCQ / True-False / Short answer / Essay / Fill-in-the-blank questions, validated against a strict JSON contract before anything is persisted |
| **Question Bank** | Browse, filter, manually author, and curate questions independent of any single document |
| **Exam generation engine** | Auto-assemble exams by sampling the question bank, or hand-pick questions; publish/archive lifecycle; timed taking UI; automatic grading |
| **Dashboard** | Role-aware dashboards (staff: content stats; students: available exams + attempt history); an admin dashboard with platform-wide stats and an activity feed |

## Tech stack

- **Next.js 15** (App Router) + **React** + **TypeScript**, **TailwindCSS**
- **PostgreSQL** + **Prisma ORM**
- **Redis** + **BullMQ** (background job queues)
- **Ollama** running **Qwen3 8B** (chat) and **nomic-embed-text** (embeddings) — 100% local, no paid APIs
- **ChromaDB** (vector store)
- **Vitest** for unit/integration tests

## Architecture

Clean Architecture / DDD, organized as:

```
src/
  domain/           # Entities, value objects, repository interfaces, domain errors. Zero I/O.
  application/       # Use-case services (orchestrate domain + infrastructure via ports/interfaces)
  infrastructure/     # Prisma repos, Ollama/Chroma clients, BullMQ queues/workers, JWT/auth, DI container
  app/                # Next.js App Router: pages (src/app/(app), src/app/(auth)) and REST API routes (src/app/api)
  components/         # React components (UI primitives + feature components)
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full breakdown (layering rules, the DI container, the async job pipeline, RBAC design).

## Quick start

See **[docs/INSTALLATION.md](docs/INSTALLATION.md)** for full setup instructions (Docker Compose and local-dev paths). The short version:

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # postgres, redis, chromadb, ollama
ollama pull qwen3:8b && ollama pull nomic-embed-text   # or let ollama-init do this in the full compose stack

npm install
npx prisma migrate deploy
npm run db:seed        # demo users + a sample question bank + a published exam
npm run dev             # Next.js app on :3000
npm run worker           # in a second terminal — runs the PDF/embedding/summarization/question-generation pipeline
```

Demo accounts (from `npm run db:seed`):

| Role | Email | Password |
|---|---|---|
| Admin | `admin@eduai.local` | `Admin123!` |
| Teacher | `teacher@eduai.local` | `Teacher123!` |
| Student | `student@eduai.local` | `Student123!` |

## Testing

```bash
npm run typecheck
npm run lint
npm test              # unit tests (fakes/mocks only) + a ChromaDB integration suite that self-skips if Chroma isn't reachable
```

64 tests across auth, document processing/chunking, the AI pipeline (Ollama client + embeddings + summarization), question generation, and exam generation. See [docs/INSTALLATION.md](docs/INSTALLATION.md#running-tests) for details on what requires live infrastructure vs. what's pure unit tests.

## Deployment

`docker-compose.yml` runs the full stack (Postgres, Redis, ChromaDB, Ollama with automatic model pulling, the Next.js app, and the background worker) — see [docs/INSTALLATION.md](docs/INSTALLATION.md) for details.
