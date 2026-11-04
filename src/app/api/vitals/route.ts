// Receives Web Vitals beacons from the browser (lib/vitals.tsx) and writes each as one JSON line to the server
// log, the same way /api/errors does, where Vercel's log search and drains pick it up. Nothing is stored here.
import { VitalReportSchema } from "@/domain/vitals";
import { readWithin } from "@/lib/readWithin";

const MAX_BYTES = 1024;

export async function POST(request: Request) {
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
  const vital = VitalReportSchema.safeParse(body);
  if (!vital.success) return new Response(null, { status: 400 });
  console.info(JSON.stringify({ origin: "client", kind: "vital", ...vital.data }));
  return new Response(null, { status: 204 });
}
