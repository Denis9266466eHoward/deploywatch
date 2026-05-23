import http from 'http';
import { loadConfig } from './config.js';
import { createHandler } from './handler.js';

let server = null;

export function createServer(config) {
  const handler = createHandler(config);

  server = http.createServer((req, res) => {
    const { method, url } = req;
    const listenPath = config.path || '/webhook';

    if (method !== 'POST' || url !== listenPath) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        res.writeHead(413, { 'Content-Type': 'text/plain' });
        res.end('Payload Too Large');
        req.destroy();
      }
    });

    req.on('end', () => {
      handler(req, res, body);
    });

    req.on('error', (err) => {
      console.error('[deploywatch] request error:', err.message);
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
    });
  });

  return server;
}

export async function start(configPath) {
  const config = await loadConfig(configPath);
  const port = config.port || 9000;
  const srv = createServer(config);

  srv.listen(port, () => {
    console.log(`[deploywatch] listening on port ${port}`);
  });

  process.on('SIGTERM', () => shutdown(srv));
  process.on('SIGINT', () => shutdown(srv));

  return srv;
}

function shutdown(srv) {
  console.log('[deploywatch] shutting down...');
  srv.close(() => process.exit(0));
}
