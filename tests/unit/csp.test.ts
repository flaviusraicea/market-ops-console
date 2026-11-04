import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "@/lib/csp";

describe("contentSecurityPolicy", () => {
  it("allows scripts only by nonce in production", () => {
    const policy = contentSecurityPolicy("abc");
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toContain("ws:");
  });

  it("adds eval and the hot-reload socket in development only", () => {
    const policy = contentSecurityPolicy("abc", true);
    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' ws:");
  });
});
