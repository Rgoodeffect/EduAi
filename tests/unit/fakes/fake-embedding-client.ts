import { IEmbeddingClient } from "@application/ai/ports/embedding-client.port";

/** Deterministic fake: derives a small vector from string length/char codes so tests can assert without randomness. */
export class FakeEmbeddingClient implements IEmbeddingClient {
  public calls: string[][] = [];

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    return vector!;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    this.calls.push(texts);
    return texts.map((t) => [t.length % 97, (t.charCodeAt(0) || 0) % 97, t.split(" ").length % 97]);
  }
}
