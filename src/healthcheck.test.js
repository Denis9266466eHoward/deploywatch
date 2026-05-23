"use strict";

const http = require("http");
const { createHealthHandler, buildStatus } = require("./healthcheck");
const { setOutput } = require("./logger");

// suppress log output during tests
setOutput(() => {});

const fakeConfig = { hooks: [{}, {}] };

function makeRequest(server, path, method = "GET") {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request({ host: "127.0.0.1", port, path, method }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

function listen(handler) {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

test("buildStatus returns expected shape", () => {
  const status = buildStatus(fakeConfig);
  expect(status.status).toBe("ok");
  expect(status.hooks).toBe(2);
  expect(typeof status.uptime).toBe("number");
  expect(typeof status.version).toBe("string");
});

test("GET /healthz returns 200 with JSON body", async () => {
  const server = await listen(createHealthHandler(fakeConfig));
  try {
    const { status, body } = await makeRequest(server, "/healthz");
    expect(status).toBe(200);
    const parsed = JSON.parse(body);
    expect(parsed.status).toBe("ok");
    expect(parsed.hooks).toBe(2);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("GET /other returns 404", async () => {
  const server = await listen(createHealthHandler(fakeConfig));
  try {
    const { status } = await makeRequest(server, "/other");
    expect(status).toBe(404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});

test("POST /healthz returns 404", async () => {
  const server = await listen(createHealthHandler(fakeConfig));
  try {
    const { status } = await makeRequest(server, "/healthz", "POST");
    expect(status).toBe(404);
  } finally {
    await new Promise((r) => server.close(r));
  }
});
