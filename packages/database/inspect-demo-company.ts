import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  // Check demo tenant
  const demo = await prisma.tenant.findUnique({ where: { slug: 'demo' }, select: { id: true, name: true } });
  console.log('Demo tenant:', demo?.id);

  // Check demo-company roles
  const dc = await prisma.tenant.findUnique({ where: { slug: 'demo-company' }, select: { id: true, name: true } });
  console.log('Demo-company tenant:', dc?.id);

  const roles = await prisma.role.findMany({ where: { tenantId: dc!.id }, select: { id: true, name: true, category: true, permissions: true } });
  console.log('\ndemo-company roles:');
  for (const r of roles) console.log(` - [${r.id}] ${r.name} (${r.category}) perms: ${r.permissions.length}`);

  // User-role assignments
  const users = await prisma.user.findMany({
    where: { tenantId: dc!.id },
    select: { id: true, email: true, level: true, userRoles: { select: { role: { select: { name: true, category: true } } } } }
  });
  console.log('\ndemo-company users:');
  for (const u of users) {
    console.log(` - ${u.email} | level:${u.level} | roles: ${u.userRoles.map(r=>r.role.name).join(', ')}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
