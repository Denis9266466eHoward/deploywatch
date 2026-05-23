"use strict";

const http = require("http");
const { record, recent, clear, createAuditHandler } = require("./audit");

beforeEach(() => clear());

test("record stores an entry", () => {
  record({ type: "push", repo: "org/repo", ref: "refs/heads/main", ip: "1.2.3.4", status: "ok" });
  const r = recent(10);
  expect(r).toHaveLength(1);
  expect(r[0].event).toBe("push");
  expect(r[0].repo).toBe("org/repo");
  expect(r[0].status).toBe("ok");
});

test("recent respects limit", () => {
  for (let i = 0; i < 10; i++) {
    record({ type: "push", status: "ok" });
  }
  expect(recent(3)).toHaveLength(3);
  expect(recent(100)).toHaveLength(10);
});

test("ring buffer caps at 200", () => {
  for (let i = 0; i < 250; i++) {
    record({ type: "push", status: "ok" });
  }
  expect(recent(250)).toHaveLength(200);
});

test("clear empties entries", () => {
  record({ type: "push", status: "ok" });
  clear();
  expect(recent(10)).toHaveLength(0);
});

function listen(handler) {
  return new Promise((resolve) => {
    const srv = http.createServer(handler);
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

function request(srv, path) {
  return new Promise((resolve) => {
    const { port } = srv.address();
    http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    });
  });
}

test("audit handler returns json", async () => {
  record({ type: "deploy", repo: "x/y", status: "ok" });
  const handler = createAuditHandler();
  const srv = await listen(handler);
  try {
    const res = await request(srv, "/audit?limit=5");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.entries[0].event).toBe("deploy");
  } finally {
    srv.close();
  }
});
