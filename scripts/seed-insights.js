const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function seedForTenant(tenantId) {
  const users = await p.user.findMany({ where: { tenantId }, select: { id: true, firstName: true, lastName: true, jobTitle: true, level: true } });
  console.log('Tenant ' + tenantId.substring(0,8) + ' has ' + users.length + ' users');
  if (users.length === 0) return;

  // Clear existing
  await p.promotionRecommendation.deleteMany({ where: { tenantId } });
  await p.successionPlan.deleteMany({ where: { tenantId } });

  // ── Promotion Recommendations ──
  const promos = users.map((u, i) => {
    const perf = Math.round(60 + Math.random() * 35);
    const pot = Math.round(55 + Math.random() * 40);
    const skills = Math.round(50 + Math.random() * 40);
    const lead = Math.round(45 + Math.random() * 45);
    const ten = Math.round(40 + Math.random() * 50);
    const eng = Math.round(55 + Math.random() * 35);
    const overall = Math.round(perf * 0.3 + pot * 0.25 + skills * 0.15 + lead * 0.15 + ten * 0.08 + eng * 0.07);
    const readiness = overall >= 80 ? 'READY_NOW' : overall >= 65 ? 'READY_1_YEAR' : overall >= 50 ? 'READY_2_YEARS' : 'NEEDS_DEVELOPMENT';
    const roles = ['VP of Engineering', 'Senior Frontend Lead', 'Director of HR', 'Engineering Manager', 'Principal Architect'];
    return {
      tenantId,
      userId: u.id,
      targetRole: roles[i % roles.length],
      targetLevel: String((u.level ?? 3) + 2),
      overallScore: overall,
      readinessLevel: readiness,
      confidenceScore: Number((0.65 + Math.random() * 0.3).toFixed(2)),
      performanceScore: perf,
      potentialScore: pot,
      skillsMatchScore: skills,
      leadershipScore: lead,
      tenureScore: ten,
      engagementScore: eng,
      strengths: ['Strategic thinking', 'Technical expertise', 'Team leadership', 'Problem solving', 'Innovation'].slice(0, 2 + Math.floor(Math.random() * 3)),
      developmentNeeds: ['Executive presence', 'Cross-functional collaboration', 'Budget management'].slice(0, 1 + Math.floor(Math.random() * 2)),
      skillGaps: { 'Strategic Planning': { current: 60, required: 85 }, 'Budget Management': { current: 45, required: 75 } },
      riskFactors: ['Limited cross-dept exposure', 'Needs mentoring program'],
      developmentActions: [
        { action: 'Complete leadership development program', timeline: '3 months' },
        { action: 'Shadow VP for strategic meetings', timeline: '6 months' },
      ],
      estimatedTimeToReady: readiness === 'READY_NOW' ? 0 : readiness === 'READY_1_YEAR' ? 12 : 24,
      successProbability: Number((0.5 + Math.random() * 0.45).toFixed(2)),
      status: 'PENDING',
      recommendationType: 'AI_GENERATED',
      modelVersion: '1.0.0',
    };
  });

  const pc = await p.promotionRecommendation.createMany({ data: promos });
  console.log('  Created ' + pc.count + ' promotion recommendations');

  // ── Succession Plans ──
  const plans = [
    {
      tenantId,
      positionId: users[0].id,
      positionTitle: users[0].jobTitle || 'Executive Director',
      currentIncumbent: users[0].id,
      criticality: 'CRITICAL',
      turnoverRisk: 'MEDIUM',
      vacancyImpact: 'SEVERE',
      timeToFill: 90,
      successors: users.length > 1 ? [
        { userId: users[Math.min(1, users.length - 1)].id, name: users[Math.min(1, users.length - 1)].firstName + ' ' + users[Math.min(1, users.length - 1)].lastName, readiness: 'READY_1_YEAR', readinessScore: 72 },
      ] : [],
      benchStrength: Math.min(users.length - 1, 2),
      reviewFrequency: 'QUARTERLY',
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      developmentPipeline: [{ focus: 'Leadership coaching', timeline: '6 months' }],
    },
  ];

  if (users.length >= 2) {
    plans.push({
      tenantId,
      positionId: users[1].id,
      positionTitle: users[1].jobTitle || 'Senior Manager',
      currentIncumbent: users[1].id,
      criticality: 'HIGH',
      turnoverRisk: 'LOW',
      vacancyImpact: 'HIGH',
      timeToFill: 60,
      successors: [
        { userId: users[0].id, name: users[0].firstName + ' ' + users[0].lastName, readiness: 'READY_NOW', readinessScore: 85 },
      ],
      benchStrength: 1,
      reviewFrequency: 'SEMI_ANNUAL',
      nextReviewDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      developmentPipeline: [],
    });
  }

  if (users.length >= 3) {
    plans.push({
      tenantId,
      positionId: users[2].id,
      positionTitle: users[2].jobTitle || 'Department Head',
      currentIncumbent: users[2].id,
      criticality: 'MEDIUM',
      turnoverRisk: 'HIGH',
      vacancyImpact: 'MEDIUM',
      timeToFill: 45,
      successors: [
        { userId: users[0].id, name: users[0].firstName + ' ' + users[0].lastName, readiness: 'READY_1_YEAR', readinessScore: 68 },
      ],
      benchStrength: 1,
      reviewFrequency: 'QUARTERLY',
      nextReviewDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      developmentPipeline: [{ focus: 'People management training', timeline: '3 months' }],
    });
  }

  const sc = await p.successionPlan.createMany({ data: plans });
  console.log('  Created ' + sc.count + ' succession plans');
}

(async () => {
  const tenants = await p.tenant.findMany({ select: { id: true, name: true } });
  for (const t of tenants) {
    console.log('Seeding for: ' + t.name + ' (' + t.id.substring(0,8) + ')');
    await seedForTenant(t.id);
  }
  await p.$disconnect();
  console.log('All done!');
})().catch(e => { console.error(e); process.exit(1); });
