const { spawn } = require('child_process');

/**
 * Run a shell script, passing context as environment variables.
 * @param {string} scriptPath - Path to the script to execute
 * @param {Object} context - Key/value pairs to inject as env vars
 * @param {Function} logger - Optional logging function
 * @returns {Promise<{code: number, stdout: string, stderr: string}>}
 */
function runScript(scriptPath, context = {}, logger = console.log) {
  return new Promise((resolve, reject) => {
    const env = buildEnv(context);

    logger(`[runner] executing: ${scriptPath}`);

    const child = spawn('sh', [scriptPath], {
      env,
      timeout: 60000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to start script: ${err.message}`));
    });

    child.on('close', (code) => {
      logger(`[runner] script exited with code ${code}`);
      if (code !== 0) {
        logger(`[runner] stderr: ${stderr.trim()}`);
      }
      resolve({ code, stdout, stderr });
    });
  });
}

/**
 * Build environment variables from context, prefixed with DW_.
 * @param {Object} context
 * @returns {Object}
 */
function buildEnv(context) {
  const env = { ...process.env };
  for (const [key, value] of Object.entries(context)) {
    if (value !== null && value !== undefined) {
      env[`DW_${key.toUpperCase()}`] = String(value);
    }
  }
  return env;
}

module.exports = { runScript, buildEnv };
