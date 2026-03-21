import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r1 = await prisma.user.updateMany({
    where: { tenantId: '831df98f-2e51-4c37-ab4b-1bb7dd2f7be5', email: 'pms.superadmin@protonmail.com' },
    data: { email: 'admin@pms-platform.com' },
  });
  const r2 = await prisma.user.updateMany({
    where: { tenantId: 'e14e50b6-5541-4b4d-a91e-814248f7e92c', email: 'pms.hradmin@protonmail.com' },
    data: { email: 'admin@demo.com' },
  });
  console.log('Reverted platform admin:', r1.count);
  console.log('Reverted demo admin:', r2.count);
  console.log('Done — only 4 Proton accounts remain.');
}
main().catch(console.error).finally(() => prisma.$disconnect());
