import { ChromaClient, type Collection } from "chromadb";
import { getEnv } from "@infrastructure/config/env";
import { IVectorStore, VectorRecord, VectorQueryResult } from "@application/ai/ports/vector-store.port";

/**
 * ChromaDB-backed implementation of IVectorStore. Collections are created
 * lazily and cached per collection name for the lifetime of the process.
 */
export class ChromaVectorStore implements IVectorStore {
  private client: ChromaClient | undefined;
  private collections = new Map<string, Collection>();

  private getClient(): ChromaClient {
    if (!this.client) {
      this.client = new ChromaClient({ path: getEnv().CHROMA_URL });
    }
    return this.client;
  }

  private async getCollection(name: string): Promise<Collection> {
    const cached = this.collections.get(name);
    if (cached) return cached;

    const collection = await this.getClient().getOrCreateCollection({ name });
    this.collections.set(name, collection);
    return collection;
  }

  async upsert(collectionName: string, records: VectorRecord[]): Promise<void> {
    if (records.length === 0) return;
    const collection = await this.getCollection(collectionName);
    await collection.upsert({
      ids: records.map((r) => r.id),
      embeddings: records.map((r) => r.vector),
      documents: records.map((r) => r.document),
      metadatas: records.map((r) => r.metadata),
    });
  }

  async query(
    collectionName: string,
    queryVector: number[],
    topK: number,
    where?: Record<string, string | number | boolean>,
  ): Promise<VectorQueryResult[]> {
    const collection = await this.getCollection(collectionName);
    const result = await collection.query({
      queryEmbeddings: [queryVector],
      nResults: topK,
      where,
    });

    const ids = result.ids[0] ?? [];
    const documents = result.documents[0] ?? [];
    const metadatas = result.metadatas[0] ?? [];
    const distances = result.distances?.[0] ?? [];

    return ids.map((id, index) => ({
      id,
      document: documents[index] ?? "",
      metadata: (metadatas[index] ?? {}) as Record<string, string | number | boolean>,
      distance: distances[index] ?? 0,
    }));
  }

  async deleteWhere(collectionName: string, where: Record<string, string | number | boolean>): Promise<void> {
    const collection = await this.getCollection(collectionName);
    await collection.delete({ where });
  }
}
