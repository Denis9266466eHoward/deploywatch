"use strict";

// Runs a configured deploy script as a child process
// Supports retry via createRetry and captures stdout/stderr

const { spawn } = require("child_process");
const { log } = require("./logger");
const { createRetry } = require("./retry");

function buildEnv(context) {
  return {
    ...process.env,
    DEPLOY_REPO: context.repo ?? "",
    DEPLOY_BRANCH: context.branch ?? "",
    DEPLOY_PUSHER: context.pusher ?? "",
    DEPLOY_COMMIT: context.commit ?? "",
    DEPLOY_REF: context.ref ?? "",
  };
}

function runOnce(script, env) {
  return new Promise((resolve, reject) => {
    const proc = spawn("sh", ["-c", script], { env, timeout: 60000 });
    const out = [];
    const err = [];

    proc.stdout.on("data", (d) => out.push(d));
    proc.stderr.on("data", (d) => err.push(d));

    proc.on("close", (code) => {
      const stdout = Buffer.concat(out).toString().trim();
      const stderr = Buffer.concat(err).toString().trim();
      if (code === 0) {
        resolve({ code, stdout, stderr });
      } else {
        const error = new Error(`script exited with code ${code}`);
        error.code = code;
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });

    proc.on("error", reject);
  });
}

async function runScript(script, context, retryOptions = {}) {
  const env = buildEnv(context);
  const { withRetry } = createRetry(retryOptions);
  const label = { script, repo: context.repo, branch: context.branch };

  log("info", "running script", label);

  const result = await withRetry(async () => {
    return runOnce(script, env);
  }, label);

  log("info", "script completed", { ...label, stdout: result.stdout });
  return result;
}

module.exports = { runScript, buildEnv };
