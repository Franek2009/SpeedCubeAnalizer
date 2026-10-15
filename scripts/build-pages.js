'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PUBLIC_FILES = Object.freeze([
  ['cube_stats.html', 'index.html'],
  ['app.js', 'app.js'],
  ['stats-core.js', 'stats-core.js']
]);

function buildPages(output = path.join(PROJECT_ROOT, 'pages-dist')) {
  const outputDir = path.resolve(output);
  if (outputDir === PROJECT_ROOT) throw new Error('Katalog publikacji nie może być katalogiem projektu.');

  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  for (const [source, destination] of PUBLIC_FILES) {
    fs.copyFileSync(path.join(PROJECT_ROOT, source), path.join(outputDir, destination));
  }
  return outputDir;
}

if (require.main === module) {
  const outputDir = buildPages(process.argv[2]);
  console.log(`Przygotowano artefakt GitHub Pages: ${outputDir}`);
}

module.exports = { buildPages, PUBLIC_FILES };
