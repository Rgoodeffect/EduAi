import "dotenv/config";
import { createDocumentProcessingWorker } from "@infrastructure/queue/workers/document-processing.worker";
import { createEmbeddingWorker } from "@infrastructure/queue/workers/embedding.worker";
import { createSummarizationWorker } from "@infrastructure/queue/workers/summarization.worker";
import { createQuestionGenerationWorker } from "@infrastructure/queue/workers/question-generation.worker";

/**
 * Standalone worker process entrypoint (`npm run worker`). Runs separately
 * from the Next.js app so PDF extraction / chunking / embedding / generation
 * workloads don't block request-serving processes, and so they can be
 * scaled independently (see the `worker` service in docker-compose.yml).
 */
function main() {
  const workers = [
    createDocumentProcessingWorker(),
    createEmbeddingWorker(),
    createSummarizationWorker(),
    createQuestionGenerationWorker(),
  ];

  console.log(`EduAi worker started. Listening on: ${workers.map((w) => w.name).join(", ")}`);

  const shutdown = async () => {
    console.log("Shutting down workers...");
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  for (const worker of workers) {
    worker.on("failed", (job, err) => {
      console.error(`[${worker.name}] job ${job?.id} failed:`, err.message);
    });
  }
}

main();
