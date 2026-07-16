export interface VectorRecord {
  id: string;
  vector: number[];
  document: string;
  metadata: Record<string, string | number | boolean>;
}

export interface VectorQueryResult {
  id: string;
  document: string;
  metadata: Record<string, string | number | boolean>;
  distance: number;
}

/**
 * Driven port for the vector database. Implemented by ChromaVectorStore
 * (src/infrastructure/ai/chroma-vector-store.ts) on top of ChromaDB.
 */
export interface IVectorStore {
  upsert(collection: string, records: VectorRecord[]): Promise<void>;
  query(
    collection: string,
    queryVector: number[],
    topK: number,
    where?: Record<string, string | number | boolean>,
  ): Promise<VectorQueryResult[]>;
  deleteWhere(collection: string, where: Record<string, string | number | boolean>): Promise<void>;
}
