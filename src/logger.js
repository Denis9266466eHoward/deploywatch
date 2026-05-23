"use strict";

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

let currentLevel = LEVELS.info;
let outputFn = console.log;
let errorFn = console.error;

function setLevel(level) {
  if (!(level in LEVELS)) {
    throw new Error(`Unknown log level: ${level}`);
  }
  currentLevel = LEVELS[level];
}

function setOutput(fn, errFn) {
  outputFn = fn;
  if (errFn) errorFn = errFn;
}

function formatMessage(level, message, meta) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level.toUpperCase()}] ${message}`;
  if (meta && Object.keys(meta).length > 0) {
    return `${base} ${JSON.stringify(meta)}`;
  }
  return base;
}

function log(level, message, meta = {}) {
  if (LEVELS[level] < currentLevel) return;
  const line = formatMessage(level, message, meta);
  if (level === "error" || level === "warn") {
    errorFn(line);
  } else {
    outputFn(line);
  }
}

const logger = {
  debug: (msg, meta) => log("debug", msg, meta),
  info:  (msg, meta) => log("info",  msg, meta),
  warn:  (msg, meta) => log("warn",  msg, meta),
  error: (msg, meta) => log("error", msg, meta),
  setLevel,
  setOutput,
};

module.exports = logger;
