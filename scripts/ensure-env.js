#!/usr/bin/env node
/**
 * ensure-env.js
 * Copies .env.example → .env at root and packages/database/.env
 * so Prisma CLI can find DATABASE_URL when run via Turbo.
 *
 * Prisma resolves .env relative to schema.prisma location,
 * which is packages/database/prisma/. It then walks up to
 * packages/database/.env. This script ensures that file exists.
 *
 * Also auto-fixes the Windows localhost→IPv6 issue by replacing
 * localhost with 127.0.0.1 in DATABASE_URL and REDIS_URL.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envExample = path.join(root, '.env.example');
const rootEnv = path.join(root, '.env');
const dbPkgEnv = path.join(root, 'packages', 'database', '.env');

/**
 * Fix Windows IPv6 issue: replace localhost with 127.0.0.1 in connection URLs.
 * On Windows, 'localhost' can resolve to IPv6 ::1 but Docker only listens on IPv4.
 */
function fixLocalhostIPv6(content) {
  return content.replace(
    /(@)localhost(:\d+)/g,
    '$1127.0.0.1$2'
  ).replace(
    /(redis:\/\/)localhost(:\d+)/g,
    '$1127.0.0.1$2'
  );
}

// Step 1: Ensure root .env exists
if (!fs.existsSync(rootEnv)) {
  if (fs.existsSync(envExample)) {
    let content = fs.readFileSync(envExample, 'utf8');
    content = fixLocalhostIPv6(content);
    fs.writeFileSync(rootEnv, content);
    console.log('✔ Created .env from .env.example (with localhost→127.0.0.1 fix)');
  } else {
    console.error('✖ No .env.example found — please create .env manually');
    process.exit(1);
  }
} else {
  // .env already exists — check if it still uses localhost and fix it
  let content = fs.readFileSync(rootEnv, 'utf8');
  const fixed = fixLocalhostIPv6(content);
  if (fixed !== content) {
    fs.writeFileSync(rootEnv, fixed);
    console.log('✔ Fixed .env: replaced localhost with 127.0.0.1 (Windows IPv6 fix)');
  }
}

// Step 2: Copy root .env → packages/database/.env (so Prisma finds it)
try {
  const rootEnvContent = fs.readFileSync(rootEnv, 'utf8');
  const dbDir = path.dirname(dbPkgEnv);
  if (fs.existsSync(dbDir)) {
    fs.writeFileSync(dbPkgEnv, rootEnvContent);
    console.log('✔ Synced .env → packages/database/.env');
  }
} catch (err) {
  console.error('✖ Failed to sync .env to packages/database:', err.message);
  process.exit(1);
}

console.log('✔ Environment files ready');
