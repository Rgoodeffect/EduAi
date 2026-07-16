export interface IDocumentProcessingQueue {
  enqueueProcessing(documentId: string): Promise<void>;
}
