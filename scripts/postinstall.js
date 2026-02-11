#!/usr/bin/env node
/**
 * postinstall.js
 * Runs after `npm install`. Creates .env files from .env.example
 * so new collaborators can run `npm run setup` immediately.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envExample = path.join(root, '.env.example');
const rootEnv = path.join(root, '.env');
const dbPkgEnv = path.join(root, 'packages', 'database', '.env');

if (!fs.existsSync(envExample)) {
  // Nothing to do — no template available
  process.exit(0);
}

let created = false;

// Root .env
if (!fs.existsSync(rootEnv)) {
  fs.copyFileSync(envExample, rootEnv);
  console.log('✔ Created .env from .env.example');
  created = true;
}

// packages/database/.env (Prisma needs this)
const sourceEnv = fs.readFileSync(rootEnv, 'utf8');
const dbDir = path.dirname(dbPkgEnv);
if (fs.existsSync(dbDir)) {
  // Always sync to keep in sync with root
  fs.writeFileSync(dbPkgEnv, sourceEnv);
  if (created) {
    console.log('✔ Synced .env → packages/database/.env');
  }
}
