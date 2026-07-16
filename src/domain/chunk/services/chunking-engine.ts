import { estimateTokenCount } from "@domain/chunk/services/token-estimator";

export interface ChunkingOptions {
  chunkSizeTokens: number;
  overlapTokens: number;
}

export interface TextChunk {
  content: string;
  tokenCount: number;
}

const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-Z0-9"'“(])/;

/**
 * Splits normalized document text into overlapping, sentence-aligned chunks
 * suitable for embedding and retrieval. Sentence alignment avoids cutting
 * mid-thought, which materially hurts embedding quality and downstream
 * question generation. Pure domain logic — no I/O, fully unit-testable.
 */
export class ChunkingEngine {
  chunk(rawText: string, options: ChunkingOptions): TextChunk[] {
    const sentences = this.splitIntoSentences(rawText);
    if (sentences.length === 0) return [];

    const chunks: TextChunk[] = [];
    let buffer: string[] = [];
    let bufferTokens = 0;

    const flush = () => {
      if (buffer.length === 0) return;
      const content = buffer.join(" ").trim();
      if (content.length > 0) {
        chunks.push({ content, tokenCount: estimateTokenCount(content) });
      }
    };

    for (const sentence of sentences) {
      const sentenceTokens = estimateTokenCount(sentence);

      if (bufferTokens + sentenceTokens > options.chunkSizeTokens && buffer.length > 0) {
        flush();
        buffer = this.takeOverlapTail(buffer, options.overlapTokens);
        bufferTokens = buffer.reduce((sum, s) => sum + estimateTokenCount(s), 0);
      }

      buffer.push(sentence);
      bufferTokens += sentenceTokens;
    }
    flush();

    return chunks;
  }

  private splitIntoSentences(rawText: string): string[] {
    const normalized = rawText
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (normalized.length === 0) return [];

    return normalized
      .split(/\n\n+/) // paragraphs first, to keep structure
      .flatMap((paragraph) => paragraph.split(SENTENCE_BOUNDARY))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  /** Carries the tail of the previous chunk forward so context isn't lost at chunk boundaries. */
  private takeOverlapTail(sentences: string[], overlapTokens: number): string[] {
    if (overlapTokens <= 0) return [];
    const tail: string[] = [];
    let tokens = 0;
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i]!;
      const sentenceTokens = estimateTokenCount(sentence);
      if (tokens + sentenceTokens > overlapTokens && tail.length > 0) break;
      tail.unshift(sentence);
      tokens += sentenceTokens;
    }
    return tail;
  }
}
