import { describe, it, expect } from "vitest";
import { ChromaVectorStore } from "@infrastructure/ai/chroma-vector-store";

/**
 * Integration test against a real ChromaDB instance (see docker-compose.dev.yml
 * or `chroma run`). Skips itself when CHROMA_URL isn't reachable so `npm test`
 * stays green in environments without the backing services running — but
 * this suite is what actually proves the vector store contract works, not
 * just that the interface compiles.
 */
const CHROMA_URL = process.env.CHROMA_URL ?? "http://localhost:8000";

async function isChromaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${CHROMA_URL}/api/v2/heartbeat`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

const chromaAvailable = await isChromaReachable();
if (!chromaAvailable) {
  console.warn(`Skipping ChromaVectorStore integration tests: ${CHROMA_URL} is not reachable.`);
}

describe.skipIf(!chromaAvailable)("ChromaVectorStore (integration)", () => {
  const collectionName = `eduai_test_${Date.now()}`;
  const store = new ChromaVectorStore();

  it("upserts vectors and returns the nearest neighbors on query", async () => {
    await store.upsert(collectionName, [
      { id: "c1", vector: [1, 0, 0], document: "chunk about photosynthesis", metadata: { documentId: "doc-1", chunkIndex: 0 } },
      { id: "c2", vector: [0, 1, 0], document: "chunk about cellular respiration", metadata: { documentId: "doc-1", chunkIndex: 1 } },
      { id: "c3", vector: [0.9, 0.1, 0], document: "chunk about light reactions", metadata: { documentId: "doc-2", chunkIndex: 0 } },
    ]);

    const results = await store.query(collectionName, [1, 0, 0], 2);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.id).toBe("c1");
  });

  it("scopes queries with a metadata `where` filter", async () => {
    const results = await store.query(collectionName, [1, 0, 0], 5, { documentId: "doc-1" });
    expect(results.every((r) => r.metadata.documentId === "doc-1")).toBe(true);
    expect(results.some((r) => r.id === "c3")).toBe(false);
  });

  it("deletes vectors matching a where filter", async () => {
    await store.deleteWhere(collectionName, { documentId: "doc-2" });
    const results = await store.query(collectionName, [0.9, 0.1, 0], 5);
    expect(results.some((r) => r.id === "c3")).toBe(false);
  });
});
