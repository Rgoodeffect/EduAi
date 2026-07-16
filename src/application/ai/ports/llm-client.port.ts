export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatCompletionOptions {
  temperature?: number;
  /** Hint to the client that the reply should be raw JSON (used with structured-output prompts). */
  jsonMode?: boolean;
}

/**
 * Driven port for text generation. Implemented by OllamaClient
 * (src/infrastructure/ai/ollama-client.ts) against a locally hosted Qwen3
 * model — no paid/external LLM API is ever called through this interface.
 */
export interface ILlmClient {
  chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<string>;
}
