// Receives error reports from the browser (lib/events.ts reportError) and writes each as one JSON line to the
// server log, where Vercel's log search and drains pick it up. Nothing is stored here.
import { ErrorReportSchema } from "@/domain/errors";

const MAX_BYTES = 4096;

export async function POST(request: Request) {
  // Refuse an oversized body before reading it, so the cap bounds memory as well as the log line.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) {
    return new Response(null, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse((await request.text()).slice(0, MAX_BYTES));
  } catch {
    return new Response(null, { status: 400 });
  }
  const report = ErrorReportSchema.safeParse(body);
  if (!report.success) return new Response(null, { status: 400 });
  console.error(JSON.stringify({ origin: "client", ...report.data }));
  return new Response(null, { status: 204 });
}
