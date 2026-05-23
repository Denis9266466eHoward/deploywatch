"use strict";

// Simple in-memory rate limiter keyed by IP address
// Tracks request counts within a sliding window

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30;

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const store = new Map(); // ip -> [timestamp, ...]

  function cleanup(now, timestamps) {
    const cutoff = now - windowMs;
    return timestamps.filter((t) => t > cutoff);
  }

  function check(ip) {
    const now = Date.now();
    const raw = store.get(ip) ?? [];
    const timestamps = cleanup(now, raw);

    if (timestamps.length >= maxRequests) {
      store.set(ip, timestamps);
      return { allowed: false, remaining: 0, resetMs: timestamps[0] + windowMs - now };
    }

    timestamps.push(now);
    store.set(ip, timestamps);
    return { allowed: true, remaining: maxRequests - timestamps.length, resetMs: windowMs };
  }

  function reset(ip) {
    store.delete(ip);
  }

  function size() {
    return store.size;
  }

  // Periodically prune stale entries to avoid unbounded memory growth
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of store.entries()) {
      const cleaned = cleanup(now, timestamps);
      if (cleaned.length === 0) {
        store.delete(ip);
      } else {
        store.set(ip, cleaned);
      }
    }
  }, windowMs);

  // Allow callers to stop the background pruning
  interval.unref?.();

  function destroy() {
    clearInterval(interval);
    store.clear();
  }

  return { check, reset, size, destroy };
}

module.exports = { createRateLimiter };
