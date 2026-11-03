import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatContextSchema } from "@/domain/stream";
import { askStream, ChatHttpError, type StreamEvent } from "@/lib/stream/chatClient";

const enc = new TextEncoder();

function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("askStream", () => {
  it("emits events in order and keeps a block split across chunks", async () => {
    const body = streamOf([
      'data: {"type":"token","value":"Three "}\n\n',
      'data: {"type":"token","va',
      'lue":"markets "}\n\ndata: {"type":"done","kind":"normal","citations":[],"confidence":"high"}\n\n',
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    const events: StreamEvent[] = [];
    await askStream("q", { onEvent: (e) => events.push(e) });
    expect(events).toEqual([
      { type: "token", value: "Three " },
      { type: "token", value: "markets " },
      { type: "done", kind: "normal", citations: [], confidence: "high" },
    ]);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe("/api/chat");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ question: "q" }));
  });

  it("sends the view the question is about, when there is one", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(streamOf([]), { status: 200 })));
    const context = { entity: { kind: "market", marketId: "de" }, period: "2026-03" } as const;
    await askStream("q", { context: ChatContextSchema.parse(context), onEvent: () => {} });
    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(init?.body).toBe(JSON.stringify({ question: "q", context }));
  });

  it("resolves and emits `aborted` when aborted mid-stream", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        const body = new ReadableStream<Uint8Array>({
          start(c) {
            c.enqueue(enc.encode('data: {"type":"token","value":"Hi "}\n\n'));
            init.signal?.addEventListener("abort", () =>
              c.error(new DOMException("Aborted", "AbortError")),
            );
          },
        });
        return Promise.resolve(new Response(body, { status: 200 }));
      }),
    );
    const events: StreamEvent[] = [];
    const done = askStream("q", {
      signal: controller.signal,
      onEvent: (e) => {
        events.push(e);
        if (e.type === "token") controller.abort();
      },
    });
    await expect(done).resolves.toBeUndefined();
    expect(events).toEqual([{ type: "token", value: "Hi " }, { type: "aborted" }]);
  });

  it("throws ChatHttpError on a non-2xx response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    await expect(askStream("q", { onEvent: () => {} })).rejects.toBeInstanceOf(ChatHttpError);
    await expect(askStream("q", { onEvent: () => {} })).rejects.toMatchObject({ status: 500 });
  });

  it("throws ChatProtocolError on unreadable data and ignores unknown event types", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(streamOf(["data: {nope\n\n"]), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(
            streamOf(['data: {"type":"ping"}\n\ndata: {"type":"token","value":"a"}\n\n']),
            {
              status: 200,
            },
          ),
        ),
    );
    await expect(askStream("q", { onEvent: () => {} })).rejects.toMatchObject({
      name: "ChatProtocolError",
    });
    const events: StreamEvent[] = [];
    await askStream("q", { onEvent: (e) => events.push(e) });
    expect(events).toEqual([{ type: "token", value: "a" }]);
  });
});
