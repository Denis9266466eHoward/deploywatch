"use strict";

const logger = require("./logger");

describe("logger", () => {
  let lines;
  let errLines;

  beforeEach(() => {
    lines = [];
    errLines = [];
    logger.setLevel("debug");
    logger.setOutput(
      (line) => lines.push(line),
      (line) => errLines.push(line)
    );
  });

  afterEach(() => {
    // restore defaults
    logger.setLevel("info");
    logger.setOutput(console.log, console.error);
  });

  test("info message appears in output", () => {
    logger.info("server started", { port: 3000 });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\[INFO\]/);
    expect(lines[0]).toMatch(/server started/);
    expect(lines[0]).toMatch(/"port":3000/);
  });

  test("debug suppressed when level is info", () => {
    logger.setLevel("info");
    logger.debug("verbose stuff");
    expect(lines).toHaveLength(0);
  });

  test("debug visible when level is debug", () => {
    logger.debug("trace detail");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\[DEBUG\]/);
  });

  test("error goes to error output", () => {
    logger.error("something broke", { code: 500 });
    expect(errLines).toHaveLength(1);
    expect(errLines[0]).toMatch(/\[ERROR\]/);
    expect(lines).toHaveLength(0);
  });

  test("warn goes to error output", () => {
    logger.warn("watch out");
    expect(errLines).toHaveLength(1);
    expect(errLines[0]).toMatch(/\[WARN\]/);
  });

  test("message without meta has no trailing JSON", () => {
    logger.info("clean message");
    expect(lines[0]).not.toMatch(/\{/);
  });

  test("setLevel throws on unknown level", () => {
    expect(() => logger.setLevel("verbose")).toThrow(/Unknown log level/);
  });
});
