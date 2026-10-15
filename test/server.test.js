'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer, parsePort } = require('../server.js');

function request(server, pathname, options = {}) {
  const port = server.address().port;
  return new Promise((resolve, reject) => {
    const call = http.request({ hostname: '127.0.0.1', port, path: pathname, method: options.method || 'GET', headers: { Host: options.host || `127.0.0.1:${port}` } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString() }));
    });
    call.on('error', reject); call.end();
  });
}

let server;
test.before(async () => { server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); });
test.after(async () => { await new Promise(resolve => server.close(resolve)); });

test('serves only the application allowlist with security headers', async () => {
  const page = await request(server, '/');
  assert.equal(page.status, 200);
  assert.match(page.body, /CubeStats/);
  assert.match(page.headers['content-security-policy'], /default-src 'none'/);
  assert.equal(page.headers['x-content-type-options'], 'nosniff');
  assert.equal(page.headers['x-frame-options'], 'DENY');
  assert.equal(page.headers['cache-control'], 'no-store');
  assert.equal((await request(server, '/cube_timer_csv_private.csv')).status, 404);
  assert.equal((await request(server, '/README.md')).status, 404);
  assert.equal((await request(server, '/../package.json')).status, 404);
});

test('rejects non-local Host headers and write methods', async () => {
  assert.equal((await request(server, '/', { host: 'attacker.example' })).status, 403);
  assert.equal((await request(server, '/', { method: 'POST' })).status, 405);
});

test('validates configured ports', () => {
  assert.equal(parsePort(undefined), 4173);
  assert.equal(parsePort('0'), 0);
  assert.throws(() => parsePort('70000'), /PORT/);
  assert.throws(() => parsePort('abc'), /PORT/);
});
