/**
 * seed-hr-analytics.ts — Seed data for the HR Analytics page.
 *
 * Seeds:
 * - Review ratings (SELF reviews with overallRating) for all 4 demo users
 * - CompensationDecision records (BASE_SALARY, APPROVED) for all 4 demo users
 *
 * This populates the "Performance vs Compensation" scatter chart
 * and the "Compensation Gap Analysis" section on the HR Analytics page.
 *
 * Run:
 *   pushd packages/database && npx ts-node --transpile-only prisma/seed-hr-analytics.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'cbd87cec-52e8-406d-9fae-5a43a6449c73';

// Lookup demo users by email
const USER_EMAILS = [
  'agdanishr@gmail.com',          // Danish (CTO)
  'danish@xzashr.com',            // Prasina (HR)
  'preethisivachandran0@gmail.com', // Preethi (Eng Manager)
  'sanjayn0369@gmail.com',         // Sanjay (Frontend Dev)
];

// Realistic performance ratings and salaries for the demo users
const USER_SEED_DATA: Record<string, { rating: number; salary: number; prevSalary: number }> = {
  'agdanishr@gmail.com':           { rating: 4.5, salary: 3200000, prevSalary: 2900000 }, // CTO — high performer
  'danish@xzashr.com':             { rating: 3.8, salary: 1800000, prevSalary: 1650000 }, // HR — solid performer
  'preethisivachandran0@gmail.com': { rating: 4.2, salary: 2600000, prevSalary: 2400000 }, // Eng Manager — already has data
  'sanjayn0369@gmail.com':          { rating: 3.5, salary: 1200000, prevSalary: 1100000 }, // Junior dev — mid performer
};

async function main() {
  console.log('=== Seeding HR Analytics data ===\n');

  // Phase 0: Fetch users and cycle
  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID, email: { in: USER_EMAILS } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  console.log(`Found ${users.length} users`);

  const cycle = await prisma.reviewCycle.findFirst({
    where: { tenantId: TENANT_ID },
    select: { id: true, name: true },
  });
  if (!cycle) {
    console.error('No review cycle found! Run demo-seed first.');
    return;
  }
  console.log(`Using review cycle: ${cycle.name} (${cycle.id})`);

  // Phase 1: Seed SELF reviews with overallRating for users who don't have one
  console.log('\n--- Phase 1: Reviews ---');
  for (const user of users) {
    const seedData = USER_SEED_DATA[user.email];
    if (!seedData) continue;

    // Check if user already has a rated review
    const existing = await prisma.review.findFirst({
      where: {
        tenantId: TENANT_ID,
        cycleId: cycle.id,
        revieweeId: user.id,
        overallRating: { not: null },
      },
    });

    if (existing) {
      console.log(`  ${user.firstName} ${user.lastName}: already has review with rating ${existing.overallRating} — skipping`);
      continue;
    }

    // Upsert: use the unique constraint [cycleId, revieweeId, reviewerId, type]
    await prisma.review.upsert({
      where: {
        cycleId_revieweeId_reviewerId_type: {
          cycleId: cycle.id,
          revieweeId: user.id,
          reviewerId: user.id,
          type: 'SELF',
        },
      },
      update: {
        overallRating: seedData.rating,
        status: 'SUBMITTED',
        submittedAt: new Date('2026-02-20'),
      },
      create: {
        tenantId: TENANT_ID,
        cycleId: cycle.id,
        revieweeId: user.id,
        reviewerId: user.id,
        type: 'SELF',
        status: 'SUBMITTED',
        overallRating: seedData.rating,
        content: {},
        submittedAt: new Date('2026-02-20'),
      },
    });
    console.log(`  ${user.firstName} ${user.lastName}: created/updated SELF review, rating=${seedData.rating}`);
  }

  // Phase 2: Seed CompensationDecision records
  console.log('\n--- Phase 2: Compensation Decisions ---');
  for (const user of users) {
    const seedData = USER_SEED_DATA[user.email];
    if (!seedData) continue;

    // Check if user already has an APPROVED/IMPLEMENTED BASE_SALARY decision
    const existing = await prisma.compensationDecision.findFirst({
      where: {
        tenantId: TENANT_ID,
        employeeId: user.id,
        type: 'BASE_SALARY',
        status: { in: ['APPROVED', 'IMPLEMENTED'] },
      },
    });

    if (existing) {
      console.log(`  ${user.firstName} ${user.lastName}: already has compensation decision (${existing.newAmount}) — skipping`);
      continue;
    }

    const changeAmount = seedData.salary - seedData.prevSalary;
    const changePercent = Math.round((changeAmount / seedData.prevSalary) * 10000) / 100;

    // Need a proposedById — use the first user (Danish/CTO) as proposer
    const proposer = users.find(u => u.email === 'agdanishr@gmail.com') || users[0];

    await prisma.compensationDecision.create({
      data: {
        tenantId: TENANT_ID,
        employeeId: user.id,
        type: 'BASE_SALARY',
        status: 'APPROVED',
        previousAmount: seedData.prevSalary,
        newAmount: seedData.salary,
        changeAmount,
        changePercent,
        currency: 'INR',
        effectiveDate: new Date('2026-01-01'),
        reason: 'Annual performance-based compensation review',
        performanceRating: seedData.rating,
        proposedById: proposer.id,
        proposedAt: new Date('2025-12-15'),
        approvedById: proposer.id,
        approvedAt: new Date('2025-12-20'),
      },
    });
    console.log(`  ${user.firstName} ${user.lastName}: created compensation decision, salary=${seedData.salary} (${changePercent}% increase)`);
  }

  console.log('\n=== HR Analytics seed complete ===');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
