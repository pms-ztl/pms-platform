#!/usr/bin/env node
/**
 * ensure-env.js
 * Copies .env.example → .env at root and packages/database/.env
 * so Prisma CLI can find DATABASE_URL when run via Turbo.
 *
 * Prisma resolves .env relative to schema.prisma location,
 * which is packages/database/prisma/. It then walks up to
 * packages/database/.env. This script ensures that file exists.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envExample = path.join(root, '.env.example');
const rootEnv = path.join(root, '.env');
const dbPkgEnv = path.join(root, 'packages', 'database', '.env');

// Step 1: Ensure root .env exists
if (!fs.existsSync(rootEnv)) {
  if (fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, rootEnv);
    console.log('✔ Created .env from .env.example');
  } else {
    console.error('✖ No .env.example found — please create .env manually');
    process.exit(1);
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
