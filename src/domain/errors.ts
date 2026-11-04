import { z } from "zod";

/** Where a reported failure came from: a render boundary, a window event, or a failed stream or request. */
const ERROR_SOURCES = ["boundary", "window", "promise", "stream", "fetch"] as const;

/**
 * One failure as the browser reports it (lib/events.ts reportError) and the server accepts it
 * (app/api/errors/route.ts). The client imports only the inferred type, so zod stays on the server.
 */
export const ErrorReportSchema = z.object({
  level: z.literal("error"),
  source: z.enum(ERROR_SOURCES),
  name: z.string().max(60),
  message: z.string().min(1).max(500),
  /** The first lines of the stack; the rest is noise in a log line. */
  stack: z.string().max(2000).optional(),
  /** Which widget's boundary caught it, for source "boundary". */
  widget: z.string().max(60).optional(),
  /** The request that failed, for sources "stream" and "fetch". */
  route: z.string().max(100).optional(),
  /** The page the user was on, without the query string. */
  path: z.string().max(200).optional(),
  at: z.string().max(40),
});
export type ErrorReport = z.infer<typeof ErrorReportSchema>;
export type ErrorSource = ErrorReport["source"];
