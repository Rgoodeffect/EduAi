import { Queue } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { IEmbeddingQueue } from "@application/ai/ports/embedding-queue.port";

export interface EmbedDocumentJobData {
  documentId: string;
}

let queue: Queue<EmbedDocumentJobData> | undefined;

function getQueue(): Queue<EmbedDocumentJobData> {
  if (!queue) {
    queue = new Queue<EmbedDocumentJobData>(QUEUE_NAMES.EMBEDDING, { connection: createQueueConnection() });
  }
  return queue;
}

export class BullEmbeddingQueue implements IEmbeddingQueue {
  async enqueueEmbedding(documentId: string): Promise<void> {
    await getQueue().add(
      "embed-document",
      { documentId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );
  }
}
