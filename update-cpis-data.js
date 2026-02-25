const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const { calculateCPIS } = require('./packages/core/dist/math-engine');

const TENANT = 'cbd87cec-52e8-406d-9fae-5a43a6449c73';

// Users
const DANISH = '153faf9d-e532-411f-a2af-08ae582b2339';
const PREETHI = 'fda82924-1430-4314-a781-9d7f8e12ebb7';
const SANJAY = '1713f1d5-c2aa-46b5-b021-81ff400e0e2e';
const PRASINA = '8b1076fd-64f9-41b5-affd-36550457233b';

// Target grades:
//   Danish   → A   (~88)
//   Prasina  → A+  (~96)
//   Preethi  → B+  (~80)
//   Sanjay   → C+  (~66)

async function updateGoal(ownerId, titleContains, data) {
  const goal = await p.goal.findFirst({
    where: { ownerId, title: { contains: titleContains }, deletedAt: null },
  });
  if (!goal) { console.log(`  WARN: goal not found for "${titleContains}"`); return; }
  await p.goal.update({ where: { id: goal.id }, data });
  console.log(`  Updated "${goal.title}" → progress=${data.progress}${data.status ? ' status=' + data.status : ''}`);
}

async function run() {
  console.log('=== Updating goal progress ===\n');

  // ── Danish: boost for A ──
  console.log('Danish (target A):');
  await updateGoal(DANISH, 'ARR', { progress: 68 });           // was 42
  await updateGoal(DANISH, 'Customer Satisfaction', { progress: 78 }); // was 68
  await updateGoal(DANISH, 'Enterprise Clients', { progress: 75 });    // was 67

  // ── Prasina: dramatic boost for A+ ──
  console.log('\nPrasina (target A+):');
  await updateGoal(PRASINA, 'Performance Review', { progress: 80, status: 'COMPLETED' }); // was 30
  await updateGoal(PRASINA, 'Skill Gap', { progress: 70 }); // was 45

  // ── Preethi: lower for B+ ──
  console.log('\nPreethi (target B+):');
  await updateGoal(PREETHI, 'Feature Delivery', { progress: 45 }); // was 55
  await updateGoal(PREETHI, 'Bug Count', { progress: 60 });        // was 72
  await updateGoal(PREETHI, 'Mentor', { progress: 42 });           // was 50

  // ── Sanjay: lower for C+ ──
  console.log('\nSanjay (target C+):');
  await updateGoal(SANJAY, 'React', { progress: 50 });                        // was 60
  await updateGoal(SANJAY, 'Dashboard', { progress: 55, status: 'ACTIVE' });   // was 100 COMPLETED

  console.log('\n=== Verifying CPIS scores ===\n');

  // Now run CPIS calculation for verification
  const users = await p.user.findMany({
    where: { tenantId: TENANT, isActive: true, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, hireDate: true, level: true, tenantId: true },
  });

  for (const u of users) {
    const goals = await p.goal.findMany({
      where: { ownerId: u.id, deletedAt: null, status: { in: ['ACTIVE', 'COMPLETED'] } },
      select: { id: true, progress: true, weight: true, priority: true, type: true, status: true, dueDate: true, completedAt: true, alignments: { select: { id: true } }, progressUpdates: { select: { newProgress: true, previousProgress: true, createdAt: true }, orderBy: { createdAt: 'asc' } } },
    });
    const reviews = await p.review.findMany({
      where: { revieweeId: u.id, deletedAt: null, overallRating: { not: null } },
      select: { overallRating: true, type: true, reviewerId: true, biasScore: true },
    });
    const feedbacks = await p.feedback.findMany({
      where: { toUserId: u.id, deletedAt: null },
      select: { sentimentScore: true, type: true, createdAt: true, skillTags: true, valueTags: true },
      orderBy: { createdAt: 'asc' },
    });
    const fbGiven = await p.feedback.count({ where: { fromUserId: u.id, tenantId: u.tenantId, deletedAt: null } });
    const oneOnOnes = await p.oneOnOne.count({ where: { tenantId: u.tenantId, deletedAt: null, status: 'COMPLETED', OR: [{ managerId: u.id }, { employeeId: u.id }] } });
    const recGiven = await p.feedback.count({ where: { fromUserId: u.id, tenantId: u.tenantId, deletedAt: null, type: { in: ['RECOGNITION', 'PRAISE'] } } });

    const now = new Date();
    const tenure = u.hireDate ? (now.getTime() - new Date(u.hireDate).getTime()) / (365.25 * 86400000) : 1;

    const input = {
      goals: goals.map(g => ({ id: g.id, progress: g.progress, weight: g.weight, priority: g.priority || 'MEDIUM', type: g.type, status: g.status, daysLate: 0, complexity: 4, alignmentDepth: g.alignments.length })),
      reviews: reviews.map(r => ({ rating: r.overallRating, type: r.type, reviewerTrust: 50 })),
      feedbacks: feedbacks.filter(f => f.sentimentScore !== null).map((f, i, a) => ({ sentimentScore: f.sentimentScore, type: f.type, recency: a.length > 1 ? i / (a.length - 1) : 1, hasSkillTags: false, hasValueTags: false })),
      collaboration: { crossFunctionalGoals: goals.filter(g => g.alignments.length > 0).length, feedbackGivenCount: fbGiven, feedbackReceivedCount: feedbacks.length, oneOnOneCount: oneOnOnes, recognitionsGiven: recGiven, teamGoalContributions: goals.filter(g => g.type !== 'INDIVIDUAL').length },
      consistency: { onTimeDeliveryRate: 0.75, goalVelocityVariance: 5, streakDays: 0, reviewRatingStdDev: 1, missedDeadlines: 0, totalDeadlines: 0 },
      growth: { historicalScores: [], skillProgressions: 0, trainingsCompleted: 0, developmentPlanProgress: 0, promotionReadiness: 0 },
      evidence: { totalEvidence: 0, verifiedEvidence: 0, avgImpactScore: 0, avgQualityScore: 0, evidenceTypes: 0 },
      initiative: { innovationContributions: 0, mentoringSessions: 0, knowledgeSharing: 0, processImprovements: 0, voluntaryGoals: 0 },
      tenureYears: Math.max(0.1, tenure),
      level: u.level || 3,
    };

    const r = calculateCPIS(input);
    const target = u.id === DANISH ? 'A' : u.id === PRASINA ? 'A+' : u.id === PREETHI ? 'B+' : u.id === SANJAY ? 'C+' : '?';
    const match = r.grade === target ? '✓' : '✗';
    console.log(`${match} ${u.firstName} ${u.lastName} | Score: ${r.score} | Grade: ${r.grade} (target: ${target}) | Stars: ${r.starRating}`);
    r.dimensions.filter(d => d.weightedScore > 0).forEach(d => console.log(`    ${d.code} raw:${d.rawScore} wt:${d.weightedScore}`));
  }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
