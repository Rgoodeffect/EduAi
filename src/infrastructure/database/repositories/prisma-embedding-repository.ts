import { PrismaClient, Embedding as PrismaEmbedding } from "@prisma/client";
import { Embedding } from "@domain/embedding/entities/embedding";
import {
  CreateEmbeddingData,
  IEmbeddingRepository,
} from "@domain/embedding/repositories/embedding-repository";

function toDomain(record: PrismaEmbedding): Embedding {
  return Embedding.create(
    {
      chunkId: record.chunkId,
      vectorId: record.vectorId,
      collection: record.collection,
      model: record.model,
      dimensions: record.dimensions,
      createdAt: record.createdAt,
    },
    record.id,
  );
}

export class PrismaEmbeddingRepository implements IEmbeddingRepository {
  constructor(private readonly db: PrismaClient) {}

  async create(data: CreateEmbeddingData): Promise<Embedding> {
    const record = await this.db.embedding.create({ data });
    return toDomain(record);
  }

  async createMany(data: CreateEmbeddingData[]): Promise<number> {
    const result = await this.db.embedding.createMany({ data, skipDuplicates: true });
    return result.count;
  }

  async findByChunkId(chunkId: string): Promise<Embedding | null> {
    const record = await this.db.embedding.findUnique({ where: { chunkId } });
    return record ? toDomain(record) : null;
  }

  async existsForDocument(documentId: string): Promise<boolean> {
    const count = await this.db.embedding.count({ where: { chunk: { documentId } } });
    return count > 0;
  }
}
