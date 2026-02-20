/**
 * Ensures .env files exist in all required locations.
 * Copies from .env.example if the target doesn't exist.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXAMPLE = path.join(ROOT, '.env.example');

const targets = [
  path.join(ROOT, '.env'),
  path.join(ROOT, 'apps', 'api', '.env'),
  path.join(ROOT, 'packages', 'database', '.env'),
];

if (!fs.existsSync(EXAMPLE)) {
  console.log('[setup] No .env.example found, skipping env bootstrap.');
  process.exit(0);
}

let created = 0;
for (const target of targets) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(EXAMPLE, target);
    console.log('[setup] Created ' + path.relative(ROOT, target) + ' from .env.example');
    created++;
  } else {
    console.log('[setup] ' + path.relative(ROOT, target) + ' already exists, skipped');
  }
}

if (created > 0) {
  console.log('[setup] ' + created + ' .env file(s) created. Review and update values if needed.');
}
