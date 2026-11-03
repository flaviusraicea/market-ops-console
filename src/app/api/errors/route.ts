// Receives error reports from the browser (lib/events.ts reportError) and writes each as one JSON line to the
// server log, where Vercel's log search and drains pick it up. Nothing is stored here.
import { ErrorReportSchema } from "@/domain/errors";

const MAX_BYTES = 4096;

export async function POST(request: Request) {
  // Refuse an oversized body early when the length is declared, and stop reading at the cap when it is not
  // (chunked bodies carry no content-length), so the cap bounds memory as well as the log line.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }
  const text = await readWithin(request, MAX_BYTES);
  if (text === null) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const report = ErrorReportSchema.safeParse(body);
  if (!report.success) return new Response(null, { status: 400 });
  console.error(JSON.stringify({ origin: "client", ...report.data }));
  return new Response(null, { status: 204 });
}

/** The body as text, or null as soon as it grows past `limit` bytes. */
async function readWithin(request: Request, limit: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    bytes += value.byteLength;
    if (bytes > limit) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}
