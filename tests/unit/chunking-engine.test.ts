import { describe, it, expect } from "vitest";
import { ChunkingEngine } from "@domain/chunk/services/chunking-engine";
import { estimateTokenCount } from "@domain/chunk/services/token-estimator";

describe("ChunkingEngine", () => {
  const engine = new ChunkingEngine();

  it("returns no chunks for empty input", () => {
    expect(engine.chunk("", { chunkSizeTokens: 100, overlapTokens: 10 })).toEqual([]);
    expect(engine.chunk("   \n\n  ", { chunkSizeTokens: 100, overlapTokens: 10 })).toEqual([]);
  });

  it("returns a single chunk when text fits within the chunk size", () => {
    const text = "This is a short sentence. Here is another one.";
    const chunks = engine.chunk(text, { chunkSizeTokens: 200, overlapTokens: 20 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toContain("This is a short sentence.");
    expect(chunks[0]!.content).toContain("Here is another one.");
  });

  it("splits long text into multiple chunks respecting the size budget", () => {
    const sentence = "The quick brown fox jumps over the lazy dog in the meadow today. ";
    const text = sentence.repeat(60); // ~4000 chars, well beyond a 100-token (~400 char) budget
    const chunks = engine.chunk(text, { chunkSizeTokens: 100, overlapTokens: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Allow some slack since we only close a chunk *after* exceeding budget.
      expect(chunk.tokenCount).toBeLessThan(150);
    }
  });

  it("carries overlapping content between consecutive chunks", () => {
    const sentences = Array.from({ length: 20 }, (_, i) => `Sentence number ${i} with some extra words to pad it out.`);
    const text = sentences.join(" ");
    const chunks = engine.chunk(text, { chunkSizeTokens: 60, overlapTokens: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    // The end of chunk N should share content with the start of chunk N+1.
    const tailOfFirst = chunks[0]!.content.split(" ").slice(-4).join(" ");
    expect(chunks[1]!.content).toContain(tailOfFirst.split(" ").slice(0, 2).join(" "));
  });

  it("never produces a chunk larger than the raw input", () => {
    const text = "Short text.";
    const chunks = engine.chunk(text, { chunkSizeTokens: 5, overlapTokens: 1 });
    for (const chunk of chunks) {
      expect(chunk.content.length).toBeLessThanOrEqual(text.length);
    }
  });
});

describe("estimateTokenCount", () => {
  it("scales roughly with text length", () => {
    expect(estimateTokenCount("")).toBe(1);
    expect(estimateTokenCount("a")).toBe(1);
    expect(estimateTokenCount("a".repeat(400))).toBe(100);
  });
});
