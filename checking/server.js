// Minimal Node proxy to call Volcengine Ark from the backend
// Usage: set ARK_API_KEY in env (or pass in request body/header), then: node server.js
// Requires Node >= 18 (built-in fetch). No external deps.

const http = require('http');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ARK_API_BASE = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ARK-API-Key',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    ...headers
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; if (data.length > 5 * 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { resolve({ raw: data }); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return send(res, 204, '');
  }

  if (req.method === 'GET' && url.pathname === '/') {
    return send(res, 200, { ok: true, service: 'truthguard-proxy', time: new Date().toISOString() });
  }

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    try {
      const body = await parseBody(req);
      const apiKey = (req.headers['x-ark-api-key'] || body.apiKey || process.env.ARK_API_KEY || '').toString().trim();
      if (!apiKey) return send(res, 400, { error: { message: 'Missing ARK_API_KEY. Set env or pass x-ark-api-key/apiKey.' } });

      const payload = { model: body.model, messages: body.messages };
      if (!payload.model || !payload.messages) {
        return send(res, 400, { error: { message: 'Missing model or messages in request body.' } });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const arkRes = await fetch(ARK_API_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const text = await arkRes.text();
      const tryJson = () => { try { return JSON.parse(text); } catch { return null; } };
      if (!arkRes.ok) {
        return send(res, arkRes.status, tryJson() || { error: { message: `Upstream error ${arkRes.status}`, body: text } });
      }
      return send(res, 200, tryJson() || { raw: text });
    } catch (e) {
      const isAbort = e && (e.name === 'AbortError');
      return send(res, 504, { error: { message: isAbort ? 'Upstream timeout' : (e.message || 'Proxy error') } });
    }
  }

  return send(res, 404, { error: { message: 'Not Found' } });
});

server.listen(PORT, () => {
  console.log(`[proxy] listening on http://localhost:${PORT}`);
});



