"use strict";

const { createRateLimiter } = require("./ratelimit");

describe("createRateLimiter", () => {
  let limiter;

  afterEach(() => {
    limiter?.destroy();
  });

  test("allows requests under the limit", () => {
    limiter = createRateLimiter({ maxRequests: 5, windowMs: 60000 });
    for (let i = 0; i < 5; i++) {
      const result = limiter.check("1.2.3.4");
      expect(result.allowed).toBe(true);
    }
  });

  test("blocks requests over the limit", () => {
    limiter = createRateLimiter({ maxRequests: 3, windowMs: 60000 });
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    const result = limiter.check("1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetMs).toBeGreaterThan(0);
  });

  test("tracks different IPs independently", () => {
    limiter = createRateLimiter({ maxRequests: 2, windowMs: 60000 });
    limiter.check("1.1.1.1");
    limiter.check("1.1.1.1");
    const blocked = limiter.check("1.1.1.1");
    expect(blocked.allowed).toBe(false);

    const other = limiter.check("2.2.2.2");
    expect(other.allowed).toBe(true);
  });

  test("reset clears the record for an IP", () => {
    limiter = createRateLimiter({ maxRequests: 1, windowMs: 60000 });
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4").allowed).toBe(false);
    limiter.reset("1.2.3.4");
    expect(limiter.check("1.2.3.4").allowed).toBe(true);
  });

  test("allows requests again after the window expires", async () => {
    limiter = createRateLimiter({ maxRequests: 1, windowMs: 50 });
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4").allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 60));
    expect(limiter.check("1.2.3.4").allowed).toBe(true);
  });

  test("size returns number of tracked IPs", () => {
    limiter = createRateLimiter({ maxRequests: 10, windowMs: 60000 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c");
    expect(limiter.size()).toBe(3);
  });
});
