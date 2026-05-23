"use strict";

// Simple serial execution queue so concurrent webhook hits
// don't spawn overlapping deploy scripts for the same hook.

const { log } = require("./logger");

function createQueue() {
  const queues = new Map(); // key -> Promise chain

  function enqueue(key, task) {
    const prev = queues.get(key) || Promise.resolve();

    const next = prev
      .then(() => task())
      .catch((err) => {
        log("error", `queue task failed for key "${key}": ${err.message}`);
      })
      .finally(() => {
        // Clean up if this is still the tail
        if (queues.get(key) === next) {
          queues.delete(key);
        }
      });

    queues.set(key, next);
    return next;
  }

  function depth(key) {
    return queues.has(key) ? 1 : 0;
  }

  function pending() {
    return queues.size;
  }

  function drain() {
    return Promise.all([...queues.values()]);
  }

  return { enqueue, depth, pending, drain };
}

module.exports = { createQueue };
