# Installation Guide

Two supported paths: **Docker Compose** (everything containerized, closest to production) and **local dev** (Postgres/Redis/ChromaDB/Ollama in containers, Next.js + the worker running directly on your machine for fast iteration).

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- ~8GB free disk space and enough RAM to run Qwen3 8B via Ollama (16GB+ system RAM recommended; a GPU is optional but speeds up inference significantly)

## Option A: Full Docker Compose stack

```bash
git clone <your-fork-url> eduai
cd eduai
cp .env.example .env.docker   # .env.docker is already provided with container-network hostnames; edit secrets if needed
docker compose up -d --build
```

This starts:

- `postgres` (5432), `redis` (6379), `chromadb` (8000), `ollama` (11434)
- `ollama-init` — a one-shot job that runs `ollama pull qwen3:8b && ollama pull nomic-embed-text` the first time you start the stack (this downloads several GB; it can take a while on first run)
- `app` — the Next.js server (3000)
- `worker` — the background job processor (PDF processing, embeddings, summarization, question generation)

Then apply migrations and seed data (from your host, using the same DATABASE_URL as the containers via port 5432):

```bash
cp .env.example .env   # host-side .env pointing at localhost, for running Prisma CLI commands
npx prisma migrate deploy
npm run db:seed
```

Visit `http://localhost:3000`.

**Before deploying for real:** change `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` in `.env.docker` to strong random values (`openssl rand -base64 48`), and change the Postgres password.

## Option B: Local development

Faster iteration: only the backing services run in Docker; the Next.js app and worker run directly on your host with hot reload.

```bash
git clone <your-fork-url> eduai
cd eduai
npm install
cp .env.example .env

docker compose -f docker-compose.dev.yml up -d
```

Pull the required Ollama models (the dev compose file doesn't auto-pull, unlike the full stack's `ollama-init` job):

```bash
docker exec -it eduai-dev-ollama-1 ollama pull qwen3:8b
docker exec -it eduai-dev-ollama-1 ollama pull nomic-embed-text
```

Apply migrations and seed:

```bash
npx prisma migrate deploy
npm run db:seed
```

Run the app and worker (two terminals):

```bash
npm run dev       # Next.js on http://localhost:3000
npm run worker     # BullMQ worker — required for PDF processing, summaries, and question/exam generation to complete
```

> The worker is a separate process from the Next.js app on purpose — see [ARCHITECTURE.md](ARCHITECTURE.md#async-job-pipeline). Uploads, summaries, and question generation will sit in "processing"/"queued" state forever without it running.

## Environment variables

All variables are documented in `.env.example`, validated at startup via a zod schema (`src/infrastructure/config/env.ts`). Key ones:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `REDIS_URL` | Redis connection string (BullMQ + rate limiting) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | HMAC secrets for access/refresh tokens — **must** be changed for any non-local deployment |
| `STORAGE_LOCAL_PATH` | Where uploaded PDFs are stored on disk |
| `OLLAMA_BASE_URL` / `OLLAMA_CHAT_MODEL` / `OLLAMA_EMBEDDING_MODEL` | Local LLM endpoint and model names |
| `CHROMA_URL` / `CHROMA_COLLECTION_PREFIX` | ChromaDB endpoint and collection naming |
| `CHUNK_SIZE_TOKENS` / `CHUNK_OVERLAP_TOKENS` | Chunking engine tuning |

## Database migrations

Migrations live in `prisma/migrations/`. To create a new one after changing `prisma/schema.prisma`:

```bash
npx prisma migrate dev --name <description>
```

In production/CI, apply existing migrations without generating new ones:

```bash
npx prisma migrate deploy
```

## Running tests

```bash
npm run typecheck
npm run lint
npm test
```

The test suite (`tests/unit/**`) uses in-memory fakes for repositories/external services and needs no infrastructure running, **except**:

- `tests/unit/ollama-client.test.ts` spins up its own local mock HTTP server — no real Ollama needed.
- `tests/integration/chroma-vector-store.test.ts` talks to a **real** ChromaDB instance at `CHROMA_URL` (default `http://localhost:8000`). If it's unreachable, this suite self-skips (`describe.skipIf`) rather than failing — start `docker compose -f docker-compose.dev.yml up -d chromadb` first if you want it to actually run.

There is intentionally no test suite that requires a real Ollama/Qwen3 instance — application code talks to Ollama only through the `ILlmClient`/`IEmbeddingClient` ports, and `OllamaClient`'s HTTP contract is verified against a mock server instead.

## Troubleshooting

- **Uploads stuck in `UPLOADED`/`PROCESSING` forever**: the worker process (`npm run worker` or the `worker` Docker service) isn't running.
- **Summary/question generation stuck in "queued"**: same as above, plus check the worker's logs for Ollama connection errors (`OLLAMA_BASE_URL` unreachable, or the model hasn't been pulled yet).
- **"Invalid environment configuration" on startup**: one of the required env vars is missing — check against `.env.example`.
- **Login/session issues after editing `.env` while `next dev` is already running**: restart the dev server. Next.js inlines some environment variables (notably ones read directly in Edge Middleware) at compile time; a hot-reloaded `.env` doesn't always retroactively fix an already-compiled middleware bundle.
