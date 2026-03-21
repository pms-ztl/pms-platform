/**
 * Update demo user emails → universal Proton Mail addresses
 * Password updated to: Demo@2026
 *
 * LOCAL:  pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/update-demo-emails.ts
 * RENDER: Set DATABASE_URL env var to Neon prod URL, then run same command
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NEW_PASSWORD = 'Demo@2026';
const SALT_ROUNDS = 12;

const EMAIL_MAP: Record<string, string> = {
  // demo-company tenant users
  'agdanishr@gmail.com':              'pms.superadmin@protonmail.com',
  'danish@xzashr.com':                'pms.hradmin@protonmail.com',
  'preethisivachandran0@gmail.com':   'pms.manager@protonmail.com',
  'sanjayn0369@gmail.com':            'pms.employee@protonmail.com',
  // platform tenant super admin
  'admin@pms-platform.com':           'pms.superadmin@protonmail.com',
  // demo tenant admin
  'admin@demo.com':                   'pms.hradmin@protonmail.com',
};

async function main() {
  console.log('[update-demo-emails] Hashing new password...');
  const newHash = await bcrypt.hash(NEW_PASSWORD, SALT_ROUNDS);

  let updated = 0;
  let skipped = 0;

  for (const [oldEmail, newEmail] of Object.entries(EMAIL_MAP)) {
    const users = await prisma.user.findMany({ where: { email: oldEmail } });

    if (users.length === 0) {
      console.log(`  SKIP  ${oldEmail} — not found`);
      skipped++;
      continue;
    }

    for (const user of users) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          email:        newEmail,
          passwordHash: newHash,
        },
      });
      console.log(`  ✓  ${oldEmail} → ${newEmail}  (tenant: ${user.tenantId})`);
      updated++;
    }
  }

  console.log(`\n[update-demo-emails] Done. Updated: ${updated}, Skipped: ${skipped}`);
  console.log('\nNew credentials:');
  console.log('  pms.superadmin@protonmail.com  /  Demo@2026  (Super Admin + Tenant Admin)');
  console.log('  pms.hradmin@protonmail.com     /  Demo@2026  (HR Admin + Demo Admin)');
  console.log('  pms.manager@protonmail.com     /  Demo@2026  (Manager)');
  console.log('  pms.employee@protonmail.com    /  Demo@2026  (Employee)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
