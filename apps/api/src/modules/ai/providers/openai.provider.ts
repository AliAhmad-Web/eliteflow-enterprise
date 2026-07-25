import type {
  AiGenerateParams,
  AiGenerateResult,
  AiProvider,
  AiStreamHandlers,
} from "./ai-provider.js";
import { getSystemInstructions } from "./provider-prompts.js";

type ResponseInputMessage = {
  role: "user" | "assistant" | "system" | "developer";
  content: string;
};

type OpenAiResponsesPayload = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function buildInput(params: AiGenerateParams): ResponseInputMessage[] {
  const input: ResponseInputMessage[] = [];

  for (const item of params.history ?? []) {
    if (!item.content?.trim()) continue;
    if (item.role === "SYSTEM") {
      input.push({ role: "developer", content: item.content });
      continue;
    }
    input.push({
      role: item.role === "ASSISTANT" ? "assistant" : "user",
      content: item.content,
    });
  }

  input.push({ role: "user", content: params.prompt });
  return input;
}

function extractOutputText(payload: OpenAiResponsesPayload): string {
  if (payload.output_text?.trim()) {
    return payload.output_text.trim();
  }

  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const part of item.content ?? []) {
      if (part.type === "output_text" && part.text?.trim()) {
        parts.push(part.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onDelta?: (chunk: string) => void | Promise<void>,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assembled = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n");
    buffer = chunks.pop() ?? "";

    for (const rawLine of chunks) {
      const line = rawLine.trimEnd();
      if (!line.startsWith("data:")) continue;

      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      let event: {
        type?: string;
        delta?: string;
        text?: string;
        error?: { message?: string };
      };

      try {
        event = JSON.parse(data) as typeof event;
      } catch {
        continue;
      }

      if (event.type === "response.output_text.delta" && event.delta) {
        assembled += event.delta;
        await onDelta?.(event.delta);
        continue;
      }

      if (event.type === "response.output_text.done" && event.text) {
        if (!assembled) {
          assembled = event.text;
        }
        continue;
      }

      if (event.type === "error" || event.error?.message) {
        const message =
          event.error?.message ?? "OpenAI Responses stream failed";
        const lower = message.toLowerCase();
        if (
          lower.includes("quota") ||
          lower.includes("billing") ||
          lower.includes("insufficient_quota")
        ) {
          throw new Error(
            "OpenAI quota exceeded. Add billing credits at platform.openai.com/account/billing, or clear OPENAI_API_KEY in apps/api/.env to use Mock AI for development.",
          );
        }
        throw new Error(message);
      }
    }
  }

  return assembled.trim();
}

function formatOpenAiHttpError(status: number, detail: string): Error {
  let parsedMessage = "";
  try {
    const parsed = JSON.parse(detail) as {
      error?: { message?: string; code?: string; type?: string };
    };
    parsedMessage = parsed.error?.message?.trim() ?? "";
  } catch {
    parsedMessage = detail.trim();
  }

  const lower = parsedMessage.toLowerCase();
  const isQuota =
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("billing") ||
    lower.includes("insufficient_quota");

  if (isQuota) {
    return new Error(
      "OpenAI quota exceeded. Add billing credits at platform.openai.com/account/billing, or clear OPENAI_API_KEY in apps/api/.env to use Mock AI for development.",
    );
  }

  if (status === 401) {
    return new Error(
      "OpenAI API key is invalid. Update OPENAI_API_KEY in apps/api/.env and restart the API.",
    );
  }

  return new Error(
    `OpenAI request failed (${status}): ${(parsedMessage || detail).slice(0, 300)}`,
  );
}

export class OpenAiProvider implements AiProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
  ) {}

  async generate(params: AiGenerateParams): Promise<AiGenerateResult> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: getSystemInstructions(params),
        input: buildInput(params),
        temperature: 0.7,
        stream: false,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw formatOpenAiHttpError(response.status, detail);
    }

    const payload = (await response.json()) as OpenAiResponsesPayload;
    if (payload.error?.message) {
      throw new Error(payload.error.message);
    }

    const content = extractOutputText(payload);
    if (!content) {
      throw new Error("OpenAI Responses API returned an empty response");
    }

    return { content, provider: this.name };
  }

  async generateStream(
    params: AiGenerateParams,
    handlers?: AiStreamHandlers,
  ): Promise<AiGenerateResult> {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: getSystemInstructions(params),
        input: buildInput(params),
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw formatOpenAiHttpError(response.status, detail);
    }

    if (!response.body) {
      // Fallback to non-stream request if the runtime omitted a body stream
      return this.generate(params);
    }

    const content = await readSseStream(response.body, handlers?.onDelta);
    if (!content) {
      throw new Error("OpenAI Responses stream returned an empty response");
    }

    return { content, provider: this.name };
  }
}
