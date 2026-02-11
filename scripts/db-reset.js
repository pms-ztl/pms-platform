#!/usr/bin/env node
/**
 * db-reset.js
 * Drops and recreates the public schema so db push starts from a clean slate.
 *
 * Why not use "prisma migrate reset"?
 *   migrate reset re-applies migration files after dropping, which recreates
 *   enums/tables that db push then tries to create again → conflict.
 *   This script does a raw DROP SCHEMA + CREATE SCHEMA instead.
 */
const { execSync } = require('child_process');
const path = require('path');

// Load .env from packages/database (where Prisma expects it)
const dotenvPath = path.join(__dirname, '..', 'packages', 'database', '.env');
try {
  const fs = require('fs');
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
} catch (e) {
  // .env may not exist yet, that's OK — ensure-env.js runs before this
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('✖ DATABASE_URL not set. Run "node scripts/ensure-env.js" first.');
  process.exit(1);
}

console.log('🗑️  Dropping and recreating public schema...');

// Use psql if available, otherwise use node-postgres via prisma's connection
// We'll use a simple approach: execute SQL via prisma db execute
const sql = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;';

try {
  // prisma db execute runs raw SQL against the database
  execSync(
    `npx prisma db execute --stdin --schema="${path.join(__dirname, '..', 'packages', 'database', 'prisma', 'schema.prisma')}"`,
    {
      input: sql,
      cwd: path.join(__dirname, '..'),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, DATABASE_URL: databaseUrl },
    }
  );
  console.log('✔ Database schema reset complete');
} catch (err) {
  // If prisma db execute fails, try with psql
  try {
    const url = new URL(databaseUrl);
    const host = url.hostname;
    const port = url.port || '5432';
    const db = url.pathname.slice(1);
    const user = url.username;
    const pass = url.password;

    execSync(
      `psql -h ${host} -p ${port} -U ${user} -d ${db} -c "${sql}"`,
      {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PGPASSWORD: pass },
      }
    );
    console.log('✔ Database schema reset complete (via psql)');
  } catch (psqlErr) {
    console.error('✖ Failed to reset database. Error:', err.stderr ? err.stderr.toString() : err.message);
    console.error('  Make sure PostgreSQL is running and DATABASE_URL is correct.');
    process.exit(1);
  }
}
