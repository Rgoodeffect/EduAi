import { PrismaClient, Chunk as PrismaChunk } from "@prisma/client";
import { Chunk } from "@domain/chunk/entities/chunk";
import { CreateChunkData, IChunkRepository } from "@domain/chunk/repositories/chunk-repository";

function toDomain(record: PrismaChunk): Chunk {
  return Chunk.create(
    {
      documentId: record.documentId,
      chunkIndex: record.chunkIndex,
      content: record.content,
      tokenCount: record.tokenCount,
      pageNumber: record.pageNumber,
      createdAt: record.createdAt,
    },
    record.id,
  );
}

export class PrismaChunkRepository implements IChunkRepository {
  constructor(private readonly db: PrismaClient) {}

  async createMany(data: CreateChunkData[]): Promise<Chunk[]> {
    await this.db.chunk.createMany({ data });
    return this.listByDocument(data[0]?.documentId ?? "");
  }

  async findById(id: string): Promise<Chunk | null> {
    const record = await this.db.chunk.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findManyByIds(ids: string[]): Promise<Chunk[]> {
    const records = await this.db.chunk.findMany({ where: { id: { in: ids } } });
    return records.map(toDomain);
  }

  async listByDocument(documentId: string): Promise<Chunk[]> {
    const records = await this.db.chunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: "asc" },
    });
    return records.map(toDomain);
  }

  async countByDocument(documentId: string): Promise<number> {
    return this.db.chunk.count({ where: { documentId } });
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.db.chunk.deleteMany({ where: { documentId } });
  }
}
