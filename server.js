'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const HOST = '127.0.0.1';
const ROOT = __dirname;
const PUBLIC_FILES = new Map([
  ['/', { file: 'cube_stats.html', type: 'text/html; charset=utf-8' }],
  ['/cube_stats.html', { file: 'cube_stats.html', type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: 'app.js', type: 'text/javascript; charset=utf-8' }],
  ['/stats-core.js', { file: 'stats-core.js', type: 'text/javascript; charset=utf-8' }]
]);

const SECURITY_HEADERS = Object.freeze({
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'none'; connect-src 'none'; font-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});

function send(response, status, headers, body = '') {
  const content = Buffer.isBuffer(body) ? body : Buffer.from(body);
  response.writeHead(status, { ...SECURITY_HEADERS, ...headers, 'Content-Length': content.length });
  response.end(content);
}

function validLocalHost(hostHeader) {
  if (!hostHeader) return false;
  const host = hostHeader.toLowerCase().replace(/:\d+$/, '');
  return host === '127.0.0.1' || host === 'localhost';
}

function createServer() {
  return http.createServer((request, response) => {
    if (!validLocalHost(request.headers.host)) {
      send(response, 403, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Forbidden');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(response, 405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' }, 'Method Not Allowed');
      return;
    }

    let pathname;
    try { pathname = new URL(request.url, 'http://localhost').pathname; }
    catch (_) { send(response, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Bad Request'); return; }
    const asset = PUBLIC_FILES.get(pathname);
    if (!asset) {
      send(response, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Not Found');
      return;
    }

    fs.readFile(path.join(ROOT, asset.file), (error, content) => {
      if (error) { send(response, 500, { 'Content-Type': 'text/plain; charset=utf-8' }, 'Internal Server Error'); return; }
      send(response, 200, { 'Content-Type': asset.type }, request.method === 'HEAD' ? '' : content);
    });
  });
}

function parsePort(value) {
  const port = Number(value ?? 4173);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT musi być liczbą od 0 do 65535.');
  return port;
}

function start() {
  let port;
  try { port = parsePort(process.env.PORT); }
  catch (error) { console.error(error.message); process.exitCode = 1; return; }
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `Port ${port} jest już zajęty. Użyj np. PORT=4174 npm start.` : `Nie udało się uruchomić serwera: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, HOST, () => {
    const address = server.address();
    console.log(`SpeedCubeAnalyzer działa pod adresem http://${HOST}:${address.port}`);
    console.log('Serwer nasłuchuje wyłącznie lokalnie. Zatrzymaj go skrótem Ctrl+C.');
  });
  return server;
}

if (require.main === module) start();

module.exports = { createServer, parsePort, PUBLIC_FILES, SECURITY_HEADERS };
