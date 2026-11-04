import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest runs without globals, so Testing Library cannot register its own cleanup. Without this, every
// rendered tree stays mounted until the file ends, and React work still scheduled when jsdom tears down
// throws "window is not defined".
afterEach(cleanup);
