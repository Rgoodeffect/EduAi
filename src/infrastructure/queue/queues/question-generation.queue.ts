import { Queue } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { IQuestionGenerationQueue } from "@application/question/ports/question-generation-queue.port";
import { GenerateQuestionsInput } from "@application/question/dto";

export interface GenerateQuestionsJobData extends GenerateQuestionsInput {
  createdById: string;
}

let queue: Queue<GenerateQuestionsJobData> | undefined;

function getQueue(): Queue<GenerateQuestionsJobData> {
  if (!queue) {
    queue = new Queue<GenerateQuestionsJobData>(QUEUE_NAMES.QUESTION_GENERATION, {
      connection: createQueueConnection(),
    });
  }
  return queue;
}

export class BullQuestionGenerationQueue implements IQuestionGenerationQueue {
  async enqueueGeneration(input: GenerateQuestionsInput, createdById: string): Promise<void> {
    await getQueue().add(
      "generate-questions",
      { ...input, createdById },
      {
        attempts: 2,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );
  }
}
