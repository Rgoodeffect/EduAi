import { GenerateQuestionsInput } from "@application/question/dto";

export interface IQuestionGenerationQueue {
  enqueueGeneration(input: GenerateQuestionsInput, createdById: string): Promise<void>;
}
