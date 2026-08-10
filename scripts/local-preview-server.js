const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'dist-latest-browser');
const port = Number(process.env.MOBBY_PREVIEW_PORT || 8099);
const host = '127.0.0.1';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function resolveFile(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '');
  const candidates = cleanPath
    ? [cleanPath, `${cleanPath}.html`, path.join(cleanPath, 'index.html')]
    : ['index.html'];

  for (const candidate of candidates) {
    const absolutePath = path.resolve(root, candidate);
    if (!absolutePath.startsWith(`${root}${path.sep}`) && absolutePath !== root) continue;
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) return absolutePath;
  }
  return null;
}

const server = http.createServer((request, response) => {
  const filePath = resolveFile(request.url || '/');
  if (!filePath) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': 'no-store',
    'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`MOBBY local preview: http://${host}:${port}`);
});
