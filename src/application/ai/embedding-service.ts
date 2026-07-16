import { IChunkRepository } from "@domain/chunk/repositories/chunk-repository";
import { IEmbeddingRepository } from "@domain/embedding/repositories/embedding-repository";
import { IEmbeddingClient } from "@application/ai/ports/embedding-client.port";
import { IVectorStore, VectorQueryResult } from "@application/ai/ports/vector-store.port";
import { getEnv } from "@infrastructure/config/env";

/**
 * All chunks across all documents live in one ChromaDB collection, scoped
 * per query via a `documentId` metadata filter. This keeps collection
 * management simple (one collection to create/monitor) while still giving
 * per-document retrieval for RAG-style question/summary generation.
 */
export function chunksCollectionName(): string {
  return `${getEnv().CHROMA_COLLECTION_PREFIX}_chunks`;
}

export class EmbeddingService {
  constructor(
    private readonly chunkRepository: IChunkRepository,
    private readonly embeddingRepository: IEmbeddingRepository,
    private readonly embeddingClient: IEmbeddingClient,
    private readonly vectorStore: IVectorStore,
  ) {}

  /** Embeds every chunk of a document and stores both the vectors (Chroma) and metadata (Postgres). */
  async embedDocument(documentId: string): Promise<number> {
    const chunks = await this.chunkRepository.listByDocument(documentId);
    if (chunks.length === 0) return 0;

    const vectors = await this.embeddingClient.embedBatch(chunks.map((c) => c.content));
    if (vectors.length !== chunks.length) {
      throw new Error(
        `Embedding count mismatch: requested ${chunks.length} embeddings, received ${vectors.length}.`,
      );
    }

    const collection = chunksCollectionName();
    const vectorIds = chunks.map((chunk) => `chunk-${chunk.id}`);

    await this.vectorStore.upsert(
      collection,
      chunks.map((chunk, i) => ({
        id: vectorIds[i]!,
        vector: vectors[i]!,
        document: chunk.content,
        metadata: { documentId, chunkId: chunk.id, chunkIndex: chunk.chunkIndex },
      })),
    );

    const env = getEnv();
    await this.embeddingRepository.createMany(
      chunks.map((chunk, i) => ({
        chunkId: chunk.id,
        vectorId: vectorIds[i]!,
        collection,
        model: env.OLLAMA_EMBEDDING_MODEL,
        dimensions: vectors[i]!.length,
      })),
    );

    return chunks.length;
  }

  /** Retrieval for RAG: finds the chunks of a given document most similar to a query string. */
  async searchSimilarChunks(documentId: string, queryText: string, topK = 5): Promise<VectorQueryResult[]> {
    const queryVector = await this.embeddingClient.embed(queryText);
    return this.vectorStore.query(chunksCollectionName(), queryVector, topK, { documentId });
  }
}
