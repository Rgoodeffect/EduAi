import { Job, Worker } from "bullmq";
import { createQueueConnection } from "@infrastructure/queue/connection";
import { QUEUE_NAMES } from "@infrastructure/queue/queue-names";
import { GenerateQuestionsJobData } from "@infrastructure/queue/queues/question-generation.queue";
import { container } from "@infrastructure/di/container";

export function createQuestionGenerationWorker(): Worker<GenerateQuestionsJobData> {
  return new Worker<GenerateQuestionsJobData>(
    QUEUE_NAMES.QUESTION_GENERATION,
    async (job: Job<GenerateQuestionsJobData>) => {
      const { createdById, ...input } = job.data;
      const result = await container.questionService.generateQuestions(input, createdById);
      if (!result.ok) {
        throw new Error(result.error.message);
      }
    },
    { connection: createQueueConnection(), concurrency: 1 }, // LLM calls are heavy; keep it serialized per worker
  );
}
