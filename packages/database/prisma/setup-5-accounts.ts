/**
 * Set up 5 universal demo accounts:
 *   Command Center: pms.superadmin@protonmail.com  (Super Admin - platform level)
 *   Your Workspace: pms.tenantadmin@protonmail.com (Tenant Admin)
 *                   pms.hradmin@protonmail.com      (HR Admin)
 *                   pms.manager@protonmail.com      (Manager)
 *                   pms.employee@protonmail.com     (Employee)
 *
 * Run: pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/setup-5-accounts.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Demo@2026', 12);

  // 1. Platform Super Admin: admin@pms-platform.com → pms.superadmin@protonmail.com
  const r1 = await prisma.user.updateMany({
    where: { email: 'admin@pms-platform.com' },
    data: { email: 'pms.superadmin@protonmail.com', passwordHash: hash },
  });
  console.log('✓ Super Admin (Command Center):', r1.count, 'updated');

  // 2. Tenant Admin in demo-company: pms.superadmin → pms.tenantadmin
  const r2 = await prisma.user.updateMany({
    where: { email: 'pms.superadmin@protonmail.com', tenantId: 'cbd87cec-52e8-406d-9fae-5a43a6449c73' },
    data: { email: 'pms.tenantadmin@protonmail.com', passwordHash: hash },
  });
  console.log('✓ Tenant Admin (Workspace):', r2.count, 'updated');

  // 3. Ensure other 3 workspace accounts have correct password
  const r3 = await prisma.user.updateMany({
    where: { email: { in: ['pms.hradmin@protonmail.com', 'pms.manager@protonmail.com', 'pms.employee@protonmail.com'] } },
    data: { passwordHash: hash },
  });
  console.log('✓ HR Admin / Manager / Employee:', r3.count, 'password confirmed');

  console.log('\n=== 5 Demo Accounts ===');
  console.log('COMMAND CENTER:');
  console.log('  pms.superadmin@protonmail.com   /  Demo@2026  (Super Admin)');
  console.log('\nYOUR WORKSPACE:');
  console.log('  pms.tenantadmin@protonmail.com  /  Demo@2026  (Tenant Admin)');
  console.log('  pms.hradmin@protonmail.com      /  Demo@2026  (HR Admin)');
  console.log('  pms.manager@protonmail.com      /  Demo@2026  (Manager)');
  console.log('  pms.employee@protonmail.com     /  Demo@2026  (Employee)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
