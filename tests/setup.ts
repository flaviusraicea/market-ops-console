import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// The assistant keeps the tab's conversation in sessionStorage; each test starts with an empty tab.
afterEach(() => {
  if (typeof window !== "undefined") window.sessionStorage.clear();
});
