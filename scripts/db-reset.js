/**
 * Resets the database by running prisma db push (schema sync).
 * Does NOT drop data -- use prisma migrate reset for that.
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DB_PKG = path.join(ROOT, 'packages', 'database');

console.log('[setup] Pushing schema to database...');
try {
  execSync('npx prisma db push --accept-data-loss', {
    cwd: DB_PKG,
    stdio: 'inherit',
    env: { ...process.env },
  });
  console.log('[setup] Database schema synced successfully.');
} catch (err) {
  console.error('[setup] Database push failed. Is PostgreSQL running?');
  console.error('[setup] Start it with: docker compose up -d db redis');
  process.exit(1);
}
