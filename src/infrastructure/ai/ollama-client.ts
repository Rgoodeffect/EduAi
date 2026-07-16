import { getEnv } from "@infrastructure/config/env";
import { ChatCompletionOptions, ChatMessage, ILlmClient } from "@application/ai/ports/llm-client.port";
import { IEmbeddingClient } from "@application/ai/ports/embedding-client.port";

export class OllamaError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "OllamaError";
  }
}

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

interface OllamaEmbedResponse {
  embeddings: number[][];
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * HTTP client for a locally hosted Ollama instance. Implements both
 * ILlmClient (chat completion, backed by Qwen3 8B by default) and
 * IEmbeddingClient (backed by nomic-embed-text by default) since both
 * ultimately talk to the same Ollama server — no request ever leaves the
 * local network, satisfying the "no paid APIs" constraint.
 */
export class OllamaClient implements ILlmClient, IEmbeddingClient {
  private async post<T>(path: string, body: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
    const env = getEnv();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${env.OLLAMA_BASE_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new OllamaError(`Ollama request to ${path} failed: ${response.status} ${text}`, response.status);
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof OllamaError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new OllamaError(`Ollama request to ${path} timed out after ${timeoutMs}ms`);
      }
      throw new OllamaError(
        `Failed to reach Ollama at ${env.OLLAMA_BASE_URL}${path}: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async chatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<string> {
    const env = getEnv();
    const response = await this.post<OllamaChatResponse>("/api/chat", {
      model: env.OLLAMA_CHAT_MODEL,
      messages,
      stream: false,
      format: options?.jsonMode ? "json" : undefined,
      options: {
        temperature: options?.temperature ?? 0.7,
      },
    });
    return response.message.content;
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector!;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const env = getEnv();
    const response = await this.post<OllamaEmbedResponse>("/api/embed", {
      model: env.OLLAMA_EMBEDDING_MODEL,
      input: texts,
    });
    return response.embeddings;
  }
}
