const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG = {
  port: 9000,
  secret: '',
  hooks: []
};

function loadConfig(configPath) {
  const resolved = path.resolve(configPath || 'deploywatch.json');

  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (err) {
    throw new Error(`Failed to parse config: ${err.message}`);
  }

  const config = Object.assign({}, DEFAULT_CONFIG, raw);

  if (!Array.isArray(config.hooks)) {
    throw new Error('Config "hooks" must be an array');
  }

  config.hooks.forEach((hook, i) => {
    if (!hook.script) {
      throw new Error(`Hook at index ${i} is missing required field "script"`);
    }
    if (!hook.repo) {
      throw new Error(`Hook at index ${i} is missing required field "repo"`);
    }
  });

  return config;
}

/**
 * Validates that a port number is within the valid TCP range.
 * Throws an error if the port is invalid.
 */
function validatePort(port) {
  const num = Number(port);
  if (!Number.isInteger(num) || num < 1 || num > 65535) {
    throw new Error(`Invalid port: ${port}. Must be an integer between 1 and 65535`);
  }
  return num;
}

module.exports = { loadConfig, validatePort, DEFAULT_CONFIG };
