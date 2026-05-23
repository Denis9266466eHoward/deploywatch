"use strict";

const { verifySignature } = require("./signature");
const { matchesFilters, extractContext } = require("./filters");
const { runOnce, buildEnv } = require("./runner");
const { createRateLimiter } = require("./ratelimit");
const { enqueue } = require("./queue");
const { increment } = require("./metrics");
const { record } = require("./audit");
const { log } = require("./logger");

function createHandler(config, queue) {
  const limiter = createRateLimiter({ windowMs: 60000, max: config.rateLimit || 30 });

  return async function handler(req, res) {
    const ip = req.socket.remoteAddress || "unknown";

    if (req.method !== "POST") {
      res.writeHead(405).end("Method Not Allowed");
      return;
    }

    if (!limiter.check(ip)) {
      increment("webhook.rate_limited");
      record({ type: "webhook", ip, status: "rate_limited" });
      res.writeHead(429).end("Too Many Requests");
      return;
    }

    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    await new Promise((r) => req.on("end", r));
    const rawBody = Buffer.concat(chunks);

    const sig = req.headers["x-hub-signature-256"];
    if (!verifySignature(rawBody, sig, config.secret)) {
      increment("webhook.invalid_signature");
      record({ type: "webhook", ip, status: "invalid_signature" });
      res.writeHead(401).end("Unauthorized");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString());
    } catch {
      res.writeHead(400).end("Bad Request");
      return;
    }

    const ctx = extractContext(payload);

    for (const hook of config.hooks || []) {
      if (!matchesFilters(payload, hook.filters || {})) continue;

      const env = buildEnv(ctx);
      const task = () =>
        runOnce(hook.script, env).then((result) => {
          const status = result.code === 0 ? "ok" : "error";
          increment(status === "ok" ? "hook.success" : "hook.error");
          record({ type: "deploy", repo: ctx.repo, ref: ctx.ref, ip, status, detail: hook.script });
          log("info", `hook ${hook.script} exited ${result.code} for ${ctx.repo}`);
        });

      enqueue(queue, task);
      increment("webhook.accepted");
    }

    res.writeHead(200).end("OK");
  };
}

module.exports = { createHandler };
