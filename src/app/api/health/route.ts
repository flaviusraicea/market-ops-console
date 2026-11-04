/** A reachability probe: Retry on the offline notice asks this before it sends the held navigation. */
export function GET() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
