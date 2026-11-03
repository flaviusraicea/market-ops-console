// Receives error reports from the browser (lib/events.ts reportError) and writes each as one JSON line to the
// server log, where Vercel's log search and drains pick it up. Nothing is stored here.
const MAX_BYTES = 4096;
const SOURCES = new Set(["boundary", "window", "promise"]);

const text = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : undefined);

export async function POST(request: Request) {
  const raw = (await request.text()).slice(0, MAX_BYTES);
  try {
    const body: unknown = JSON.parse(raw);
    if (typeof body !== "object" || body === null) return new Response(null, { status: 400 });
    const b = body as Record<string, unknown>;
    const source = typeof b["source"] === "string" && SOURCES.has(b["source"]) ? b["source"] : null;
    const message = text(b["message"], 500);
    if (!source || !message) return new Response(null, { status: 400 });
    const stack = text(b["stack"], 2000);
    const widget = text(b["widget"], 60);
    const path = text(b["path"], 200);
    console.error(
      JSON.stringify({
        level: "error",
        origin: "client",
        source,
        name: text(b["name"], 60) ?? "Error",
        message,
        ...(stack ? { stack } : {}),
        ...(widget ? { widget } : {}),
        ...(path ? { path } : {}),
        at: text(b["at"], 40) ?? new Date().toISOString(),
      }),
    );
    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 400 });
  }
}
