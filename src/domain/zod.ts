import { config } from "zod";

// zod 4 probes for eval with `new Function("")` the first time a schema parses. Under our
// Content-Security-Policy (no 'unsafe-eval') the probe throws, zod catches it and falls back, but the browser
// still records a script-src violation that DevTools shows as an Issue. Jitless skips the probe; the result is
// the same as what the policy already forces. Each schema module imports this file before it builds a schema.
// Only `config` is imported, so zod stays tree-shaken: re-exporting the `z` namespace from a module with a side
// effect pulled all of zod into the Analyst bundle.
config({ jitless: true });
