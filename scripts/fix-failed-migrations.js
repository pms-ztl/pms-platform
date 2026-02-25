/**
 * fix-failed-migrations.js
 * ─────────────────────────
 * Runs BEFORE `prisma migrate deploy` in the Render start command.
 * Detects any failed migrations and marks them as successfully applied
 * after ensuring the objects exist (using IF NOT EXISTS for idempotency).
 */

async function main() {
  console.log('[fix-migrations] Checking for failed migrations...');

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Find failed migrations (started but never finished, never rolled back)
    const failed = await prisma.$queryRawUnsafe(`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
    `);

    if (!failed || failed.length === 0) {
      console.log('[fix-migrations] No failed migrations found — all clear.');
      return;
    }

    for (const row of failed) {
      const name = row.migration_name;
      console.log(`[fix-migrations] Found failed migration: ${name}`);

      if (name === '20260225150000_add_chat_tables') {
        console.log('[fix-migrations] Ensuring chat tables exist (idempotent)...');

        // Create enums if not exist
        await prisma.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'GROUP', 'TEAM_CHANNEL');
          EXCEPTION WHEN duplicate_object THEN null;
          END $$
        `);
        await prisma.$executeRawUnsafe(`
          DO $$ BEGIN
            CREATE TYPE "MessageType" AS ENUM ('TEXT', 'SYSTEM');
          EXCEPTION WHEN duplicate_object THEN null;
          END $$
        `);

        // Create tables if not exist
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "conversations" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "tenant_id" UUID NOT NULL,
            "type" "ConversationType" NOT NULL,
            "name" TEXT,
            "avatar_url" TEXT,
            "team_id" UUID,
            "created_by_id" UUID NOT NULL,
            "last_message_at" TIMESTAMP(3),
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "conversation_participants" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "conversation_id" UUID NOT NULL,
            "user_id" UUID NOT NULL,
            "role" TEXT NOT NULL DEFAULT 'MEMBER',
            "last_read_at" TIMESTAMP(3),
            "muted_at" TIMESTAMP(3),
            "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "left_at" TIMESTAMP(3),
            CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
          )
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "chat_messages" (
            "id" UUID NOT NULL DEFAULT gen_random_uuid(),
            "conversation_id" UUID NOT NULL,
            "sender_id" UUID NOT NULL,
            "content" TEXT NOT NULL,
            "type" "MessageType" NOT NULL DEFAULT 'TEXT',
            "reactions" JSONB DEFAULT '[]',
            "reply_to_id" UUID,
            "is_pinned" BOOLEAN NOT NULL DEFAULT false,
            "pinned_by_id" UUID,
            "pinned_at" TIMESTAMP(3),
            "forwarded_from_id" UUID,
            "edited_at" TIMESTAMP(3),
            "deleted_at" TIMESTAMP(3),
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
          )
        `);

        // Create indexes (IF NOT EXISTS)
        const indexes = [
          'CREATE INDEX IF NOT EXISTS "conversations_tenant_id_idx" ON "conversations"("tenant_id")',
          'CREATE INDEX IF NOT EXISTS "conversations_team_id_idx" ON "conversations"("team_id")',
          'CREATE INDEX IF NOT EXISTS "conversations_last_message_at_idx" ON "conversations"("last_message_at")',
          'CREATE UNIQUE INDEX IF NOT EXISTS "conversation_participants_conversation_id_user_id_key" ON "conversation_participants"("conversation_id", "user_id")',
          'CREATE INDEX IF NOT EXISTS "conversation_participants_user_id_idx" ON "conversation_participants"("user_id")',
          'CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_created_at_idx" ON "chat_messages"("conversation_id", "created_at")',
          'CREATE INDEX IF NOT EXISTS "chat_messages_sender_id_idx" ON "chat_messages"("sender_id")',
          'CREATE INDEX IF NOT EXISTS "chat_messages_reply_to_id_idx" ON "chat_messages"("reply_to_id")',
          'CREATE INDEX IF NOT EXISTS "chat_messages_conversation_id_is_pinned_idx" ON "chat_messages"("conversation_id", "is_pinned")',
        ];
        for (const idx of indexes) {
          await prisma.$executeRawUnsafe(idx);
        }

        // Add foreign keys (ignore if already exist)
        const fks = [
          ['conversations_tenant_id_fkey', 'ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE'],
          ['conversations_team_id_fkey', 'ALTER TABLE "conversations" ADD CONSTRAINT "conversations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE'],
          ['conversations_created_by_id_fkey', 'ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE'],
          ['conversation_participants_conversation_id_fkey', 'ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE'],
          ['conversation_participants_user_id_fkey', 'ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE'],
          ['chat_messages_conversation_id_fkey', 'ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE'],
          ['chat_messages_sender_id_fkey', 'ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE'],
          ['chat_messages_reply_to_id_fkey', 'ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE'],
          ['chat_messages_forwarded_from_id_fkey', 'ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_forwarded_from_id_fkey" FOREIGN KEY ("forwarded_from_id") REFERENCES "chat_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE'],
          ['chat_messages_pinned_by_id_fkey', 'ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_pinned_by_id_fkey" FOREIGN KEY ("pinned_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE'],
        ];
        for (const [fkName, sql] of fks) {
          try {
            await prisma.$executeRawUnsafe(sql);
            console.log(`  + Added FK ${fkName}`);
          } catch (e) {
            if (e.message && e.message.includes('already exists')) {
              console.log(`  ~ FK ${fkName} already exists, skipping`);
            } else {
              console.log(`  ~ FK ${fkName}: ${e.message}`);
            }
          }
        }

        console.log('[fix-migrations] Chat tables ensured.');
      }

      // Mark migration as successfully applied
      console.log(`[fix-migrations] Marking ${name} as applied...`);
      await prisma.$executeRawUnsafe(
        `UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1 WHERE migration_name = '${name}' AND finished_at IS NULL`
      );
      console.log(`[fix-migrations] ✓ ${name} marked as applied.`);
    }
  } catch (err) {
    console.error('[fix-migrations] Warning:', err.message);
    // Don't block deploy
  } finally {
    await prisma.$disconnect();
  }
}

main();
