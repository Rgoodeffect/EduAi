import { Job, Worker } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { EmbedDocumentJobData } from "@infrastructure/queue/queues/embedding.queue";
import { container } from "@infrastructure/di/container";
import { DocumentStatus } from "@domain/document/value-objects/document-status";

/**
 * Consumes `embedding-generation` jobs, the second stage of the document
 * pipeline (after document-processing has extracted text and chunked it).
 * On success the document becomes READY; on failure it's marked FAILED with
 * the error message so the UI can surface it.
 */
export function createEmbeddingWorker(): Worker<EmbedDocumentJobData> {
  return new Worker<EmbedDocumentJobData>(
    QUEUE_NAMES.EMBEDDING,
    async (job: Job<EmbedDocumentJobData>) => {
      const { documentId } = job.data;
      const { documentRepository, embeddingService } = container;

      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found — aborting embedding job.`);
      }

      try {
        const embeddedCount = await embeddingService.embedDocument(documentId);
        if (embeddedCount === 0) {
          throw new Error("Document has no chunks to embed.");
        }
        await documentRepository.updateStatus(documentId, DocumentStatus.READY);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown embedding error";
        await documentRepository.updateStatus(documentId, DocumentStatus.FAILED, message);
        throw err;
      }
    },
    { connection: createQueueConnection(), concurrency: 2 },
  );
}
