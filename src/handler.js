const { verifySignature } = require('./signature');
const { matchesFilters, extractContext } = require('./filters');
const { runScript } = require('./runner');

/**
 * Create an HTTP request handler for GitHub push webhooks.
 * @param {Object} config - Loaded deploywatch config
 * @param {Function} logger
 * @returns {Function} Node.js http request handler
 */
function createHandler(config, logger = console.log) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      return res.end('Method Not Allowed');
    }

    let body = '';
    req.on('data', (chunk) => { body += chunk; });

    req.on('end', async () => {
      // Verify signature if secret is configured
      if (config.secret) {
        const sig = req.headers['x-hub-signature-256'] || '';
        if (!verifySignature(body, config.secret, sig)) {
          logger('[handler] invalid signature');
          res.writeHead(401, { 'Content-Type': 'text/plain' });
          return res.end('Unauthorized');
        }
      }

      let payload;
      try {
        payload = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('Bad Request: invalid JSON');
      }

      // Only handle push events
      const event = req.headers['x-github-event'];
      if (event !== 'push') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('ignored');
      }

      const filters = config.filters || {};
      if (!matchesFilters(payload, filters)) {
        logger('[handler] push event did not match filters, skipping');
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        return res.end('filtered');
      }

      const context = extractContext(payload);
      logger(`[handler] matched push on ${context.branch} — running script`);

      try {
        const result = await runScript(config.script, context, logger);
        res.writeHead(result.code === 0 ? 200 : 500, { 'Content-Type': 'text/plain' });
        res.end(result.code === 0 ? 'ok' : 'script failed');
      } catch (err) {
        logger(`[handler] error running script: ${err.message}`);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    });
  };
}

module.exports = { createHandler };
