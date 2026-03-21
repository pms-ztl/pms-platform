import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
  console.log('Tenants:', JSON.stringify(tenants));

  const users = await prisma.user.findMany({
    select: { id: true, firstName: true, lastName: true, managerId: true, email: true, tenantId: true }
  });
  for (const u of users) {
    console.log(`${u.firstName} ${u.lastName} id=${u.id} (${u.email}) tenant=${u.tenantId} => managerId: ${u.managerId || 'NULL'}`);
  }
}

main().then(() => prisma.$disconnect());
