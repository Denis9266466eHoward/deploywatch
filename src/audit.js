"use strict";

const { log } = require("./logger");

// In-memory ring buffer for recent audit events
const MAX_ENTRIES = 200;
let entries = [];

function record(event) {
  const entry = {
    ts: Date.now(),
    event: event.type,
    repo: event.repo || null,
    ref: event.ref || null,
    ip: event.ip || null,
    status: event.status,
    detail: event.detail || null,
  };

  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }

  log(
    "info",
    `audit ${entry.event} status=${entry.status}` +
      (entry.repo ? ` repo=${entry.repo}` : "") +
      (entry.ref ? ` ref=${entry.ref}` : "") +
      (entry.ip ? ` ip=${entry.ip}` : "")
  );
}

function recent(limit) {
  const n = Math.min(limit || 50, entries.length);
  return entries.slice(-n);
}

function clear() {
  entries = [];
}

function createAuditHandler() {
  return function auditHandler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const data = recent(limit);
    const body = JSON.stringify({ count: data.length, entries: data });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    res.end(body);
  };
}

module.exports = { record, recent, clear, createAuditHandler };
