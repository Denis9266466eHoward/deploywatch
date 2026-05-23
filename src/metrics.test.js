"use strict";

const http = require("http");
const { increment, get, snapshot, reset, createMetricsHandler } = require("./metrics");

beforeEach(() => {
  reset();
});

test("increment increases a counter", () => {
  increment("requests");
  increment("requests");
  expect(get("requests")).toBe(2);
});

test("increment accepts a custom amount", () => {
  increment("scriptsRun", 5);
  expect(get("scriptsRun")).toBe(5);
});

test("increment throws on unknown key", () => {
  expect(() => increment("unknown")).toThrow("Unknown metric: unknown");
});

test("get throws on unknown key", () => {
  expect(() => get("nope")).toThrow("Unknown metric: nope");
});

test("snapshot includes all counters and uptime", () => {
  increment("accepted");
  increment("rejected", 3);
  const s = snapshot();
  expect(s.accepted).toBe(1);
  expect(s.rejected).toBe(3);
  expect(s.requests).toBe(0);
  expect(typeof s.uptime_ms).toBe("number");
  expect(s.uptime_ms).toBeGreaterThanOrEqual(0);
});

test("reset zeroes all counters", () => {
  increment("requests", 10);
  increment("scriptsFailed", 2);
  reset();
  expect(get("requests")).toBe(0);
  expect(get("scriptsFailed")).toBe(0);
});

function listen(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("createMetricsHandler returns JSON snapshot over HTTP", async () => {
  increment("rateLimited", 7);
  const server = await listen(createMetricsHandler());
  const { port } = server.address();
  const data = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/metrics`, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    }).on("error", reject);
  });
  expect(data.status).toBe(200);
  const parsed = JSON.parse(data.body);
  expect(parsed.rateLimited).toBe(7);
  expect(typeof parsed.uptime_ms).toBe("number");
  await new Promise((r) => server.close(r));
});
