import { Queue } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { IDocumentProcessingQueue } from "@application/document/ports/document-processing-queue.port";

export interface ProcessDocumentJobData {
  documentId: string;
}

let queue: Queue<ProcessDocumentJobData> | undefined;

function getQueue(): Queue<ProcessDocumentJobData> {
  if (!queue) {
    queue = new Queue<ProcessDocumentJobData>(QUEUE_NAMES.DOCUMENT_PROCESSING, {
      connection: createQueueConnection(),
    });
  }
  return queue;
}

export class BullDocumentProcessingQueue implements IDocumentProcessingQueue {
  async enqueueProcessing(documentId: string): Promise<void> {
    await getQueue().add(
      "process-document",
      { documentId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );
  }
}
