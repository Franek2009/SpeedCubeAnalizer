'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { buildPages } = require('../scripts/build-pages');

test('GitHub Pages artifact contains only the three public application files', t => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cubestats-pages-'));
  t.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));

  const output = buildPages(path.join(temporaryRoot, 'site'));
  assert.deepEqual(fs.readdirSync(output).sort(), ['app.js', 'index.html', 'stats-core.js']);
  assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), fs.readFileSync(path.join(__dirname, '..', 'cube_stats.html'), 'utf8'));
});
