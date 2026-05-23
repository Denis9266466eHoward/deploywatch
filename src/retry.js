"use strict";

// Retry logic for failed script executions
// Supports exponential backoff with configurable limits

const { log } = require("./logger");

function createRetry(options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelay = options.baseDelay ?? 1000;
  const maxDelay = options.maxDelay ?? 30000;
  const factor = options.factor ?? 2;

  function calcDelay(attempt) {
    const delay = baseDelay * Math.pow(factor, attempt - 1);
    return Math.min(delay, maxDelay);
  }

  async function withRetry(fn, context = {}) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await fn(attempt);
        if (attempt > 1) {
          log("info", "retry succeeded", { ...context, attempt });
        }
        return result;
      } catch (err) {
        lastError = err;
        log("warn", "attempt failed", {
          ...context,
          attempt,
          maxAttempts,
          error: err.message,
        });

        if (attempt < maxAttempts) {
          const delay = calcDelay(attempt);
          log("debug", "retrying after delay", { ...context, delay });
          await sleep(delay);
        }
      }
    }

    log("error", "all attempts exhausted", { ...context, maxAttempts });
    throw lastError;
  }

  return { withRetry, calcDelay };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { createRetry, sleep };
