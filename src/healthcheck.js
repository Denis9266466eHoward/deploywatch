"use strict";

const { log } = require("./logger");

const startTime = Date.now();

/**
 * Returns uptime in seconds.
 */
function getUptime() {
  return Math.floor((Date.now() - startTime) / 1000);
}

/**
 * Builds the health status object.
 * @param {object} config - loaded deploywatch config
 * @returns {object}
 */
function buildStatus(config) {
  return {
    status: "ok",
    uptime: getUptime(),
    hooks: config.hooks ? config.hooks.length : 0,
    version: require("../package.json").version,
  };
}

/**
 * Creates an HTTP request handler for GET /healthz.
 * Responds with JSON status; 404 for all other paths.
 * @param {object} config
 * @returns {Function}
 */
function createHealthHandler(config) {
  return function healthHandler(req, res) {
    if (req.method === "GET" && req.url === "/healthz") {
      const body = JSON.stringify(buildStatus(config));
      log("debug", "healthcheck requested");
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      });
      res.end(body);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  };
}

module.exports = { createHealthHandler, buildStatus, getUptime };
