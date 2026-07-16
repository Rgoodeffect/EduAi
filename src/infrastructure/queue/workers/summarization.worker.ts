import { Job, Worker } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { SummarizeDocumentJobData } from "@infrastructure/queue/queues/summarization.queue";
import { container } from "@infrastructure/di/container";

export function createSummarizationWorker(): Worker<SummarizeDocumentJobData> {
  return new Worker<SummarizeDocumentJobData>(
    QUEUE_NAMES.SUMMARIZATION,
    async (job: Job<SummarizeDocumentJobData>) => {
      const { documentId, requestedById } = job.data;
      const result = await container.summarizationService.summarizeDocument(documentId, requestedById);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
    },
    { connection: createQueueConnection(), concurrency: 1 }, // LLM calls are heavy; keep it serialized per worker
  );
}
