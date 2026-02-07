#!/usr/bin/env node
// Seed the database only if no tenants exist (first deploy).
// Safe to call on every restart — skips if data already present.

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.tenant.count();
    if (count > 0) {
      console.log(`[seed-if-empty] Database already has ${count} tenant(s). Skipping seed.`);
      return;
    }
    console.log('[seed-if-empty] Empty database detected. Running seed...');
    const { execSync } = require('child_process');
    const path = require('path');
    const fs = require('fs');

    // Try compiled JS first (production/Render), fall back to ts-node (local dev)
    const compiledSeed = path.resolve(__dirname, '../packages/database/prisma/dist/seed.js');
    if (fs.existsSync(compiledSeed)) {
      console.log('[seed-if-empty] Using compiled seed (prisma/dist/seed.js)');
      execSync(`node ${compiledSeed}`, {
        stdio: 'inherit',
        env: { ...process.env },
        cwd: path.resolve(__dirname, '../packages/database'),
      });
    } else {
      console.log('[seed-if-empty] Using ts-node (local dev)');
      execSync('npx ts-node prisma/seed.ts', {
        stdio: 'inherit',
        env: { ...process.env },
        cwd: path.resolve(__dirname, '../packages/database'),
      });
    }
    console.log('[seed-if-empty] Seed completed successfully.');
  } catch (err) {
    // If tenant table doesn't exist yet, migration hasn't run — skip seeding
    if (err.code === 'P2021' || err.message?.includes('does not exist')) {
      console.log('[seed-if-empty] Tables not created yet. Skipping seed.');
      return;
    }
    console.error('[seed-if-empty] Seed failed:', err.message);
    // Don't crash the app if seed fails — let it start anyway
  } finally {
    await prisma.$disconnect();
  }
}

main();
