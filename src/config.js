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

module.exports = { loadConfig, DEFAULT_CONFIG };
