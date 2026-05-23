"use strict";

const { createRetry, sleep } = require("./retry");

describe("createRetry", () => {
  test("resolves immediately on first success", async () => {
    const { withRetry } = createRetry({ maxAttempts: 3, baseDelay: 10 });
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retries on failure then succeeds", async () => {
    const { withRetry } = createRetry({ maxAttempts: 3, baseDelay: 10 });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn);
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("throws after all attempts exhausted", async () => {
    const { withRetry } = createRetry({ maxAttempts: 3, baseDelay: 10 });
    const fn = jest.fn().mockRejectedValue(new Error("always fails"));
    await expect(withRetry(fn)).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  test("passes attempt number to fn", async () => {
    const { withRetry } = createRetry({ maxAttempts: 3, baseDelay: 10 });
    const attempts = [];
    const fn = jest.fn().mockImplementation((attempt) => {
      attempts.push(attempt);
      if (attempt < 3) throw new Error("not yet");
      return "done";
    });
    const result = await withRetry(fn);
    expect(result).toBe("done");
    expect(attempts).toEqual([1, 2, 3]);
  });

  test("calcDelay returns exponential backoff capped at maxDelay", () => {
    const { calcDelay } = createRetry({
      baseDelay: 1000,
      maxDelay: 5000,
      factor: 2,
    });
    expect(calcDelay(1)).toBe(1000);
    expect(calcDelay(2)).toBe(2000);
    expect(calcDelay(3)).toBe(4000);
    expect(calcDelay(4)).toBe(5000); // capped
  });

  test("defaults to 3 max attempts", async () => {
    const { withRetry } = createRetry({ baseDelay: 10 });
    const fn = jest.fn().mockRejectedValue(new Error("nope"));
    await expect(withRetry(fn)).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe("sleep", () => {
  test("resolves after roughly the given ms", async () => {
    const start = Date.now();
    await sleep(50);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });
});
