'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const { SECURITY_HEADERS } = require('../server');
const root = path.resolve(__dirname, '..', 'pages-dist');
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/stats-core.js', ['stats-core.js', 'text/javascript; charset=utf-8']]
]);

http.createServer((request, response) => {
  const asset = files.get(new URL(request.url, 'http://localhost').pathname);
  if (!asset || (request.method !== 'GET' && request.method !== 'HEAD')) {
    response.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
    return;
  }
  const content = fs.readFileSync(path.join(root, asset[0]));
  response.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': asset[1], 'Content-Length': content.length });
  response.end(request.method === 'HEAD' ? '' : content);
}).listen(4173, '127.0.0.1', () => console.log('Artefakt Pages działa pod adresem http://127.0.0.1:4173'));
