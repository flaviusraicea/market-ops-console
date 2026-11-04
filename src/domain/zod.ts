import { z } from "zod";

// zod 4 probes for eval with `new Function("")` the first time a schema parses. Under our
// Content-Security-Policy (no 'unsafe-eval') the probe throws, zod catches it and falls back, but the browser
// still records a script-src violation that DevTools shows as an Issue. Jitless skips the probe; the result is
// the same as what the policy already forces. Every schema module imports zod from here, so this runs first.
z.config({ jitless: true });

export { z };
