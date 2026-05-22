const path = require('path');
const fs = require('fs');
const os = require('os');
const { runScript, buildEnv } = require('./runner');

function writeTempScript(content) {
  const file = path.join(os.tmpdir(), `dw-test-${Date.now()}.sh`);
  fs.writeFileSync(file, content, { mode: 0o755 });
  return file;
}

describe('buildEnv', () => {
  test('prefixes context keys with DW_', () => {
    const env = buildEnv({ branch: 'main', commitCount: 3 });
    expect(env.DW_BRANCH).toBe('main');
    expect(env.DW_COMMITCOUNT).toBe('3');
  });

  test('skips null and undefined values', () => {
    const env = buildEnv({ branch: null, repo: undefined, pusher: 'alice' });
    expect(env.DW_BRANCH).toBeUndefined();
    expect(env.DW_REPO).toBeUndefined();
    expect(env.DW_PUSHER).toBe('alice');
  });

  test('inherits process.env', () => {
    const env = buildEnv({});
    expect(env.PATH).toBe(process.env.PATH);
  });
});

describe('runScript', () => {
  test('runs a script and resolves with exit code 0', async () => {
    const script = writeTempScript('#!/bin/sh\necho hello\n');
    const result = await runScript(script, {}, () => {});
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
    fs.unlinkSync(script);
  });

  test('resolves with non-zero code on failure', async () => {
    const script = writeTempScript('#!/bin/sh\nexit 2\n');
    const result = await runScript(script, {}, () => {});
    expect(result.code).toBe(2);
    fs.unlinkSync(script);
  });

  test('passes DW_ env vars to script', async () => {
    const script = writeTempScript('#!/bin/sh\necho $DW_BRANCH\n');
    const result = await runScript(script, { branch: 'staging' }, () => {});
    expect(result.stdout.trim()).toBe('staging');
    fs.unlinkSync(script);
  });

  test('rejects if script path does not exist', async () => {
    await expect(runScript('/nonexistent/script.sh', {}, () => {})).rejects.toThrow();
  });
});
