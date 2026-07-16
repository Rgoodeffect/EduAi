import { v4 as uuidv4 } from "uuid";
import { Chunk } from "@domain/chunk/entities/chunk";
import { CreateChunkData, IChunkRepository } from "@domain/chunk/repositories/chunk-repository";

export class FakeChunkRepository implements IChunkRepository {
  private chunks = new Map<string, Chunk>();

  async createMany(data: CreateChunkData[]): Promise<Chunk[]> {
    const created = data.map((d) =>
      Chunk.create(
        {
          documentId: d.documentId,
          chunkIndex: d.chunkIndex,
          content: d.content,
          tokenCount: d.tokenCount,
          pageNumber: d.pageNumber,
          createdAt: new Date(),
        },
        uuidv4(),
      ),
    );
    for (const chunk of created) this.chunks.set(chunk.id, chunk);
    return created;
  }

  async findById(id: string): Promise<Chunk | null> {
    return this.chunks.get(id) ?? null;
  }

  async findManyByIds(ids: string[]): Promise<Chunk[]> {
    return Array.from(this.chunks.values()).filter((c) => ids.includes(c.id));
  }

  async listByDocument(documentId: string): Promise<Chunk[]> {
    return Array.from(this.chunks.values())
      .filter((c) => c.documentId === documentId)
      .sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  async countByDocument(documentId: string): Promise<number> {
    return (await this.listByDocument(documentId)).length;
  }

  async deleteByDocument(documentId: string): Promise<void> {
    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.documentId === documentId) this.chunks.delete(id);
    }
  }
}
