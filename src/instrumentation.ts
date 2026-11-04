import type { Instrumentation } from "next";

import { describeError } from "@/lib/events";

/**
 * Server-side failures, logged. A throw while rendering a page, in a route handler or in the proxy is written as one
 * JSON line with the same fields the browser reports through /api/errors (lib/events.ts), plus where it happened and
 * Next's digest, which is what the error page shows the reader as its reference. Vercel's log search and drains
 * read the line; nothing is stored here. Next calls this once per failed request, after the response is on its way.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const line = {
    origin: "server",
    level: "error",
    source: context.routeType,
    ...describeError(error),
    ...(typeof error === "object" && error !== null && "digest" in error
      ? { digest: String((error as { digest: unknown }).digest) }
      : {}),
    route: context.routePath,
    path: request.path.split("?")[0] ?? request.path,
    method: request.method,
    renderSource: context.renderSource,
    at: new Date().toISOString(),
  };
  console.error(JSON.stringify(line));
};
