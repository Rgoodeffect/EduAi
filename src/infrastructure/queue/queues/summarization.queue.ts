import { Queue } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { ISummarizationQueue } from "@application/ai/ports/summarization-queue.port";

export interface SummarizeDocumentJobData {
  documentId: string;
  requestedById: string;
}

let queue: Queue<SummarizeDocumentJobData> | undefined;

function getQueue(): Queue<SummarizeDocumentJobData> {
  if (!queue) {
    queue = new Queue<SummarizeDocumentJobData>(QUEUE_NAMES.SUMMARIZATION, { connection: createQueueConnection() });
  }
  return queue;
}

export class BullSummarizationQueue implements ISummarizationQueue {
  async enqueueSummarization(documentId: string, requestedById: string): Promise<void> {
    await getQueue().add(
      "summarize-document",
      { documentId, requestedById },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );
  }
}
