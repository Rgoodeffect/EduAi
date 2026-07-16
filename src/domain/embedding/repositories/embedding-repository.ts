import { Embedding } from "@domain/embedding/entities/embedding";

export interface CreateEmbeddingData {
  chunkId: string;
  vectorId: string;
  collection: string;
  model: string;
  dimensions: number;
}

export interface IEmbeddingRepository {
  create(data: CreateEmbeddingData): Promise<Embedding>;
  createMany(data: CreateEmbeddingData[]): Promise<number>;
  findByChunkId(chunkId: string): Promise<Embedding | null>;
  existsForDocument(documentId: string): Promise<boolean>;
}
