"use strict";

const { verifySignature } = require("./signature");
const { matchesFilters, extractContext } = require("./filters");
const { runScript } = require("./runner");
const { createQueue } = require("./queue");
const { log } = require("./logger");

const queue = createQueue();

function createHandler(config) {
  return function handler(req, res) {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        body = "";
        res.writeHead(413);
        res.end("payload too large");
        req.destroy();
      }
    });

    req.on("end", () => {
      const sig = req.headers["x-hub-signature-256"];

      if (config.secret) {
        if (!sig || !verifySignature(body, config.secret, sig)) {
          log("warn", "signature verification failed");
          res.writeHead(401);
          res.end("unauthorized");
          return;
        }
      }

      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        res.writeHead(400);
        res.end("invalid json");
        return;
      }

      const event = req.headers["x-github-event"] || "push";
      if (event !== "push") {
        res.writeHead(200);
        res.end("ignored");
        return;
      }

      const ctx = extractContext(payload);

      const matched = (config.hooks || []).filter((hook) =>
        matchesFilters(hook.filters || {}, ctx)
      );

      if (matched.length === 0) {
        log("info", `no hooks matched for ref=${ctx.ref} repo=${ctx.repo}`);
        res.writeHead(200);
        res.end("no match");
        return;
      }

      res.writeHead(202);
      res.end("accepted");

      for (const hook of matched) {
        const queueKey = hook.script;
        queue.enqueue(queueKey, () => runScript(hook.script, ctx));
      }
    });
  };
}

module.exports = { createHandler };
