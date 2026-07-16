import { describe, it, expect, beforeEach } from "vitest";
import { EmbeddingService, chunksCollectionName } from "@application/ai/embedding-service";
import { FakeChunkRepository } from "./fakes/fake-chunk-repository";
import { FakeEmbeddingRepository } from "./fakes/fake-embedding-repository";
import { FakeEmbeddingClient } from "./fakes/fake-embedding-client";
import { FakeVectorStore } from "./fakes/fake-vector-store";

function buildService() {
  const chunkRepository = new FakeChunkRepository();
  const embeddingRepository = new FakeEmbeddingRepository();
  const embeddingClient = new FakeEmbeddingClient();
  const vectorStore = new FakeVectorStore();
  const service = new EmbeddingService(chunkRepository, embeddingRepository, embeddingClient, vectorStore);
  return { service, chunkRepository, embeddingRepository, embeddingClient, vectorStore };
}

describe("EmbeddingService", () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it("returns 0 and does nothing for a document with no chunks", async () => {
    const count = await ctx.service.embedDocument("doc-empty");
    expect(count).toBe(0);
    expect(ctx.embeddingClient.calls).toHaveLength(0);
  });

  it("embeds every chunk of a document in one batch call and persists metadata + vectors", async () => {
    await ctx.chunkRepository.createMany([
      { documentId: "doc-1", chunkIndex: 0, content: "Photosynthesis intro.", tokenCount: 5, pageNumber: null },
      { documentId: "doc-1", chunkIndex: 1, content: "Cellular respiration intro.", tokenCount: 5, pageNumber: null },
    ]);

    const count = await ctx.service.embedDocument("doc-1");

    expect(count).toBe(2);
    expect(ctx.embeddingClient.calls).toHaveLength(1); // one batch call, not N calls
    expect(ctx.embeddingClient.calls[0]).toHaveLength(2);

    const results = await ctx.vectorStore.query(chunksCollectionName(), [0, 0, 0], 10, { documentId: "doc-1" });
    expect(results).toHaveLength(2);
  });

  it("finds the most similar chunks for a document, scoped by documentId", async () => {
    await ctx.chunkRepository.createMany([
      { documentId: "doc-1", chunkIndex: 0, content: "Photosynthesis converts light to energy.", tokenCount: 6, pageNumber: null },
    ]);
    await ctx.chunkRepository.createMany([
      { documentId: "doc-2", chunkIndex: 0, content: "Unrelated chunk from another document.", tokenCount: 6, pageNumber: null },
    ]);

    await ctx.service.embedDocument("doc-1");
    await ctx.service.embedDocument("doc-2");

    const results = await ctx.service.searchSimilarChunks("doc-1", "What is photosynthesis?", 5);
    expect(results.every((r) => r.metadata.documentId === "doc-1")).toBe(true);
  });
});
