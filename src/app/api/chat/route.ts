// Reference mock streaming endpoint for the Market Operations console assignment.
//
// It fakes an LLM: it matches the incoming question to a fixture and streams the
// answer back token-by-token as Server-Sent Events. No model, no network call,
// fully deterministic. Use it as-is or replace it with your own equivalent; the
// event contract (see CONTRACT.md) is what matters.
//
// Place this at: app/api/chat/route.ts
// Adjust the import below to wherever you put fixtures.json.

import raw from "@/data/fixtures.json";
import { ChatRequestSchema, FixturesFileSchema, SseEventSchema } from "@/domain/stream";
import { getDataset } from "@/lib/dataset";
import { contextProblem, pickFixture } from "@/lib/stream/pickFixture";

export const runtime = "nodejs";

const fixtures = FixturesFileSchema.parse(raw);

export async function POST(req: Request) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = ChatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { message: "Invalid chat request", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { question, context } = parsed.data;
  const ds = getDataset();
  const problem = context ? contextProblem(ds, context) : undefined;
  if (problem) return Response.json({ message: problem, issues: [] }, { status: 400 });
  const fixture = pickFixture(fixtures, ds, question, context);
  const encoder = new TextEncoder();
  const send = (obj: unknown) => {
    // In development, assert every outgoing event matches the contract before it is enqueued.
    if (process.env.NODE_ENV !== "production") SseEventSchema.parse(obj);
    return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`);
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Error fixture: emit a single error event and stop.
      if (fixture.kind === "error") {
        controller.enqueue(
          send({ type: "error", message: fixture.error ?? "Something went wrong." }),
        );
        controller.close();
        return;
      }

      // Stream the answer one whitespace-delimited token at a time.
      const tokens = fixture.answer.text.match(/\S+\s*/g) ?? [];
      for (const value of tokens) {
        controller.enqueue(send({ type: "token", value }));
        await new Promise((r) => setTimeout(r, 35)); // simulate token latency
      }

      // Final event carries the metadata the trust surface renders.
      controller.enqueue(
        send({
          type: "done",
          kind: fixture.kind,
          citations: fixture.answer.citations,
          confidence: fixture.answer.confidence,
        }),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
