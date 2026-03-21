/**
 * Seed script to fix UI density issues identified in Visual QA Audit.
 *
 * Fixes:
 * - M4/M5/M13: Give Prasina a direct report (Sanjay) so team pages show data
 * - M6: Seed EngagementScore records for engagement trend chart
 * - M11: Seed CompensationDecision records for compensation page
 * - M1: Seed more activity records (via engagement events)
 *
 * Run: pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/seed-density-fixes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'cbd87cec-52e8-406d-9fae-5a43a6449c73';

async function main() {
  console.log('=== Density Fixes Seed Script ===\n');

  // ── Phase 0: Fetch demo users ──
  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, firstName: true, lastName: true, email: true, managerId: true },
  });

  const danish = users.find(u => u.firstName === 'Danish');
  const preethi = users.find(u => u.firstName === 'Preethi');
  const sanjay = users.find(u => u.firstName === 'Sanjay');
  const prasina = users.find(u => u.firstName === 'Prasina');

  if (!danish || !preethi || !sanjay || !prasina) {
    console.error('Missing demo users:', { danish: !!danish, preethi: !!preethi, sanjay: !!sanjay, prasina: !!prasina });
    return;
  }

  console.log('Found users:', users.map(u => `${u.firstName} ${u.lastName}`).join(', '));

  // ── Phase 1: Fix team hierarchy — give Prasina a direct report ──
  // Currently: Sanjay -> Preethi -> Danish, Prasina -> Danish
  // Change: Sanjay -> Prasina -> Danish (so Prasina has a team member)
  console.log('\n--- Phase 1: Fix team hierarchy ---');

  await prisma.user.update({
    where: { id: sanjay.id },
    data: { managerId: prasina.id },
  });
  console.log(`  Updated Sanjay's managerId to Prasina (${prasina.id})`);

  // Also update ReportingLine if exists
  const existingLine = await prisma.reportingLine.findFirst({
    where: { reporterId: sanjay.id, tenantId: TENANT_ID },
  });
  if (existingLine) {
    await prisma.reportingLine.update({
      where: { id: existingLine.id },
      data: { managerId: prasina.id },
    });
    console.log('  Updated ReportingLine: Sanjay -> Prasina');
  }

  // ── Phase 2: Seed Engagement Scores (fixes M6 — engagement trend) ──
  console.log('\n--- Phase 2: Seed Engagement Scores ---');

  // Delete existing scores for this tenant
  await prisma.engagementScore.deleteMany({ where: { tenantId: TENANT_ID } });

  const allUsers = [danish, preethi, sanjay, prasina];
  const now = new Date();
  let engagementCount = 0;

  // Create 6 months of weekly engagement scores for each user
  for (const user of allUsers) {
    for (let weeksAgo = 0; weeksAgo < 24; weeksAgo++) {
      const scoreDate = new Date(now);
      scoreDate.setDate(scoreDate.getDate() - weeksAgo * 7);
      scoreDate.setHours(9, 0, 0, 0);

      // Generate realistic scores that vary per user and have trends
      const baseScore = user === danish ? 82 : user === preethi ? 78 : user === sanjay ? 70 : 85;
      const trend = weeksAgo < 8 ? 0 : weeksAgo < 16 ? -2 : -5; // improving over time
      const noise = Math.sin(weeksAgo * 0.7) * 5 + (Math.random() - 0.5) * 4;
      const overall = Math.min(100, Math.max(20, baseScore - trend + noise));

      const participation = Math.min(100, Math.max(10, overall + (Math.random() - 0.5) * 10));
      const communication = Math.min(100, Math.max(10, overall + (Math.random() - 0.5) * 12));
      const collaboration = Math.min(100, Math.max(10, overall + (Math.random() - 0.5) * 8));
      const initiative = Math.min(100, Math.max(10, overall + (Math.random() - 0.5) * 15));
      const responsiveness = Math.min(100, Math.max(10, overall + (Math.random() - 0.5) * 10));

      const scoreLevel = overall >= 80 ? 'VERY_HIGH' : overall >= 65 ? 'HIGH' : overall >= 50 ? 'MODERATE' : overall >= 35 ? 'LOW' : 'VERY_LOW';
      const trendDir = weeksAgo === 0 ? null : noise > 0 ? 'UP' : noise < -2 ? 'DOWN' : 'STABLE';

      await prisma.engagementScore.create({
        data: {
          tenantId: TENANT_ID,
          userId: user.id,
          overallScore: parseFloat(overall.toFixed(2)),
          scoreLevel,
          participationScore: parseFloat(participation.toFixed(2)),
          communicationScore: parseFloat(communication.toFixed(2)),
          collaborationScore: parseFloat(collaboration.toFixed(2)),
          initiativeScore: parseFloat(initiative.toFixed(2)),
          responsivenessScore: parseFloat(responsiveness.toFixed(2)),
          activityMetrics: {
            goalsUpdated: Math.floor(Math.random() * 5) + 1,
            feedbackGiven: Math.floor(Math.random() * 3),
            meetingsAttended: Math.floor(Math.random() * 4) + 1,
            reviewsCompleted: Math.floor(Math.random() * 2),
          },
          engagementPatterns: {
            peakHours: ['10:00', '14:00', '16:00'],
            activeDays: 5,
            avgResponseTime: Math.floor(Math.random() * 120) + 30,
          },
          trendDirection: trendDir,
          changeFromPrevious: weeksAgo === 0 ? null : parseFloat((noise * 0.3).toFixed(2)),
          weekOverWeekChange: weeksAgo === 0 ? null : parseFloat(((Math.random() - 0.5) * 4).toFixed(2)),
          riskFactors: overall < 50 ? ['Low participation', 'Declining communication'] : [],
          atRisk: overall < 50,
          riskLevel: overall < 35 ? 'HIGH' : overall < 50 ? 'MEDIUM' : null,
          scoreDate,
          calculationPeriod: 'WEEKLY',
          calculatedAt: scoreDate,
        },
      });
      engagementCount++;
    }
  }
  console.log(`  Created ${engagementCount} engagement score records`);

  // ── Phase 3: Seed Engagement Events (for activity feed) ──
  console.log('\n--- Phase 3: Seed Engagement Events ---');

  await prisma.engagementEvent.deleteMany({ where: { tenantId: TENANT_ID } });

  const eventTypes = [
    { type: 'GOAL_UPDATED', category: 'PARTICIPATION', impact: 0.8, positive: true },
    { type: 'FEEDBACK_GIVEN', category: 'COMMUNICATION', impact: 0.9, positive: true },
    { type: 'REVIEW_COMPLETED', category: 'PARTICIPATION', impact: 0.95, positive: true },
    { type: 'MEETING_ATTENDED', category: 'COLLABORATION', impact: 0.7, positive: true },
    { type: 'RECOGNITION_SENT', category: 'COMMUNICATION', impact: 0.85, positive: true },
    { type: 'SKILL_ASSESSED', category: 'INITIATIVE', impact: 0.75, positive: true },
    { type: 'MISSED_DEADLINE', category: 'PARTICIPATION', impact: -0.6, positive: false },
    { type: 'LATE_RESPONSE', category: 'RESPONSIVENESS', impact: -0.4, positive: false },
  ];

  let eventCount = 0;
  for (const user of allUsers) {
    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      // 1-3 events per day per user
      const eventsPerDay = Math.floor(Math.random() * 3) + 1;
      for (let e = 0; e < eventsPerDay; e++) {
        const eventDef = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const eventTime = new Date(now);
        eventTime.setDate(eventTime.getDate() - daysAgo);
        eventTime.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);

        await prisma.engagementEvent.create({
          data: {
            tenantId: TENANT_ID,
            userId: user.id,
            eventType: eventDef.type,
            eventCategory: eventDef.category,
            eventData: { source: 'demo-seed', dayOfWeek: eventTime.getDay() },
            engagementImpact: eventDef.impact,
            positiveIndicator: eventDef.positive,
            eventTimestamp: eventTime,
            processedAt: eventTime,
          },
        });
        eventCount++;
      }
    }
  }
  console.log(`  Created ${eventCount} engagement event records`);

  // ── Phase 4: Seed Compensation Decisions (fixes M11) ──
  console.log('\n--- Phase 4: Seed Compensation Decisions ---');

  await prisma.compensationDecision.deleteMany({ where: { tenantId: TENANT_ID } });

  // Find review cycle
  const reviewCycle = await prisma.reviewCycle.findFirst({ where: { tenantId: TENANT_ID } });

  const compRecords = [
    {
      employeeId: danish.id,
      type: 'BASE_SALARY' as const,
      previousAmount: 180000,
      newAmount: 195000,
      reason: 'Annual merit increase — exceptional leadership in Q4 product launch',
      performanceRating: 4.5,
      effectiveDate: new Date('2026-01-15'),
      status: 'IMPLEMENTED' as const,
    },
    {
      employeeId: preethi.id,
      type: 'BASE_SALARY' as const,
      previousAmount: 140000,
      newAmount: 152000,
      reason: 'Annual merit increase — strong team delivery metrics',
      performanceRating: 4.2,
      effectiveDate: new Date('2026-01-15'),
      status: 'IMPLEMENTED' as const,
    },
    {
      employeeId: sanjay.id,
      type: 'BASE_SALARY' as const,
      previousAmount: 95000,
      newAmount: 105000,
      reason: 'Annual merit increase — significant skill growth in frontend architecture',
      performanceRating: 4.0,
      effectiveDate: new Date('2026-01-15'),
      status: 'APPROVED' as const,
    },
    {
      employeeId: prasina.id,
      type: 'BASE_SALARY' as const,
      previousAmount: 120000,
      newAmount: 132000,
      reason: 'Annual merit increase — excellent HR program delivery',
      performanceRating: 4.3,
      effectiveDate: new Date('2026-01-15'),
      status: 'IMPLEMENTED' as const,
    },
    {
      employeeId: danish.id,
      type: 'BONUS' as const,
      previousAmount: 0,
      newAmount: 25000,
      reason: 'Q4 2025 performance bonus — product launch delivered on time',
      performanceRating: 4.5,
      effectiveDate: new Date('2026-02-01'),
      status: 'IMPLEMENTED' as const,
    },
    {
      employeeId: preethi.id,
      type: 'EQUITY' as const,
      previousAmount: 0,
      newAmount: 15000,
      reason: 'Equity refresh — key retention for engineering leadership',
      performanceRating: 4.2,
      effectiveDate: new Date('2026-03-01'),
      status: 'PENDING_APPROVAL' as const,
    },
    {
      employeeId: sanjay.id,
      type: 'BONUS' as const,
      previousAmount: 0,
      newAmount: 8000,
      reason: 'Spot bonus — frontend performance optimization project',
      performanceRating: 4.0,
      effectiveDate: new Date('2026-02-15'),
      status: 'APPROVED' as const,
    },
  ];

  for (const comp of compRecords) {
    const changeAmount = comp.newAmount - comp.previousAmount;
    const changePercent = comp.previousAmount > 0 ? (changeAmount / comp.previousAmount) * 100 : 100;

    await prisma.compensationDecision.create({
      data: {
        tenantId: TENANT_ID,
        employeeId: comp.employeeId,
        reviewCycleId: reviewCycle?.id || null,
        type: comp.type,
        status: comp.status,
        previousAmount: comp.previousAmount,
        newAmount: comp.newAmount,
        changeAmount,
        changePercent: parseFloat(changePercent.toFixed(2)),
        currency: 'USD',
        effectiveDate: comp.effectiveDate,
        reason: comp.reason,
        performanceRating: comp.performanceRating,
        proposedById: prasina.id, // HR proposes
        proposedAt: new Date('2026-01-10'),
        approvedById: comp.status === 'IMPLEMENTED' || comp.status === 'APPROVED' ? danish.id : null,
        approvedAt: comp.status === 'IMPLEMENTED' || comp.status === 'APPROVED' ? new Date('2026-01-12') : null,
        implementedAt: comp.status === 'IMPLEMENTED' ? comp.effectiveDate : null,
        implementedById: comp.status === 'IMPLEMENTED' ? prasina.id : null,
        metadata: {},
      },
    });
  }
  console.log(`  Created ${compRecords.length} compensation decision records`);

  console.log('\n=== All density fixes seeded successfully! ===');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
