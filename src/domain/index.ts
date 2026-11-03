// The domain barrel carries the types and the pure logic. The zod schemas and the parsers built on them live
// in dataset.ts, stream.ts and alerts.ts and are imported from those modules directly (the server routes, the
// dataset loader, the alert form and the tests do), so a client component that needs `entityName` cannot drag
// the schema library into the first bundle by importing this file.
export type * from "./dataset";
export type * from "./stream";
export type * from "./alerts";
export * from "./regions";
export * from "./scope";
export * from "./periods";
export * from "./metrics";
export * from "./citations";
export * from "./status";
export * from "./provenance";
export * from "./assistantPrefs";
export { isSseEvent, parseSseLineLite } from "./sseGuard";
