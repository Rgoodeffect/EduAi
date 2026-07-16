export interface ISummarizationQueue {
  enqueueSummarization(documentId: string, requestedById: string): Promise<void>;
}
