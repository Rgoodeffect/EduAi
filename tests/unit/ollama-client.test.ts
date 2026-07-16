import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http, { type Server } from "node:http";
import { OllamaClient, OllamaError } from "@infrastructure/ai/ollama-client";

/**
 * We cannot reach a real Ollama instance in this environment (network
 * policy blocks ollama.com / model downloads), so this test stands up a
 * local HTTP server that mimics Ollama's documented /api/chat and
 * /api/embed response shapes, to verify OllamaClient's request formatting
 * and response parsing against that contract.
 */
describe("OllamaClient", () => {
  let server: Server;
  let baseUrl: string;
  let lastRequest: { path: string; body: unknown } | null = null;
  let nextStatus = 200;
  let nextResponseBody: unknown = {};

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        lastRequest = { path: req.url ?? "", body: raw ? JSON.parse(raw) : undefined };
        res.writeHead(nextStatus, { "Content-Type": "application/json" });
        res.end(JSON.stringify(nextResponseBody));
      });
    });

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (typeof address === "object" && address) {
      baseUrl = `http://127.0.0.1:${address.port}`;
    }
    process.env.OLLAMA_BASE_URL = baseUrl;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    nextStatus = 200;
    lastRequest = null;
  });

  it("sends chat messages to /api/chat and parses the assistant reply", async () => {
    nextResponseBody = { message: { role: "assistant", content: "This is a generated summary." }, done: true };

    const client = new OllamaClient();
    const reply = await client.chatCompletion([
      { role: "system", content: "You are a helpful summarizer." },
      { role: "user", content: "Summarize this text." },
    ]);

    expect(reply).toBe("This is a generated summary.");
    expect(lastRequest?.path).toBe("/api/chat");
    const body = lastRequest?.body as { model: string; messages: unknown[]; stream: boolean };
    expect(body.model).toBe("qwen3:8b");
    expect(body.stream).toBe(false);
    expect(body.messages).toHaveLength(2);
  });

  it("requests JSON-formatted output when jsonMode is set", async () => {
    nextResponseBody = { message: { role: "assistant", content: '{"ok":true}' }, done: true };
    const client = new OllamaClient();
    await client.chatCompletion([{ role: "user", content: "Return JSON." }], { jsonMode: true });

    const body = lastRequest?.body as { format?: string };
    expect(body.format).toBe("json");
  });

  it("embeds a single string via /api/embed", async () => {
    nextResponseBody = { embeddings: [[0.1, 0.2, 0.3]] };
    const client = new OllamaClient();
    const vector = await client.embed("hello world");

    expect(vector).toEqual([0.1, 0.2, 0.3]);
    expect(lastRequest?.path).toBe("/api/embed");
    const body = lastRequest?.body as { model: string; input: string[] };
    expect(body.model).toBe("nomic-embed-text");
    expect(body.input).toEqual(["hello world"]);
  });

  it("embeds a batch of strings in one request", async () => {
    nextResponseBody = { embeddings: [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]] };
    const client = new OllamaClient();
    const vectors = await client.embedBatch(["a", "b", "c"]);

    expect(vectors).toHaveLength(3);
    const body = lastRequest?.body as { input: string[] };
    expect(body.input).toEqual(["a", "b", "c"]);
  });

  it("returns an empty array for an empty batch without making a request", async () => {
    const client = new OllamaClient();
    const vectors = await client.embedBatch([]);
    expect(vectors).toEqual([]);
    expect(lastRequest).toBeNull();
  });

  it("throws OllamaError with the status code on a non-2xx response", async () => {
    nextStatus = 500;
    nextResponseBody = { error: "model not found" };
    const client = new OllamaClient();

    await expect(client.chatCompletion([{ role: "user", content: "hi" }])).rejects.toThrow(OllamaError);
  });
});
