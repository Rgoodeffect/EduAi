import { IDocumentProcessingQueue } from "@application/document/ports/document-processing-queue.port";

export class FakeDocumentProcessingQueue implements IDocumentProcessingQueue {
  public enqueued: string[] = [];

  async enqueueProcessing(documentId: string): Promise<void> {
    this.enqueued.push(documentId);
  }
}
