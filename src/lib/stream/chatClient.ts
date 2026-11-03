import { parseSseLine, type ChatContext, type ChatRequest, type SseEvent } from "@/domain";

/** Events the client emits: the wire contract plus one internal event for a user abort. */
export type StreamEvent = SseEvent | { type: "aborted" };

export class ChatHttpError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`The assistant request failed with status ${status}.`);
    this.name = "ChatHttpError";
    this.status = status;
  }
}

export class ChatProtocolError extends Error {
  constructor(message = "The assistant sent a response that could not be read.") {
    super(message);
    this.name = "ChatProtocolError";
  }
}

export type AskStreamOptions = {
  /** The view the question is about; the assistant answers about it. */
  context?: ChatContext;
  signal?: AbortSignal;
  onEvent: (event: StreamEvent) => void;
};

export type AskStream = (question: string, options: AskStreamOptions) => Promise<void>;

const KNOWN_TYPES = new Set(["token", "done", "error"]);

/** Parses one SSE block. Unknown event types are ignored and logged; anything else unreadable throws. */
function parseBlock(block: string): SseEvent[] {
  const events: SseEvent[] = [];
  for (const line of block.split("\n")) {
    if (!line.startsWith("data:")) continue;
    try {
      const event = parseSseLine(line);
      if (event) events.push(event);
    } catch {
      const type = peekType(line);
      if (type !== undefined && !KNOWN_TYPES.has(type)) {
        console.warn("[chat] ignoring unknown event type", type);
        continue;
      }
      throw new ChatProtocolError();
    }
  }
  return events;
}

function peekType(line: string): string | undefined {
  try {
    const parsed: unknown = JSON.parse(line.slice("data:".length));
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      const t = (parsed as { type: unknown }).type;
      return typeof t === "string" ? t : undefined;
    }
  } catch {
    // Not JSON: a protocol error, reported by the caller.
  }
  return undefined;
}

function isAbort(err: unknown): boolean {
  // DOMException is not always an Error subclass across realms, so match on the name.
  return (
    typeof err === "object" && err !== null && (err as { name?: unknown }).name === "AbortError"
  );
}

/**
 * POSTs the question to /api/chat and reads the event stream.
 * Resolves when the stream ends, or quietly (after an `aborted` event) when `signal` aborts.
 */
export const askStream: AskStream = async (question, { context, signal, onEvent }) => {
  try {
    const request: ChatRequest = { question, ...(context ? { context } : {}) };
    const init: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    };
    if (signal) init.signal = signal;
    const res = await fetch("/api/chat", init);
    if (!res.ok) throw new ChatHttpError(res.status);
    if (!res.body) throw new ChatProtocolError();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      // Keep the last, possibly partial, block in the buffer across reads.
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";
      for (const block of blocks) for (const event of parseBlock(block)) onEvent(event);
    }
    buffer += decoder.decode();
    if (buffer.trim() !== "") for (const event of parseBlock(buffer)) onEvent(event);
  } catch (err) {
    if (isAbort(err)) {
      onEvent({ type: "aborted" });
      return;
    }
    throw err;
  }
};
