import { v4 as uuidv4 } from "uuid";
import { Embedding } from "@domain/embedding/entities/embedding";
import { CreateEmbeddingData, IEmbeddingRepository } from "@domain/embedding/repositories/embedding-repository";

export class FakeEmbeddingRepository implements IEmbeddingRepository {
  private embeddings: Embedding[] = [];

  async create(data: CreateEmbeddingData): Promise<Embedding> {
    const embedding = Embedding.create({ ...data, createdAt: new Date() }, uuidv4());
    this.embeddings.push(embedding);
    return embedding;
  }

  async createMany(data: CreateEmbeddingData[]): Promise<number> {
    for (const d of data) await this.create(d);
    return data.length;
  }

  async findByChunkId(chunkId: string): Promise<Embedding | null> {
    return this.embeddings.find((e) => e.chunkId === chunkId) ?? null;
  }

  async existsForDocument(): Promise<boolean> {
    return this.embeddings.length > 0;
  }
}
