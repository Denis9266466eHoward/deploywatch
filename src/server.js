"use strict";

const http = require("http");
const { createHandler } = require("./handler");
const { createHealthHandler } = require("./healthcheck");
const { log } = require("./logger");

/**
 * Creates and starts an HTTP server that routes:
 *   POST /webhook  -> deploywatch handler
 *   GET  /healthz  -> health check
 * @param {object} config
 * @returns {http.Server}
 */
function createServer(config) {
  const webhookHandler = createHandler(config);
  const healthHandler = createHealthHandler(config);

  const server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/webhook") {
      webhookHandler(req, res);
    } else if (req.method === "GET" && req.url === "/healthz") {
      healthHandler(req, res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });

  const port = config.port || 9000;
  server.listen(port, () => {
    log("info", `deploywatch listening on port ${port}`);
  });

  return server;
}

/**
 * Gracefully shuts down the server.
 * @param {http.Server} server
 * @returns {Promise<void>}
 */
function shutdown(server) {
  return new Promise((resolve, reject) => {
    log("info", "shutting down server");
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

module.exports = { createServer, shutdown };
