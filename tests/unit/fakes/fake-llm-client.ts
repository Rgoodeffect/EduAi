import { ChatMessage, ChatCompletionOptions, ILlmClient } from "@application/ai/ports/llm-client.port";

export class FakeLlmClient implements ILlmClient {
  public calls: ChatMessage[][] = [];
  constructor(private readonly responder: (messages: ChatMessage[]) => string = () => "Fake summary response.") {}

  async chatCompletion(messages: ChatMessage[], _options?: ChatCompletionOptions): Promise<string> {
    this.calls.push(messages);
    return this.responder(messages);
  }
}
