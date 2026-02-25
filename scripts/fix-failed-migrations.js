/**
 * fix-failed-migrations.js
 * ─────────────────────────
 * Runs BEFORE `prisma migrate deploy` in the Render start command.
 * Detects any failed migrations in _prisma_migrations and resolves them
 * so that `migrate deploy` can proceed.
 *
 * Strategy:
 *  1. Query _prisma_migrations for rows that started but never finished
 *  2. For known migrations, DROP partially-created objects (idempotent)
 *  3. Mark the migration as rolled-back so Prisma re-applies it cleanly
 */

const { execSync } = require('child_process');

// We use raw pg driver because PrismaClient might not work if migrations are broken
let Client;
try {
  Client = require('pg').Client;
} catch {
  // pg might not be installed — fall back to PrismaClient
  Client = null;
}

const KNOWN_CLEANUP = {
  '20260225150000_add_chat_tables': [
    'DROP TABLE IF EXISTS "chat_messages" CASCADE',
    'DROP TABLE IF EXISTS "conversation_participants" CASCADE',
    'DROP TABLE IF EXISTS "conversations" CASCADE',
    'DROP TYPE IF EXISTS "MessageType" CASCADE',
    'DROP TYPE IF EXISTS "ConversationType" CASCADE',
  ],
};

async function runWithPg() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const { rows: failed } = await client.query(`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `);

    if (failed.length === 0) {
      console.log('[fix-migrations] No failed migrations found — all clear.');
      return;
    }

    for (const { migration_name } of failed) {
      console.log(`[fix-migrations] Found failed migration: ${migration_name}`);

      // Clean up partial objects
      const cleanup = KNOWN_CLEANUP[migration_name];
      if (cleanup) {
        console.log(`[fix-migrations] Cleaning up partial objects for ${migration_name}...`);
        for (const sql of cleanup) {
          console.log(`  → ${sql}`);
          await client.query(sql);
        }
      }

      // Mark as rolled back so Prisma can re-apply
      console.log(`[fix-migrations] Marking ${migration_name} as rolled-back...`);
      await client.query(
        `UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = $1`,
        [migration_name]
      );
      console.log(`[fix-migrations] ✓ ${migration_name} resolved.`);
    }
  } finally {
    await client.end();
  }
}

async function runWithPrisma() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const failed = await prisma.$queryRaw`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `;

    if (failed.length === 0) {
      console.log('[fix-migrations] No failed migrations found — all clear.');
      return;
    }

    for (const { migration_name } of failed) {
      console.log(`[fix-migrations] Found failed migration: ${migration_name}`);

      const cleanup = KNOWN_CLEANUP[migration_name];
      if (cleanup) {
        console.log(`[fix-migrations] Cleaning up partial objects for ${migration_name}...`);
        for (const sql of cleanup) {
          console.log(`  → ${sql}`);
          await prisma.$executeRawUnsafe(sql);
        }
      }

      console.log(`[fix-migrations] Marking ${migration_name} as rolled-back...`);
      await prisma.$executeRawUnsafe(
        `UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = $1`,
        migration_name
      );
      console.log(`[fix-migrations] ✓ ${migration_name} resolved.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('[fix-migrations] Checking for failed migrations...');
  try {
    if (Client) {
      await runWithPg();
    } else {
      await runWithPrisma();
    }
  } catch (err) {
    // Don't block deploy — just warn and let migrate deploy handle it
    console.error('[fix-migrations] Warning:', err.message);
  }
}

main();
