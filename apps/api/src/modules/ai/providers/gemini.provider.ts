import type {
  AiGenerateParams,
  AiGenerateResult,
  AiProvider,
  AiStreamHandlers,
} from "./ai-provider.js";
import { getSystemInstructions } from "./provider-prompts.js";

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiGeneratePayload = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message?: string; status?: string; code?: number };
};

function buildContents(params: AiGenerateParams): GeminiContent[] {
  const contents: GeminiContent[] = [];

  for (const item of params.history ?? []) {
    if (!item.content?.trim()) continue;
    if (item.role === "SYSTEM") continue;
    contents.push({
      role: item.role === "ASSISTANT" ? "model" : "user",
      parts: [{ text: item.content }],
    });
  }

  contents.push({
    role: "user",
    parts: [{ text: params.prompt }],
  });

  // Gemini requires alternating user/model roles; merge consecutive same-role turns.
  const merged: GeminiContent[] = [];
  for (const turn of contents) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.parts[0] = {
        text: `${last.parts[0]?.text ?? ""}\n\n${turn.parts[0]?.text ?? ""}`,
      };
      continue;
    }
    merged.push({
      role: turn.role,
      parts: [{ text: turn.parts[0]?.text ?? "" }],
    });
  }

  // First content must be from user
  if (merged[0]?.role === "model") {
    merged.unshift({
      role: "user",
      parts: [{ text: "(conversation context)" }],
    });
  }

  return merged;
}

function extractText(payload: GeminiGeneratePayload): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

function formatGeminiError(status: number, detail: string): Error {
  let parsedMessage = "";
  try {
    const parsed = JSON.parse(detail) as GeminiGeneratePayload;
    parsedMessage = parsed.error?.message?.trim() ?? "";
  } catch {
    parsedMessage = detail.trim();
  }

  const lower = parsedMessage.toLowerCase();
  if (
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    lower.includes("billing")
  ) {
    return new Error(
      "Gemini quota exceeded. Check Google AI Studio usage/billing, or clear GEMINI_API_KEY to use Mock AI.",
    );
  }

  if (status === 400 && lower.includes("api key")) {
    return new Error(
      "Gemini API key is invalid. Update GEMINI_API_KEY in apps/api/.env and restart the API.",
    );
  }

  if (status === 403 || status === 401) {
    return new Error(
      "Gemini API key was rejected. Verify the key in Google AI Studio and restart the API.",
    );
  }

  return new Error(
    `Gemini request failed (${status}): ${(parsedMessage || detail).slice(0, 300)}`,
  );
}

async function readGeminiSseStream(
  body: ReadableStream<Uint8Array>,
  onDelta?: (chunk: string) => void | Promise<void>,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assembled = "";
  let lastEmittedLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n");
    buffer = chunks.pop() ?? "";

    for (const rawLine of chunks) {
      const line = rawLine.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      let payload: GeminiGeneratePayload;
      try {
        payload = JSON.parse(data) as GeminiGeneratePayload;
      } catch {
        continue;
      }

      if (payload.error?.message) {
        throw new Error(payload.error.message);
      }

      const text = extractText(payload);
      if (!text) continue;

      // Some Gemini SSE events send cumulative text; emit only the delta.
      if (text.startsWith(assembled) && text.length >= assembled.length) {
        const delta = text.slice(assembled.length);
        assembled = text;
        if (delta) await onDelta?.(delta);
        lastEmittedLength = assembled.length;
        continue;
      }

      // Incremental token chunks
      assembled += text;
      await onDelta?.(text);
      lastEmittedLength = assembled.length;
    }
  }

  void lastEmittedLength;
  return assembled.trim();
}

export class GeminiProvider implements AiProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    private readonly model =
      process.env.GEMINI_MODEL?.trim() || "gemini-flash-latest",
  ) {}

  private endpoint(stream: boolean): string {
    const action = stream ? "streamGenerateContent" : "generateContent";
    const query = stream ? "?alt=sse" : "";
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:${action}${query}`;
  }

  private buildBody(params: AiGenerateParams) {
    return {
      system_instruction: {
        parts: [{ text: getSystemInstructions(params) }],
      },
      contents: buildContents(params),
      generationConfig: {
        temperature: 0.7,
      },
    };
  }

  async generate(params: AiGenerateParams): Promise<AiGenerateResult> {
    const response = await fetch(this.endpoint(false), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
      },
      body: JSON.stringify(this.buildBody(params)),
    });

    if (!response.ok) {
      throw formatGeminiError(response.status, await response.text());
    }

    const payload = (await response.json()) as GeminiGeneratePayload;
    if (payload.error?.message) {
      throw new Error(payload.error.message);
    }

    const content = extractText(payload);
    if (!content) {
      throw new Error("Gemini returned an empty response");
    }

    return { content, provider: this.name };
  }

  async generateStream(
    params: AiGenerateParams,
    handlers?: AiStreamHandlers,
  ): Promise<AiGenerateResult> {
    const response = await fetch(this.endpoint(true), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": this.apiKey,
        Accept: "text/event-stream",
      },
      body: JSON.stringify(this.buildBody(params)),
    });

    if (!response.ok) {
      throw formatGeminiError(response.status, await response.text());
    }

    if (!response.body) {
      return this.generate(params);
    }

    const content = await readGeminiSseStream(response.body, handlers?.onDelta);
    if (!content) {
      throw new Error("Gemini stream returned an empty response");
    }

    return { content, provider: this.name };
  }
}
