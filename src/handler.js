"use strict";

const { verifySignature } = require("./signature");
const { matchesFilters, extractContext } = require("./filters");
const { createQueue } = require("./queue");
const { createRateLimiter } = require("./ratelimit");
const { increment } = require("./metrics");
const { log } = require("./logger");

function createHandler(config, runner) {
  const queue = createQueue(runner, { concurrency: config.concurrency || 1 });
  const limiter = config.rateLimit
    ? createRateLimiter(config.rateLimit)
    : null;

  return async function handler(req, res) {
    increment("requests");

    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "text/plain" });
      res.end("Method Not Allowed");
      return;
    }

    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1024 * 512) {
        res.writeHead(413, { "Content-Type": "text/plain" });
        res.end("Payload Too Large");
        increment("rejected");
        return;
      }
    }

    if (config.secret) {
      const sig = req.headers["x-hub-signature-256"] || "";
      if (!verifySignature(body, config.secret, sig)) {
        log("warn", "signature verification failed");
        increment("rejected");
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        return;
      }
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      increment("rejected");
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad Request");
      return;
    }

    const ctx = extractContext(payload);

    if (limiter && !limiter.check(ctx.repo || "global")) {
      log("warn", `rate limit hit for ${ctx.repo}`);
      increment("rateLimited");
      increment("rejected");
      res.writeHead(429, { "Content-Type": "text/plain" });
      res.end("Too Many Requests");
      return;
    }

    if (!matchesFilters(payload, config.filters || {})) {
      log("info", `filters did not match for ${ctx.repo}/${ctx.branch}`);
      increment("rejected");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Ignored");
      return;
    }

    increment("accepted");
    log("info", `queuing script for ${ctx.repo}/${ctx.branch}`);
    queue.enqueue(ctx);

    res.writeHead(202, { "Content-Type": "text/plain" });
    res.end("Accepted");
  };
}

module.exports = { createHandler };
