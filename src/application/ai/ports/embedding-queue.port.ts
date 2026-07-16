export interface IEmbeddingQueue {
  enqueueEmbedding(documentId: string): Promise<void>;
}
