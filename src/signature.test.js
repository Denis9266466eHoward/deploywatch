const crypto = require('crypto');
const { verifySignature } = require('./signature');

const SECRET = 'test-secret-abc123';

function makeSignature(secret, body) {
  const digest = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return `sha256=${digest}`;
}

describe('verifySignature', () => {
  const body = Buffer.from(JSON.stringify({ ref: 'refs/heads/main' }));

  test('returns true for a valid signature', () => {
    const sig = makeSignature(SECRET, body);
    expect(verifySignature(SECRET, body, sig)).toBe(true);
  });

  test('returns false for a tampered body', () => {
    const sig = makeSignature(SECRET, body);
    const tamperedBody = Buffer.from(JSON.stringify({ ref: 'refs/heads/evil' }));
    expect(verifySignature(SECRET, tamperedBody, sig)).toBe(false);
  });

  test('returns false for a wrong secret', () => {
    const sig = makeSignature('wrong-secret', body);
    expect(verifySignature(SECRET, body, sig)).toBe(false);
  });

  test('returns false when header is missing', () => {
    expect(verifySignature(SECRET, body, undefined)).toBe(false);
    expect(verifySignature(SECRET, body, '')).toBe(false);
  });

  test('returns false for an unsupported algorithm prefix', () => {
    const digest = crypto.createHmac('sha1', SECRET).update(body).digest('hex');
    expect(verifySignature(SECRET, body, `sha1=${digest}`)).toBe(false);
  });

  test('returns false when header has no digest part', () => {
    expect(verifySignature(SECRET, body, 'sha256=')).toBe(false);
  });

  test('returns true (skips check) when no secret is configured', () => {
    expect(verifySignature('', body, 'sha256=whatever')).toBe(true);
    expect(verifySignature(null, body, undefined)).toBe(true);
  });

  test('works with a string body as well as a Buffer', () => {
    const strBody = JSON.stringify({ ref: 'refs/heads/main' });
    const sig = makeSignature(SECRET, strBody);
    expect(verifySignature(SECRET, strBody, sig)).toBe(true);
  });
});
