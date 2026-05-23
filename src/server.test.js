import http from 'http';
import { createServer } from './server.js';
import { createHmac } from 'crypto';

const BASE_CONFIG = {
  port: 0,
  secret: 'testsecret',
  path: '/webhook',
  hooks: []
};

function makeSignature(body, secret) {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

function request(srv, options, body) {
  return new Promise((resolve, reject) => {
    const addr = srv.address();
    const req = http.request(
      { host: '127.0.0.1', port: addr.port, ...options },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function listen(srv) {
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve));
}

test('returns 404 for wrong path', async () => {
  const srv = createServer(BASE_CONFIG);
  await listen(srv);
  const res = await request(srv, { method: 'POST', path: '/wrong' }, '{}');
  expect(res.status).toBe(404);
  srv.close();
});

test('returns 404 for GET requests', async () => {
  const srv = createServer(BASE_CONFIG);
  await listen(srv);
  const res = await request(srv, { method: 'GET', path: '/webhook' });
  expect(res.status).toBe(404);
  srv.close();
});

test('returns 401 when signature is missing', async () => {
  const srv = createServer(BASE_CONFIG);
  await listen(srv);
  const res = await request(srv, { method: 'POST', path: '/webhook' }, '{}');
  expect(res.status).toBe(401);
  srv.close();
});

test('accepts valid signed payload', async () => {
  const srv = createServer(BASE_CONFIG);
  await listen(srv);
  const body = JSON.stringify({ ref: 'refs/heads/main', repository: { full_name: 'a/b' }, pusher: {} });
  const sig = makeSignature(body, BASE_CONFIG.secret);
  const res = await request(
    srv,
    { method: 'POST', path: '/webhook', headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' } },
    body
  );
  expect([200, 204]).toContain(res.status);
  srv.close();
});
