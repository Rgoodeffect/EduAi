import { Chunk } from "@domain/chunk/entities/chunk";

export interface CreateChunkData {
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  pageNumber: number | null;
}

export interface IChunkRepository {
  createMany(data: CreateChunkData[]): Promise<Chunk[]>;
  findById(id: string): Promise<Chunk | null>;
  findManyByIds(ids: string[]): Promise<Chunk[]>;
  listByDocument(documentId: string): Promise<Chunk[]>;
  countByDocument(documentId: string): Promise<number>;
  deleteByDocument(documentId: string): Promise<void>;
}
