const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Active client presence registry (genuine actual live listeners)
const activeSessions = new Map();
const SESSION_TIMEOUT_MS = 25000; // 25 seconds expiry for inactive clients

function cleanupSessions() {
  const now = Date.now();
  for (const [id, lastSeen] of activeSessions.entries()) {
    if (now - lastSeen > SESSION_TIMEOUT_MS) {
      activeSessions.delete(id);
    }
  }
}

// Cleanup inactive sessions every 10 seconds
setInterval(cleanupSessions, 10000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];

  // Presence API endpoint
  if (urlPath === '/api/presence') {
    cleanupSessions();
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}');
          if (data && data.id) {
            activeSessions.set(String(data.id), Date.now());
          }
        } catch (e) {}
        cleanupSessions();
        const count = Math.max(1, activeSessions.size);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ count }));
      });
      return;
    } else {
      const count = Math.max(1, activeSessions.size);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ count }));
      return;
    }
  }

  // Static File Serving
  let relativePath = decodeURI(urlPath);
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/index.html';
  }

  const fullPath = path.join(__dirname, relativePath);

  // Security check: ensure within __dirname
  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(fullPath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Cache control
    if (ext === '.jpg' || ext === '.png' || ext === '.ico' || ext === '.woff2') {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else {
      res.setHeader('Cache-Control', 'no-cache');
    }

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(fullPath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`छठ घाट रेडियो सर्वर चालू बा: http://localhost:${PORT}`);
});
