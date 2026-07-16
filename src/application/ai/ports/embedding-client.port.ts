/**
 * Driven port for turning text into vector embeddings. Implemented by
 * OllamaClient using a local embedding model (default: nomic-embed-text) —
 * embeddings never leave the local Ollama instance.
 */
export interface IEmbeddingClient {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}
