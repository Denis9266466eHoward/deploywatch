"use strict";

const { createQueue } = require("./queue");

describe("createQueue", () => {
  test("runs tasks serially for the same key", async () => {
    const queue = createQueue();
    const order = [];

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    queue.enqueue("deploy", async () => {
      await delay(30);
      order.push(1);
    });

    queue.enqueue("deploy", async () => {
      await delay(10);
      order.push(2);
    });

    queue.enqueue("deploy", async () => {
      order.push(3);
    });

    await queue.drain();
    expect(order).toEqual([1, 2, 3]);
  });

  test("runs tasks for different keys concurrently (independent chains)", async () => {
    const queue = createQueue();
    const finished = [];
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    const p1 = queue.enqueue("a", async () => {
      await delay(40);
      finished.push("a");
    });
    const p2 = queue.enqueue("b", async () => {
      await delay(10);
      finished.push("b");
    });

    await Promise.all([p1, p2]);
    expect(finished[0]).toBe("b");
    expect(finished[1]).toBe("a");
  });

  test("pending() returns number of active keys", async () => {
    const queue = createQueue();
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));

    queue.enqueue("x", () => delay(50));
    queue.enqueue("y", () => delay(50));

    expect(queue.pending()).toBe(2);
    await queue.drain();
    expect(queue.pending()).toBe(0);
  });

  test("swallows task errors and continues queue", async () => {
    const queue = createQueue();
    const results = [];

    await queue.enqueue("k", async () => {
      throw new Error("boom");
    });

    await queue.enqueue("k", async () => {
      results.push("ok");
    });

    expect(results).toEqual(["ok"]);
  });
});
