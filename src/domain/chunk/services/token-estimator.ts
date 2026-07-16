/**
 * Approximates token count without depending on a model-specific tokenizer
 * (Qwen3 runs locally via Ollama, which doesn't expose a tokenizer API to
 * Node). The ~4-characters-per-token heuristic is a standard, widely used
 * approximation for English text and is accurate enough to size chunks —
 * the actual LLM call still enforces its own hard context limit.
 */
export function estimateTokenCount(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
