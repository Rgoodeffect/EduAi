import { Job, Worker } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { ProcessDocumentJobData } from "@infrastructure/queue/queues/document-processing.queue";
import { container } from "@infrastructure/di/container";
import { DocumentStatus } from "@domain/document/value-objects/document-status";
import { getEnv } from "@infrastructure/config/env";

/**
 * Consumes `document-processing` jobs: PDF text extraction -> chunking ->
 * persistence. Each stage updates Document.status so the UI can show live
 * progress. On any failure the document is marked FAILED with the error
 * message and the job is re-thrown so BullMQ applies its retry/backoff policy.
 */
export function createDocumentProcessingWorker(): Worker<ProcessDocumentJobData> {
  return new Worker<ProcessDocumentJobData>(
    QUEUE_NAMES.DOCUMENT_PROCESSING,
    async (job: Job<ProcessDocumentJobData>) => {
      const { documentId } = job.data;
      const { documentRepository, chunkRepository, fileStorageService, pdfExtractor, chunkingEngine } = container;

      const document = await documentRepository.findById(documentId);
      if (!document) {
        throw new Error(`Document ${documentId} not found — aborting job.`);
      }

      try {
        await documentRepository.updateStatus(documentId, DocumentStatus.PROCESSING);
        const buffer = await fileStorageService.readBuffer(document.storagePath);

        const extraction = await pdfExtractor.extract(buffer);
        await documentRepository.updatePageCount(documentId, extraction.pageCount);

        if (!extraction.text || extraction.text.trim().length === 0) {
          throw new Error("No extractable text found in this PDF (it may be a scanned image without OCR).");
        }

        await documentRepository.updateStatus(documentId, DocumentStatus.CHUNKING);
        const env = getEnv();
        const textChunks = chunkingEngine.chunk(extraction.text, {
          chunkSizeTokens: env.CHUNK_SIZE_TOKENS,
          overlapTokens: env.CHUNK_OVERLAP_TOKENS,
        });

        if (textChunks.length === 0) {
          throw new Error("Chunking produced zero chunks from the extracted text.");
        }

        // Idempotent: a retried job should not duplicate chunks.
        await chunkRepository.deleteByDocument(documentId);
        await chunkRepository.createMany(
          textChunks.map((c, index) => ({
            documentId,
            chunkIndex: index,
            content: c.content,
            tokenCount: c.tokenCount,
            pageNumber: null,
          })),
        );

        await documentRepository.updateStatus(documentId, DocumentStatus.READY);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown document processing error";
        await documentRepository.updateStatus(documentId, DocumentStatus.FAILED, message);
        throw err;
      }
    },
    { connection: createQueueConnection(), concurrency: 2 },
  );
}
