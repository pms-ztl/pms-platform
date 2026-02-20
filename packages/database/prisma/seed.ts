import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

/**
 * Find or create helper — avoids duplicate inserts on re-run.
 */
async function findOrCreate<T>(
  findFn: () => Promise<T | null>,
  createFn: () => Promise<T>,
): Promise<T> {
  const existing = await findFn();
  if (existing) return existing;
  return createFn();
}

async function main() {
  console.log('[seed] Starting database seed...');

  // 1. Platform tenant (Super Admin home)
  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'platform' },
    update: {},
    create: {
      name: 'PMS Platform',
      slug: 'platform',
      subscriptionPlan: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
      subscriptionTier: 'enterprise',
      licenseCount: 9999,
      maxUsers: 9999,
      maxLevel: 16,
      isActive: true,
      settings: {
        features: {
          goals: true, reviews: true, feedback: true,
          calibration: true, analytics: true, integrations: true, agenticAI: true,
        },
        limits: { maxUsers: 9999, maxStorageGb: 500, maxIntegrations: -1 },
        branding: {},
        security: { mfaRequired: false, ssoEnabled: true, passwordPolicy: 'STANDARD', sessionTimeout: 480 },
        ai: { enabled: true, delegateToManagers: false },
      },
    },
  });
  console.log('[seed] Platform tenant:', platformTenant.id);

  // 2. Super Admin role
  const superAdminRole = await findOrCreate(
    () => prisma.role.findFirst({ where: { tenantId: platformTenant.id, name: 'Super Admin' } }),
    () => prisma.role.create({
      data: {
        tenantId: platformTenant.id,
        name: 'Super Admin',
        description: 'Full system access',
        category: 'ADMIN',
        permissions: ['*:manage:all'],
        isSystem: true,
      },
    }),
  );
  console.log('[seed] Super Admin role:', superAdminRole.id);

  // 3. Super Admin user
  const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS);
  const superAdmin = await findOrCreate(
    () => prisma.user.findFirst({ where: { email: 'admin@pms-platform.com', tenantId: platformTenant.id } }),
    () => prisma.user.create({
      data: {
        tenantId: platformTenant.id,
        email: 'admin@pms-platform.com',
        firstName: 'Super',
        lastName: 'Admin',
        passwordHash: adminPassword,
        isActive: true,
        emailVerified: true,
        level: 16,
      },
    }),
  );
  console.log('[seed] Super Admin user:', superAdmin.email);

  // 4. Assign Super Admin role
  await findOrCreate(
    () => prisma.userRole.findFirst({ where: { userId: superAdmin.id, roleId: superAdminRole.id } }),
    () => prisma.userRole.create({
      data: { userId: superAdmin.id, roleId: superAdminRole.id, grantedBy: superAdmin.id },
    }),
  );

  // 5. Demo tenant
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo',
      subscriptionPlan: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      subscriptionTier: 'professional',
      licenseCount: 50,
      maxUsers: 50,
      maxLevel: 12,
      isActive: true,
      settings: {
        features: {
          goals: true, reviews: true, feedback: true,
          calibration: true, analytics: true, integrations: false, agenticAI: true,
        },
        limits: { maxUsers: 50, maxStorageGb: 50, maxIntegrations: 5 },
        branding: {},
        security: { mfaRequired: false, ssoEnabled: false, passwordPolicy: 'STANDARD', sessionTimeout: 480 },
        ai: { enabled: true, delegateToManagers: false },
      },
    },
  });
  console.log('[seed] Demo tenant:', demoTenant.id);

  // 6. Demo tenant roles
  const roleDefinitions = [
    { name: 'Tenant Admin', desc: 'Full tenant administration', cat: 'ADMIN', perms: ['users:manage:all', 'roles:manage:all', 'settings:manage:all', 'integrations:manage:all'] },
    { name: 'HR Admin', desc: 'HR administration', cat: 'HR', perms: ['users:read:all', 'goals:read:all', 'reviews:manage:all', 'feedback:read:all', 'calibration:manage:all', 'analytics:read:all'] },
    { name: 'Manager', desc: 'People manager', cat: 'MANAGER', perms: ['users:read:team', 'goals:read:team', 'goals:update:team', 'reviews:create:team', 'reviews:read:team', 'feedback:create:all', 'feedback:read:team'] },
    { name: 'Employee', desc: 'Standard employee', cat: 'EMPLOYEE', perms: ['goals:create:own', 'goals:read:own', 'goals:update:own', 'reviews:read:own', 'feedback:create:all', 'feedback:read:own'] },
  ];

  const demoRoles = [];
  for (const def of roleDefinitions) {
    const role = await findOrCreate(
      () => prisma.role.findFirst({ where: { tenantId: demoTenant.id, name: def.name } }),
      () => prisma.role.create({
        data: {
          tenantId: demoTenant.id,
          name: def.name,
          description: def.desc,
          category: def.cat,
          permissions: def.perms,
          isSystem: true,
        },
      }),
    );
    demoRoles.push(role);
  }

  // 7. Demo admin user
  const demoPassword = await bcrypt.hash('demo123', SALT_ROUNDS);
  const demoAdmin = await findOrCreate(
    () => prisma.user.findFirst({ where: { email: 'admin@demo.com', tenantId: demoTenant.id } }),
    () => prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        email: 'admin@demo.com',
        firstName: 'Demo',
        lastName: 'Admin',
        passwordHash: demoPassword,
        isActive: true,
        emailVerified: true,
        level: 12,
      },
    }),
  );
  console.log('[seed] Demo Admin user:', demoAdmin.email);

  // Assign Tenant Admin role to demo admin
  const demoAdminRole = demoRoles.find(r => r.category === 'ADMIN');
  if (demoAdminRole) {
    await findOrCreate(
      () => prisma.userRole.findFirst({ where: { userId: demoAdmin.id, roleId: demoAdminRole.id } }),
      () => prisma.userRole.create({
        data: { userId: demoAdmin.id, roleId: demoAdminRole.id, grantedBy: demoAdmin.id },
      }),
    );
  }

  // 8. Demo subscription
  await findOrCreate(
    () => prisma.subscription.findFirst({ where: { tenantId: demoTenant.id, status: 'ACTIVE' } }),
    () => prisma.subscription.create({
      data: {
        tenantId: demoTenant.id,
        plan: 'PROFESSIONAL',
        licenseCount: 50,
        status: 'ACTIVE',
        startDate: new Date(),
      },
    }),
  );

  console.log('');
  console.log('[seed] Done! Login credentials:');
  console.log('  Super Admin:  admin@pms-platform.com / admin123');
  console.log('  Demo Admin:   admin@demo.com / demo123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
