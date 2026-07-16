import { IVectorStore, VectorQueryResult, VectorRecord } from "@application/ai/ports/vector-store.port";

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * (b[i] ?? 0), 0);
}

export class FakeVectorStore implements IVectorStore {
  private collections = new Map<string, Map<string, VectorRecord>>();

  async upsert(collection: string, records: VectorRecord[]): Promise<void> {
    const store = this.collections.get(collection) ?? new Map<string, VectorRecord>();
    for (const record of records) store.set(record.id, record);
    this.collections.set(collection, store);
  }

  async query(
    collection: string,
    queryVector: number[],
    topK: number,
    where?: Record<string, string | number | boolean>,
  ): Promise<VectorQueryResult[]> {
    const store = this.collections.get(collection);
    if (!store) return [];

    let records = Array.from(store.values());
    if (where) {
      records = records.filter((r) => Object.entries(where).every(([k, v]) => r.metadata[k] === v));
    }

    return records
      .map((r) => ({ id: r.id, document: r.document, metadata: r.metadata, distance: -dot(r.vector, queryVector) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, topK);
  }

  async deleteWhere(collection: string, where: Record<string, string | number | boolean>): Promise<void> {
    const store = this.collections.get(collection);
    if (!store) return;
    for (const [id, record] of store.entries()) {
      if (Object.entries(where).every(([k, v]) => record.metadata[k] === v)) store.delete(id);
    }
  }
}
