"use strict";

let counters = {
  requests: 0,
  accepted: 0,
  rejected: 0,
  scriptsRun: 0,
  scriptsFailed: 0,
  rateLimited: 0,
};

let startedAt = Date.now();

function increment(key, amount = 1) {
  if (!(key in counters)) {
    throw new Error(`Unknown metric: ${key}`);
  }
  counters[key] += amount;
}

function get(key) {
  if (!(key in counters)) {
    throw new Error(`Unknown metric: ${key}`);
  }
  return counters[key];
}

function snapshot() {
  return {
    uptime_ms: Date.now() - startedAt,
    ...counters,
  };
}

function reset() {
  for (const key of Object.keys(counters)) {
    counters[key] = 0;
  }
  startedAt = Date.now();
}

function createMetricsHandler() {
  return function metricsHandler(req, res) {
    const data = snapshot();
    const body = JSON.stringify(data, null, 2);
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  };
}

module.exports = { increment, get, snapshot, reset, createMetricsHandler };
