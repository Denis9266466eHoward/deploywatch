const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadConfig, DEFAULT_CONFIG } = require('./config');

function writeTempConfig(obj) {
  const tmpFile = path.join(os.tmpdir(), `deploywatch-test-${Date.now()}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify(obj));
  return tmpFile;
}

describe('loadConfig', () => {
  test('throws if file does not exist', () => {
    expect(() => loadConfig('/nonexistent/path.json')).toThrow('Config file not found');
  });

  test('throws on invalid JSON', () => {
    const tmp = path.join(os.tmpdir(), 'bad.json');
    fs.writeFileSync(tmp, '{ bad json }');
    expect(() => loadConfig(tmp)).toThrow('Failed to parse config');
    fs.unlinkSync(tmp);
  });

  test('throws if hooks is not an array', () => {
    const tmp = writeTempConfig({ hooks: 'bad' });
    expect(() => loadConfig(tmp)).toThrow('"hooks" must be an array');
    fs.unlinkSync(tmp);
  });

  test('throws if hook missing script', () => {
    const tmp = writeTempConfig({ hooks: [{ repo: 'owner/repo' }] });
    expect(() => loadConfig(tmp)).toThrow('missing required field "script"');
    fs.unlinkSync(tmp);
  });

  test('throws if hook missing repo', () => {
    const tmp = writeTempConfig({ hooks: [{ script: './deploy.sh' }] });
    expect(() => loadConfig(tmp)).toThrow('missing required field "repo"');
    fs.unlinkSync(tmp);
  });

  test('merges defaults and returns valid config', () => {
    const tmp = writeTempConfig({
      port: 8080,
      hooks: [{ repo: 'owner/repo', script: './deploy.sh' }]
    });
    const config = loadConfig(tmp);
    expect(config.port).toBe(8080);
    expect(config.secret).toBe('');
    expect(config.hooks).toHaveLength(1);
    fs.unlinkSync(tmp);
  });

  test('uses default port when not specified', () => {
    const tmp = writeTempConfig({ hooks: [] });
    const config = loadConfig(tmp);
    expect(config.port).toBe(DEFAULT_CONFIG.port);
    fs.unlinkSync(tmp);
  });
});
