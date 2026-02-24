/**
 * Demo Data Seed Script — Full Platform (84 Pages / 47 Modules)
 * Date anchor: 2026-02-22 | Target tenant: demo-company
 *
 * Run: pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/demo-seed.ts
 *
 * Idempotent: deletes existing demo data for the tenant, then inserts fresh data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_SLUG = 'demo-company';
const TODAY = new Date('2026-02-22T00:00:00.000Z');

function d(dateStr: string): Date {
  return new Date(dateStr);
}

async function main() {
  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 0: Fetch tenant + users
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Phase 0: Fetching tenant and users...');

  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant) throw new Error(`Tenant '${TENANT_SLUG}' not found. Run the main seed first.`);
  const tenantId = tenant.id;
  console.log(`  ✓ Tenant: ${tenant.name} (${tenantId})`);

  const [danish, prasina, preethi, sanjay] = await Promise.all([
    prisma.user.findFirst({ where: { email: 'agdanishr@gmail.com', tenantId } }),
    prisma.user.findFirst({ where: { email: 'danish@xzashr.com', tenantId } }),
    prisma.user.findFirst({ where: { email: 'preethisivachandran0@gmail.com', tenantId } }),
    prisma.user.findFirst({ where: { email: 'sanjayn0369@gmail.com', tenantId } }),
  ]);

  if (!danish) throw new Error('agdanishr@gmail.com not found in demo-company');
  if (!prasina) throw new Error('danish@xzashr.com not found in demo-company');
  if (!preethi) throw new Error('preethisivachandran0@gmail.com not found in demo-company');
  if (!sanjay) throw new Error('sanjayn0369@gmail.com not found in demo-company');

  console.log(`  ✓ Users: ${danish.firstName}, ${prasina.firstName}, ${preethi.firstName}, ${sanjay.firstName}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: Cleanup (reverse-dependency order)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 1: Cleanup...');

  // Collect IDs for child models that lack tenantId
  const existingConvIds = (await prisma.conversation.findMany({ where: { tenantId }, select: { id: true } })).map((c) => c.id);
  const existingGoalIds = (await prisma.goal.findMany({ where: { tenantId }, select: { id: true } })).map((g) => g.id);
  const existingTeamIds = (await prisma.team.findMany({ where: { tenantId }, select: { id: true } })).map((t) => t.id);
  const existingSessionIds = (await prisma.calibrationSession.findMany({ where: { tenantId }, select: { id: true } })).map((s) => s.id);

  // Delete in reverse-dependency order
  await prisma.aIInsightCard.deleteMany({ where: { tenantId } });

  if (existingConvIds.length) {
    await prisma.chatMessage.deleteMany({ where: { conversationId: { in: existingConvIds } } });
    await prisma.conversationParticipant.deleteMany({ where: { conversationId: { in: existingConvIds } } });
  }
  await prisma.conversation.deleteMany({ where: { tenantId } });

  await prisma.calendarEvent.deleteMany({ where: { tenantId } });
  await prisma.notificationBoardItem.deleteMany({ where: { tenantId } });
  await prisma.notification.deleteMany({ where: { tenantId } });
  await prisma.organizationalHealthMetrics.deleteMany({ where: { tenantId } });
  await prisma.complianceAssessment.deleteMany({ where: { tenantId } });
  await prisma.leaderboardEntry.deleteMany({ where: { tenantId } });
  await prisma.leaderboard.deleteMany({ where: { tenantId } });
  await prisma.dailyPerformanceMetric.deleteMany({ where: { tenantId } });
  await prisma.engagementEvent.deleteMany({ where: { tenantId } });
  await prisma.engagementScore.deleteMany({ where: { tenantId } });
  await prisma.pulseSurveyResponse.deleteMany({ where: { tenantId } });
  await prisma.careerPath.deleteMany({ where: { tenantId } });
  await prisma.successionPlan.deleteMany({ where: { tenantId } });
  await prisma.technicalSkillAssessment.deleteMany({ where: { tenantId } });
  await prisma.skillCategory.deleteMany({ where: { tenantId } });
  await prisma.evidence.deleteMany({ where: { tenantId } });
  await prisma.developmentPlan.deleteMany({ where: { tenantId } });
  await prisma.oneOnOne.deleteMany({ where: { tenantId } });
  await prisma.pIPMilestone.deleteMany({ where: { tenantId } });
  await prisma.pIPCheckIn.deleteMany({ where: { tenantId } });
  await prisma.performanceImprovementPlan.deleteMany({ where: { tenantId } });
  await prisma.promotionDecision.deleteMany({ where: { tenantId } });
  await prisma.compensationDecision.deleteMany({ where: { tenantId } });

  if (existingSessionIds.length) {
    await prisma.calibrationParticipant.deleteMany({ where: { sessionId: { in: existingSessionIds } } });
  }
  await prisma.calibrationSession.deleteMany({ where: { tenantId } });

  await prisma.feedback.deleteMany({ where: { tenantId } });
  await prisma.review.deleteMany({ where: { tenantId } });
  await prisma.reviewCycle.deleteMany({ where: { tenantId } });
  await prisma.projectMilestone.deleteMany({ where: { tenantId } });

  if (existingGoalIds.length) {
    await prisma.goalComment.deleteMany({ where: { goalId: { in: existingGoalIds } } });
    await prisma.goalProgressUpdate.deleteMany({ where: { goalId: { in: existingGoalIds } } });
    await prisma.goalAlignment.deleteMany({ where: { fromGoalId: { in: existingGoalIds } } });
  }
  await prisma.goal.deleteMany({ where: { tenantId } });

  if (existingTeamIds.length) {
    await prisma.teamMember.deleteMany({ where: { teamId: { in: existingTeamIds } } });
  }
  await prisma.team.deleteMany({ where: { tenantId } });

  await prisma.reportingLine.deleteMany({ where: { tenantId } });

  // Reset org fields on all users before deleting departments/business units
  await prisma.user.updateMany({
    where: { tenantId },
    data: { jobTitle: null, departmentId: null, employeeNumber: null, hireDate: null, managerId: null, businessUnitId: null },
  });

  await prisma.department.deleteMany({ where: { tenantId } });
  await prisma.businessUnit.deleteMany({ where: { tenantId } });

  console.log('  ✓ Cleanup complete');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: Org Structure
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 2: Org Structure...');

  const businessUnit = await prisma.businessUnit.create({
    data: { tenantId, name: 'Technology', code: 'TECH', headId: danish.id },
  });

  const deptHR = await prisma.department.create({
    data: { tenantId, name: 'People & HR', code: 'HR', headId: prasina.id },
  });

  const deptENG = await prisma.department.create({
    data: { tenantId, name: 'Product Engineering', code: 'ENG', headId: preethi.id },
  });

  await prisma.user.update({
    where: { id: danish.id },
    data: { jobTitle: 'Chief Technology Officer', departmentId: deptENG.id, employeeNumber: 'EMP-001', hireDate: d('2023-01-15'), businessUnitId: businessUnit.id },
  });
  await prisma.user.update({
    where: { id: prasina.id },
    data: { jobTitle: 'Head of People & HR', departmentId: deptHR.id, employeeNumber: 'EMP-002', hireDate: d('2023-03-01'), businessUnitId: businessUnit.id },
  });
  await prisma.user.update({
    where: { id: preethi.id },
    data: { jobTitle: 'Senior Engineering Manager', departmentId: deptENG.id, employeeNumber: 'EMP-003', hireDate: d('2023-06-01'), businessUnitId: businessUnit.id },
  });
  await prisma.user.update({
    where: { id: sanjay.id },
    data: { jobTitle: 'Frontend Engineer', departmentId: deptENG.id, employeeNumber: 'EMP-004', hireDate: d('2024-01-10'), businessUnitId: businessUnit.id },
  });

  await prisma.reportingLine.createMany({
    data: [
      { tenantId, reporterId: sanjay.id, managerId: preethi.id, type: 'SOLID', isPrimary: true },
      { tenantId, reporterId: preethi.id, managerId: danish.id, type: 'SOLID', isPrimary: true },
      { tenantId, reporterId: prasina.id, managerId: danish.id, type: 'SOLID', isPrimary: true },
    ],
  });

  console.log('  ✓ 1 business unit, 2 departments, 4 user profiles, 3 reporting lines');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3: Teams
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 3: Teams...');

  const team = await prisma.team.create({
    data: {
      tenantId,
      name: 'Product Engineering Squad',
      code: 'PES',
      type: 'FUNCTIONAL',
      leadId: preethi.id,
      departmentId: deptENG.id,
      businessUnitId: businessUnit.id,
    },
  });

  await prisma.teamMember.createMany({
    data: [
      { teamId: team.id, userId: preethi.id, role: 'LEAD', isPrimary: true },
      { teamId: team.id, userId: sanjay.id, role: 'MEMBER', isPrimary: true },
    ],
  });

  console.log('  ✓ 1 team + 2 members');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 4: Goals + Progress Updates + Comments + Alignments + Milestones
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 4: Goals...');

  interface GoalSpec {
    title: string;
    type: string;
    ownerId: string;
    progress: number;
    status: string;
    dueDate: Date;
    startDate: Date;
    completedAt?: Date;
    teamId?: string;
  }

  const goalSpecs: GoalSpec[] = [
    { title: 'Grow ARR to ₹5 Cr by Q2 2026', type: 'COMPANY', ownerId: danish.id, progress: 42, status: 'ACTIVE', dueDate: d('2026-06-30'), startDate: d('2026-01-01') },
    { title: 'Achieve 95% Customer Satisfaction', type: 'COMPANY', ownerId: danish.id, progress: 68, status: 'ACTIVE', dueDate: d('2026-03-31'), startDate: d('2026-01-01') },
    { title: 'Improve Feature Delivery Velocity +40%', type: 'TEAM', ownerId: preethi.id, progress: 55, status: 'ACTIVE', dueDate: d('2026-03-31'), startDate: d('2026-01-01'), teamId: team.id },
    { title: 'Onboard 3 Enterprise Clients in Q1', type: 'INDIVIDUAL', ownerId: danish.id, progress: 67, status: 'ACTIVE', dueDate: d('2026-03-31'), startDate: d('2026-01-01') },
    { title: 'Complete Q1 2026 Performance Review Cycle', type: 'INDIVIDUAL', ownerId: prasina.id, progress: 30, status: 'ACTIVE', dueDate: d('2026-03-31'), startDate: d('2026-01-15') },
    { title: 'Skill Gap Analysis — 100% Employees', type: 'INDIVIDUAL', ownerId: prasina.id, progress: 45, status: 'ACTIVE', dueDate: d('2026-04-30'), startDate: d('2026-01-01') },
    { title: 'Reduce Bug Count by 50%', type: 'INDIVIDUAL', ownerId: preethi.id, progress: 72, status: 'ACTIVE', dueDate: d('2026-02-28'), startDate: d('2026-01-01') },
    { title: 'Mentor 2 Junior Developers', type: 'INDIVIDUAL', ownerId: preethi.id, progress: 50, status: 'ACTIVE', dueDate: d('2026-04-30'), startDate: d('2026-01-01') },
    { title: 'Complete React Advanced Certification', type: 'INDIVIDUAL', ownerId: sanjay.id, progress: 60, status: 'ACTIVE', dueDate: d('2026-03-15'), startDate: d('2026-01-01') },
    { title: 'Deliver User Dashboard Feature', type: 'INDIVIDUAL', ownerId: sanjay.id, progress: 100, status: 'COMPLETED', dueDate: d('2026-02-15'), startDate: d('2026-01-10'), completedAt: d('2026-02-15') },
  ];

  const goals: any[] = [];
  for (const gs of goalSpecs) {
    const goal = await prisma.goal.create({
      data: {
        tenantId,
        ownerId: gs.ownerId,
        createdById: gs.ownerId,
        type: gs.type as any,
        title: gs.title,
        status: gs.status as any,
        progress: gs.progress,
        priority: 'HIGH',
        startDate: gs.startDate,
        dueDate: gs.dueDate,
        completedAt: gs.completedAt ?? null,
        teamId: gs.teamId ?? null,
      },
    });
    goals.push(goal);
  }

  // GoalProgressUpdates
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    const gs = goalSpecs[i];
    if (gs.status === 'COMPLETED') {
      await prisma.goalProgressUpdate.create({
        data: { goalId: g.id, previousProgress: 0, newProgress: 100, updatedById: gs.ownerId, note: 'Goal completed ahead of schedule!', createdAt: d('2026-02-15') },
      });
    } else {
      const mid = Math.max(5, gs.progress - 20);
      await prisma.goalProgressUpdate.create({
        data: { goalId: g.id, previousProgress: 0, newProgress: mid, updatedById: gs.ownerId, note: 'Initial progress update — strong start.', createdAt: d('2026-02-04') },
      });
      await prisma.goalProgressUpdate.create({
        data: { goalId: g.id, previousProgress: mid, newProgress: gs.progress, updatedById: gs.ownerId, note: 'Latest progress — on track for completion.', createdAt: d('2026-02-20') },
      });
    }
  }

  // GoalComments
  const userById: Record<string, any> = { [danish.id]: danish, [prasina.id]: prasina, [preethi.id]: preethi, [sanjay.id]: sanjay };
  for (let i = 0; i < goals.length; i++) {
    const g = goals[i];
    const owner = userById[goalSpecs[i].ownerId];
    await prisma.goalComment.create({
      data: { goalId: g.id, authorId: owner.id, content: `Good progress on "${goalSpecs[i].title}" — keep the momentum going!`, createdAt: d('2026-02-18') },
    });
    await prisma.goalComment.create({
      data: { goalId: g.id, authorId: danish.id, content: `Reviewed "${goalSpecs[i].title}" in leadership sync — on track for Q1 delivery.`, createdAt: d('2026-02-20') },
    });
  }

  // GoalAlignments: [2]→[0], [9]→[2], [8]→[9]
  await prisma.goalAlignment.create({ data: { fromGoalId: goals[2].id, toGoalId: goals[0].id, alignmentType: 'supports', contributionWeight: 0.7 } });
  await prisma.goalAlignment.create({ data: { fromGoalId: goals[9].id, toGoalId: goals[2].id, alignmentType: 'supports', contributionWeight: 0.8 } });
  await prisma.goalAlignment.create({ data: { fromGoalId: goals[8].id, toGoalId: goals[9].id, alignmentType: 'enables', contributionWeight: 0.5 } });

  // ProjectMilestones for sanjay's React cert goal (index 8)
  await prisma.projectMilestone.createMany({
    data: [
      { tenantId, goalId: goals[8].id, title: 'Module 1: React Hooks Deep Dive', status: 'completed', progressPercentage: 100, plannedDate: d('2026-02-10'), actualDate: d('2026-02-10'), ownerId: sanjay.id },
      { tenantId, goalId: goals[8].id, title: 'Module 2: Advanced Patterns & Performance', status: 'in_progress', progressPercentage: 45, plannedDate: d('2026-03-01'), ownerId: sanjay.id },
    ],
  });

  console.log(`  ✓ ${goals.length} goals, ${goals.length * 2 - 1} progress updates, ${goals.length * 2} comments, 3 alignments, 2 milestones`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 5: Review Cycle + Reviews
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 5: Review Cycle...');

  const reviewCycle = await prisma.reviewCycle.create({
    data: {
      tenantId,
      name: 'Q1 FY2026 Annual Performance Review',
      type: 'ANNUAL',
      status: 'SELF_ASSESSMENT',
      startDate: d('2026-01-15'),
      endDate: d('2026-04-30'),
      selfAssessmentStart: d('2026-02-10'),
      selfAssessmentEnd: d('2026-02-28'),
      managerReviewStart: d('2026-03-01'),
      managerReviewEnd: d('2026-03-20'),
      calibrationStart: d('2026-03-22'),
      calibrationEnd: d('2026-03-28'),
      createdById: prasina.id,
    },
  });

  await prisma.review.createMany({
    data: [
      { tenantId, cycleId: reviewCycle.id, revieweeId: sanjay.id, reviewerId: sanjay.id, type: 'SELF', status: 'IN_PROGRESS' },
      {
        tenantId, cycleId: reviewCycle.id, revieweeId: preethi.id, reviewerId: preethi.id, type: 'SELF', status: 'SUBMITTED',
        overallRating: 4.2, strengths: ['Technical Leadership', 'Sprint Planning', 'Cross-team Collaboration'],
        areasForGrowth: ['Executive Communication', 'Strategic Delegation'], submittedAt: d('2026-02-20'),
      },
      { tenantId, cycleId: reviewCycle.id, revieweeId: sanjay.id, reviewerId: preethi.id, type: 'MANAGER', status: 'NOT_STARTED' },
      { tenantId, cycleId: reviewCycle.id, revieweeId: preethi.id, reviewerId: danish.id, type: 'MANAGER', status: 'NOT_STARTED' },
    ],
  });

  console.log('  ✓ 1 review cycle (SELF_ASSESSMENT, deadline Feb 28) + 4 reviews');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 6: Feedback
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 6: Feedback...');

  await prisma.feedback.createMany({
    data: [
      { tenantId, fromUserId: danish.id, toUserId: sanjay.id, type: 'PRAISE', visibility: 'PUBLIC', content: 'Delivered the user dashboard 2 days ahead of schedule with zero critical defects. Exceptional engineering discipline and attention to quality.', isAnonymous: false, sentiment: 'positive', sentimentScore: 0.95, createdAt: d('2026-02-20') },
      { tenantId, fromUserId: preethi.id, toUserId: sanjay.id, type: 'CONSTRUCTIVE', visibility: 'MANAGER_VISIBLE', content: 'Strong code quality and test coverage this sprint. Suggest improving PR documentation — more context on design decisions would help reviewers and future maintainers.', isAnonymous: false, sentiment: 'constructive', sentimentScore: 0.72, createdAt: d('2026-02-18') },
      { tenantId, fromUserId: sanjay.id, toUserId: preethi.id, type: 'PRAISE', visibility: 'PRIVATE', content: 'Clear sprint planning sessions and excellent async communication. It is easy to get technical decisions unblocked quickly. Great support on the dashboard feature!', isAnonymous: false, sentiment: 'positive', sentimentScore: 0.90, createdAt: d('2026-02-15') },
      { tenantId, fromUserId: prasina.id, toUserId: preethi.id, type: 'RECOGNITION', visibility: 'PUBLIC', content: 'Exceptional Q4 delivery — all sprint goals met, zero missed deadlines, and team morale at an all-time high. Outstanding people leadership and technical execution.', isAnonymous: false, sentiment: 'positive', sentimentScore: 0.93, createdAt: d('2026-02-12') },
      { tenantId, fromUserId: danish.id, toUserId: prasina.id, type: 'PRAISE', visibility: 'PUBLIC', content: 'The new HR analytics framework has saved the leadership team 6+ hours per week in reporting. A genuinely transformative contribution to how we make people decisions.', isAnonymous: false, sentiment: 'positive', sentimentScore: 0.88, createdAt: d('2026-02-10') },
      { tenantId, fromUserId: preethi.id, toUserId: danish.id, type: 'SUGGESTION', visibility: 'PRIVATE', content: 'A weekly all-hands would significantly improve cross-team alignment. It would help surface blockers earlier in the sprint cycle and give everyone better business context.', isAnonymous: false, sentiment: 'constructive', sentimentScore: 0.75, createdAt: d('2026-02-08') },
    ],
  });

  console.log('  ✓ 6 feedback records');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 7: Calibration Session
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 7: Calibration...');

  const calibSession = await prisma.calibrationSession.create({
    data: {
      tenantId,
      cycleId: reviewCycle.id,
      name: 'Q1 2026 Engineering Calibration',
      facilitatorId: prasina.id,
      status: 'SCHEDULED',
      scheduledStart: d('2026-03-22T09:00:00.000Z'),
      scheduledEnd: d('2026-03-22T12:00:00.000Z'),
    },
  });

  await prisma.calibrationParticipant.createMany({
    data: [
      { sessionId: calibSession.id, userId: danish.id, role: 'facilitator' },
      { sessionId: calibSession.id, userId: prasina.id, role: 'hr' },
      { sessionId: calibSession.id, userId: preethi.id, role: 'manager' },
    ],
  });

  console.log('  ✓ 1 calibration session (Mar 22) + 3 participants');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 8: Compensation + Promotion
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 8: Compensation & Promotion...');

  await prisma.compensationDecision.create({
    data: {
      tenantId,
      employeeId: preethi.id,
      reviewCycleId: reviewCycle.id,
      type: 'BASE_SALARY',
      status: 'APPROVED',
      previousAmount: 2200000,
      newAmount: 2600000,
      changeAmount: 400000,
      changePercent: 18.18,
      currency: 'INR',
      effectiveDate: d('2026-04-01'),
      reason: 'Annual merit increase — exceptional Q4 performance rating and team delivery excellence.',
      proposedById: danish.id,
      proposedAt: d('2026-02-15'),
      approvedById: danish.id,
      approvedAt: d('2026-02-18'),
    },
  });

  await prisma.promotionDecision.create({
    data: {
      tenantId,
      employeeId: sanjay.id,
      type: 'LEVEL_PROMOTION',
      status: 'UNDER_REVIEW',
      previousLevel: 3,
      newLevel: 4,
      previousTitle: 'Frontend Engineer',
      newTitle: 'Senior Frontend Engineer',
      nominatedById: preethi.id,
      nominatedAt: d('2026-02-18'),
      justification: 'Sanjay has consistently delivered high-quality features ahead of schedule, demonstrates L4-level ownership, and shows strong mentorship instincts.',
      strengths: ['Delivery Excellence', 'Code Quality', 'React Expertise'],
      developmentAreas: ['System Design', 'Technical Documentation'],
    },
  });

  console.log('  ✓ 1 compensation decision (approved) + 1 promotion under review');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 9: Performance Improvement Plan (coaching type)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 9: PIP (coaching plan)...');

  const pip = await prisma.performanceImprovementPlan.create({
    data: {
      tenantId,
      userId: sanjay.id,
      createdBy: preethi.id,
      pipTitle: 'Frontend Performance Acceleration Plan',
      pipType: 'COACHING',
      severity: 'LOW',
      startDate: d('2026-01-15'),
      endDate: d('2026-04-15'),
      duration: 90,
      reviewFrequency: 'WEEKLY',
      impactStatement: 'Accelerate Sanjay\'s growth from L3 to L4 Frontend Engineer through targeted skill development, certification, and delivery excellence.',
      performanceExpectations: 'Complete React Advanced certification by March 15. Deliver 2 sprint features per cycle with < 5% defect rate.',
      consequencesOfNonCompliance: 'Career progression to L4 will be reviewed if plan objectives are not met within the agreed timeline.',
      status: 'ACTIVE',
      progressPercentage: 65,
    },
  });

  await prisma.pIPCheckIn.createMany({
    data: [
      {
        tenantId,
        pipId: pip.id,
        userId: sanjay.id,
        checkInDate: d('2026-02-04T11:00:00.000Z'),
        checkInType: 'WEEKLY',
        conductedBy: preethi.id,
        progressSummary: 'Completed Module 1 of the React certification with a 95% score. Submitted 2 high-quality PRs this week with thorough test coverage. On track.',
        onTrack: true,
        managerFeedback: 'Excellent progress on both the certification and sprint delivery. Code review quality has improved noticeably. Keep up the momentum.',
        employeeFeedback: 'The coaching sessions are very helpful. Clear direction on what L4 looks like.',
        positiveObservations: ['Cert module completed ahead of schedule', 'PR quality significantly improved', '95% test score on Module 1'],
        attendees: [preethi.id, sanjay.id],
      },
      {
        tenantId,
        pipId: pip.id,
        userId: sanjay.id,
        checkInDate: d('2026-02-18T11:00:00.000Z'),
        checkInType: 'WEEKLY',
        conductedBy: preethi.id,
        progressSummary: 'Module 2 at 45% completion. User Dashboard feature delivered 7 days ahead of deadline with zero critical production bugs.',
        onTrack: true,
        managerFeedback: 'Outstanding dashboard delivery. On track to complete the full certification by March 10. Promotion case is now being formally built.',
        employeeFeedback: 'Really motivated after the dashboard delivery. Looking forward to the promotion discussion.',
        positiveObservations: ['Dashboard delivered 7 days early', 'Zero critical production defects', '40% load time improvement achieved'],
        attendees: [preethi.id, sanjay.id],
      },
    ],
  });

  await prisma.pIPMilestone.createMany({
    data: [
      {
        tenantId,
        pipId: pip.id,
        milestoneName: 'Complete React Certification Module 1',
        description: 'Successfully complete the React Hooks Deep Dive module and pass the assessment with a score of 80% or higher.',
        dueDate: d('2026-02-10'),
        status: 'COMPLETED',
        completionDate: d('2026-02-10'),
        achievementLevel: 'EXCEEDED',
        evaluationNotes: 'Completed with 95% score, 3 days ahead of the deadline. Excellent effort.',
      },
      {
        tenantId,
        pipId: pip.id,
        milestoneName: 'Deliver User Dashboard Feature',
        description: 'Deliver the complete user dashboard feature with full automated test coverage and pass QA with fewer than 2 critical bugs.',
        dueDate: d('2026-02-20'),
        status: 'COMPLETED',
        completionDate: d('2026-02-13'),
        achievementLevel: 'EXCEEDED',
        evaluationNotes: 'Delivered 7 days ahead of schedule. Zero production defects. 40% load time improvement as a bonus.',
      },
    ],
  });

  console.log('  ✓ 1 coaching PIP + 2 check-ins + 2 milestones');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 10: One-on-Ones
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 10: One-on-Ones...');

  await prisma.oneOnOne.createMany({
    data: [
      {
        tenantId,
        managerId: preethi.id,
        employeeId: sanjay.id,
        status: 'COMPLETED',
        scheduledAt: d('2026-02-18T11:00:00.000Z'),
        duration: 45,
        agenda: ['Sprint 7 retrospective', 'Q1 goal check-in', 'Career growth & promotion discussion'],
        sharedNotes: 'All Q1 goals on track. Sanjay expressed interest in module ownership next sprint. Dashboard delivery was exceptional — formally nominating for L4 promotion. React cert on track for Mar 10 completion.',
        completedAt: d('2026-02-18T11:48:00.000Z'),
      },
      {
        tenantId,
        managerId: preethi.id,
        employeeId: sanjay.id,
        status: 'SCHEDULED',
        scheduledAt: d('2026-02-25T11:00:00.000Z'),
        duration: 30,
        agenda: ['React cert Module 2 progress', 'PIP milestone review', 'Sprint 8 planning & priorities'],
      },
      {
        tenantId,
        managerId: preethi.id,
        employeeId: sanjay.id,
        status: 'SCHEDULED',
        scheduledAt: d('2026-03-04T11:00:00.000Z'),
        duration: 45,
        agenda: ['Q1 self-review prep support', 'L4 promotion timeline discussion', 'System design learning path'],
      },
      {
        tenantId,
        managerId: danish.id,
        employeeId: preethi.id,
        status: 'COMPLETED',
        scheduledAt: d('2026-02-15T14:00:00.000Z'),
        duration: 50,
        agenda: ['Q1 calibration strategy', 'Team velocity review — 32% improvement', 'Compensation review outcome', 'Engineering roadmap priorities'],
        sharedNotes: 'Q1 calibration approach agreed. Team velocity is up 32% — on track to hit the 40% target. Preethi\'s compensation merit increase formally approved for April 1. Strong Q1 overall.',
        completedAt: d('2026-02-15T14:53:00.000Z'),
      },
    ],
  });

  console.log('  ✓ 4 one-on-ones (2 completed, 2 scheduled)');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 11: Development Plan
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 11: Development Plan...');

  await prisma.developmentPlan.create({
    data: {
      tenantId,
      userId: sanjay.id,
      planName: 'Frontend Engineering Career Growth — L3 to L5',
      planType: 'CAREER_GROWTH',
      duration: 6,
      startDate: d('2026-01-01'),
      targetCompletionDate: d('2026-06-30'),
      careerGoal: 'Grow from L3 to L5 Senior Frontend Engineer within 18 months through hands-on delivery, advanced certification, system design skills, and technical mentorship.',
      targetRole: 'Senior Frontend Engineer',
      targetLevel: 'L5',
      currentLevel: 'L3',
      strengthsAssessed: ['React & TypeScript', 'UI/UX Implementation', 'Problem Solving', 'Code Quality & Testing'],
      developmentAreas: ['System Design', 'TypeScript Advanced Patterns', 'Technical Documentation', 'Mentoring Junior Engineers'],
      activities: [
        { id: 1, title: 'React Advanced Certification', type: 'CERTIFICATION', status: 'IN_PROGRESS', targetDate: '2026-03-15', progress: 60, description: 'Complete the React Advanced certification covering hooks, patterns, and performance.' },
        { id: 2, title: 'System Design Fundamentals Course', type: 'COURSE', status: 'IN_PROGRESS', targetDate: '2026-04-30', progress: 20, description: 'Learn distributed systems, scalability patterns, and architectural decision-making.' },
        { id: 3, title: 'Mentorship Sessions with Preethi', type: 'MENTORING', status: 'PLANNED', targetDate: '2026-06-30', progress: 0, description: 'Bi-weekly sessions covering leadership, system thinking, and career progression.' },
      ],
      totalActivities: 3,
      completedActivities: 1,
      progressPercentage: 35,
      status: 'ACTIVE',
      generatedBy: 'AI',
      approvedBy: danish.id,
      approvedAt: d('2026-01-05'),
    },
  });

  console.log('  ✓ 1 development plan (35% complete, 3 activities)');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 12: Evidence
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 12: Evidence...');

  await prisma.evidence.createMany({
    data: [
      {
        tenantId,
        employeeId: sanjay.id,
        type: 'TASK',
        source: 'MANUAL',
        status: 'VERIFIED',
        title: 'User Dashboard — delivered 7 days ahead of schedule',
        description: 'Delivered the complete user dashboard feature with full automated test coverage and zero critical production defects. 7 days early.',
        occurredAt: d('2026-02-13'),
        impactScore: 4.5,
        effortScore: 4.2,
        qualityScore: 4.8,
        verifiedById: preethi.id,
        verifiedAt: d('2026-02-14'),
        tags: ['delivery', 'dashboard', 'ahead-of-schedule'],
        skillTags: ['React', 'Testing', 'Frontend Architecture'],
      },
      {
        tenantId,
        employeeId: sanjay.id,
        type: 'PULL_REQUEST',
        source: 'GITHUB',
        status: 'VERIFIED',
        title: 'PR #142: Dashboard performance optimization — 40% load time reduction',
        description: 'Implemented lazy loading, code splitting, and strategic memoization resulting in a 40% improvement in initial page load time and 60% reduction in re-renders.',
        occurredAt: d('2026-02-17'),
        impactScore: 4.2,
        effortScore: 3.8,
        qualityScore: 4.5,
        complexityScore: 4.0,
        externalId: 'PR-142',
        externalUrl: 'https://github.com/org/pms-platform/pull/142',
        verifiedById: preethi.id,
        verifiedAt: d('2026-02-18'),
        tags: ['performance', 'optimization', 'frontend'],
        skillTags: ['React', 'Performance', 'TypeScript'],
      },
      {
        tenantId,
        employeeId: sanjay.id,
        type: 'KNOWLEDGE_SHARING',
        source: 'MANUAL',
        status: 'VERIFIED',
        title: 'React Hooks Deep Dive — Module 1 Certificate (Score: 95%)',
        description: 'Successfully completed Module 1 of the React Advanced certification program with a 95% score. Topics covered: useEffect, useMemo, useCallback, custom hooks, and the rules of hooks.',
        occurredAt: d('2026-02-10'),
        impactScore: 3.8,
        effortScore: 3.5,
        qualityScore: 4.5,
        verifiedById: prasina.id,
        verifiedAt: d('2026-02-11'),
        tags: ['certification', 'react', 'learning'],
        skillTags: ['React', 'TypeScript', 'Advanced Hooks'],
      },
    ],
  });

  console.log('  ✓ 3 verified evidence records');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 13: Skills
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 13: Skills...');

  const skillCatFE = await prisma.skillCategory.create({
    data: { tenantId, name: 'Frontend Development', categoryType: 'TECHNICAL', defaultWeight: 1.0 },
  });
  const skillCatBE = await prisma.skillCategory.create({
    data: { tenantId, name: 'Backend Development', categoryType: 'TECHNICAL', defaultWeight: 1.0 },
  });
  const skillCatLeader = await prisma.skillCategory.create({
    data: { tenantId, name: 'Leadership & Management', categoryType: 'BEHAVIORAL', defaultWeight: 0.8 },
  });
  const skillCatComm = await prisma.skillCategory.create({
    data: { tenantId, name: 'Communication', categoryType: 'BEHAVIORAL', defaultWeight: 0.7 },
  });

  await prisma.technicalSkillAssessment.createMany({
    data: [
      { tenantId, userId: sanjay.id, skillCategoryId: skillCatFE.id, skillName: 'React / TypeScript', skillLevel: 'ADVANCED', selfAssessment: 4.0, managerAssessment: 4.2, finalScore: 4.2, lastAssessedAt: d('2026-02-20') },
      { tenantId, userId: sanjay.id, skillCategoryId: skillCatFE.id, skillName: 'UI/UX Implementation', skillLevel: 'INTERMEDIATE', selfAssessment: 3.5, managerAssessment: 3.5, finalScore: 3.5, lastAssessedAt: d('2026-02-20') },
      { tenantId, userId: preethi.id, skillCategoryId: skillCatLeader.id, skillName: 'Engineering Management', skillLevel: 'ADVANCED', selfAssessment: 4.3, managerAssessment: 4.5, finalScore: 4.5, lastAssessedAt: d('2026-02-20') },
      { tenantId, userId: preethi.id, skillCategoryId: skillCatBE.id, skillName: 'Backend Development', skillLevel: 'INTERMEDIATE', selfAssessment: 3.8, managerAssessment: 3.8, finalScore: 3.8, lastAssessedAt: d('2026-02-20') },
      { tenantId, userId: danish.id, skillCategoryId: skillCatLeader.id, skillName: 'Technical Architecture', skillLevel: 'EXPERT', selfAssessment: 4.8, managerAssessment: 4.8, finalScore: 4.8, lastAssessedAt: d('2026-02-20') },
      { tenantId, userId: prasina.id, skillCategoryId: skillCatComm.id, skillName: 'HR Analytics & People Data', skillLevel: 'ADVANCED', selfAssessment: 4.2, managerAssessment: 4.3, finalScore: 4.3, lastAssessedAt: d('2026-02-20') },
    ],
  });

  console.log('  ✓ 4 skill categories + 6 assessments');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 14: Succession Plan
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 14: Succession Plan...');

  await prisma.successionPlan.create({
    data: {
      tenantId,
      positionId: preethi.id,
      positionTitle: 'Senior Engineering Manager',
      currentIncumbent: preethi.id,
      criticality: 'HIGH',
      vacancyImpact: 'CRITICAL',
      benchStrength: 2,
      reviewFrequency: 'QUARTERLY',
      status: 'ACTIVE',
      successors: [
        { userId: sanjay.id, readinessLevel: 'DEVELOPING', timeToReady: '18 months', notes: 'Strong technical foundation, needs leadership exposure and system design depth.' },
      ],
      notes: 'Preethi is a high-retention employee. Succession plan maintained as standard practice for all critical roles.',
      nextReviewDate: d('2026-04-01'),
    },
  });

  console.log('  ✓ 1 succession plan (Senior Engineering Manager)');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 15: Career Paths
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 15: Career Paths...');

  await prisma.careerPath.createMany({
    data: [
      {
        tenantId,
        pathName: 'Frontend to Full-Stack Engineer',
        pathDescription: 'A structured progression from L3 Frontend Engineer to L5+ Full-Stack Engineer via React mastery, Node.js backend development, and system design competencies. Typically takes 24-30 months.',
        startingRole: 'Frontend Engineer',
        department: 'Engineering',
        isActive: true,
        roles: ['Frontend Engineer L3', 'Frontend Engineer L4', 'Full-Stack Engineer L5', 'Senior Full-Stack Engineer L6'],
        levels: [3, 4, 5, 6],
        averageDuration: 28,
        successRate: 72.5,
      },
      {
        tenantId,
        pathName: 'Individual Contributor to Engineering Manager',
        pathDescription: 'Career transition from L6 Senior Engineer IC track to L8 Engineering Manager via team leadership, cross-functional project delivery, and people management development. Typically takes 18-24 months.',
        startingRole: 'Senior Engineer',
        department: 'Engineering',
        isActive: true,
        roles: ['Senior Engineer L6', 'Staff Engineer L7', 'Engineering Manager L8'],
        levels: [6, 7, 8],
        averageDuration: 22,
        successRate: 65.0,
      },
    ],
  });

  console.log('  ✓ 2 career paths');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 16: Pulse Survey Responses
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 16: Pulse Surveys...');

  // 7 weekdays: Feb 13 (Fri), Feb 16 (Mon), Feb 17 (Tue), Feb 18 (Wed), Feb 19 (Thu), Feb 20 (Fri), Feb 22 (Sun)
  const pulseDays = [
    { date: '2026-02-13', mood: 4, energy: 4, stress: 2 }, // Fri
    { date: '2026-02-16', mood: 3, energy: 3, stress: 3 }, // Mon
    { date: '2026-02-17', mood: 4, energy: 4, stress: 2 }, // Tue
    { date: '2026-02-18', mood: 4, energy: 3, stress: 3 }, // Wed
    { date: '2026-02-19', mood: 3, energy: 3, stress: 4 }, // Thu
    { date: '2026-02-20', mood: 5, energy: 4, stress: 2 }, // Fri
    { date: '2026-02-22', mood: 4, energy: 4, stress: 2 }, // Sun
  ];

  // Per-user variation offsets (mood, energy, stress)
  const pulseVariation: Record<string, [number, number, number]> = {
    [danish.id]: [1, 0, -1],
    [prasina.id]: [0, 1, 0],
    [preethi.id]: [1, 1, -1],
    [sanjay.id]: [-1, 0, 1],
  };

  const allUsers = [danish, prasina, preethi, sanjay];
  const pulseRecords: any[] = [];

  for (const day of pulseDays) {
    for (const user of allUsers) {
      const [dm, de, ds] = pulseVariation[user.id];
      pulseRecords.push({
        tenantId,
        userId: user.id,
        surveyDate: new Date(day.date),
        surveyType: 'DAILY',
        moodScore: Math.min(5, Math.max(1, day.mood + dm)),
        energyScore: Math.min(5, Math.max(1, day.energy + de)),
        stressScore: Math.min(5, Math.max(1, day.stress + ds)),
        isAnonymous: false,
      });
    }
  }

  await prisma.pulseSurveyResponse.createMany({ data: pulseRecords });
  console.log(`  ✓ ${pulseRecords.length} pulse survey responses (7 days × 4 users)`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 17: Engagement Scores + Events
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 17: Engagement Scores...');

  const engagementRows = [
    { user: danish, overall: 4.30, level: 'HIGH', part: 4.50, comm: 4.20, collab: 4.30, init: 4.40, resp: 4.10 },
    { user: prasina, overall: 4.10, level: 'HIGH', part: 4.30, comm: 4.00, collab: 4.00, init: 4.20, resp: 4.00 },
    { user: preethi, overall: 4.50, level: 'HIGH', part: 4.60, comm: 4.40, collab: 4.50, init: 4.60, resp: 4.40 },
    { user: sanjay, overall: 3.70, level: 'MEDIUM', part: 3.80, comm: 3.60, collab: 3.70, init: 3.80, resp: 3.60 },
  ];

  for (const row of engagementRows) {
    await prisma.engagementScore.create({
      data: {
        tenantId,
        userId: row.user.id,
        overallScore: row.overall,
        scoreLevel: row.level,
        participationScore: row.part,
        communicationScore: row.comm,
        collaborationScore: row.collab,
        initiativeScore: row.init,
        responsivenessScore: row.resp,
        activityMetrics: { goalsUpdated: 3, feedbackGiven: 2, reviewsInteracted: 1, meetingsAttended: 4 },
        engagementPatterns: { peakDays: ['Tuesday', 'Friday'], avgActiveHours: 7.5, consistencyScore: 0.82 },
        trendDirection: 'UP',
        changeFromPrevious: 0.2,
        weekOverWeekChange: 0.15,
        atRisk: false,
        scoreDate: TODAY,
        calculationPeriod: 'WEEKLY',
        calculatedAt: TODAY,
      },
    });
  }

  await prisma.engagementEvent.createMany({
    data: [
      { tenantId, userId: sanjay.id, eventType: 'goal_completed', eventCategory: 'PERFORMANCE', engagementImpact: 0.80, positiveIndicator: true, eventTimestamp: d('2026-02-15') },
      { tenantId, userId: preethi.id, eventType: 'review_submitted', eventCategory: 'REVIEW', engagementImpact: 0.60, positiveIndicator: true, eventTimestamp: d('2026-02-20') },
      { tenantId, userId: danish.id, eventType: 'feedback_given', eventCategory: 'FEEDBACK', engagementImpact: 0.40, positiveIndicator: true, eventTimestamp: d('2026-02-20') },
      { tenantId, userId: prasina.id, eventType: 'feedback_given', eventCategory: 'FEEDBACK', engagementImpact: 0.40, positiveIndicator: true, eventTimestamp: d('2026-02-12') },
    ],
  });

  console.log('  ✓ 4 engagement scores + 4 engagement events');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 18: Daily Performance Metrics
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 18: Daily Performance Metrics...');

  const perfDays = ['2026-02-13', '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-22'];

  // [tasks, goalUpdates, feedbackGiven, interactions] for each of 7 days
  const perfProfile: Record<string, number[][]> = {
    [danish.id]: [[4, 5, 5, 8], [3, 4, 4, 7], [5, 6, 6, 9], [4, 4, 5, 8], [3, 5, 4, 7], [5, 6, 6, 9], [4, 4, 5, 7]],
    [prasina.id]: [[3, 4, 4, 6], [2, 3, 3, 5], [4, 5, 5, 7], [3, 4, 4, 6], [2, 3, 3, 5], [4, 5, 5, 7], [3, 4, 4, 5]],
    [preethi.id]: [[6, 3, 7, 10], [4, 2, 5, 8], [7, 4, 8, 12], [5, 3, 6, 10], [6, 2, 7, 9], [7, 4, 8, 12], [5, 3, 6, 9]],
    [sanjay.id]: [[7, 2, 2, 4], [5, 1, 2, 3], [9, 2, 3, 5], [7, 2, 2, 4], [6, 1, 2, 3], [9, 2, 3, 5], [6, 2, 2, 4]],
  };

  const dailyMetrics: any[] = [];
  for (const user of allUsers) {
    const profile = perfProfile[user.id];
    for (let i = 0; i < perfDays.length; i++) {
      const [tasks, goalUpdates, feedbackGiven, interactions] = profile[i];
      dailyMetrics.push({
        tenantId,
        userId: user.id,
        metricDate: new Date(perfDays[i]),
        totalTasksCompleted: tasks,
        totalTasksCreated: tasks + 1,
        avgTaskCompletionRate: 82 + i * 2,
        totalActiveMinutes: 420 + i * 15,
        totalFocusMinutes: 240 + i * 8,
        totalMeetingMinutes: 60 + (i % 3) * 30,
        totalGoalUpdates: goalUpdates,
        totalGoalProgressDelta: goalUpdates * 3.5,
        goalsOnTrack: 3,
        goalsAtRisk: 0,
        goalsOffTrack: 0,
        totalInteractions: interactions,
        totalFeedbackGiven: feedbackGiven,
        totalFeedbackReceived: Math.floor(feedbackGiven / 2),
        totalMessagesSent: interactions * 2,
        avgCollaborationScore: 4.0 + i * 0.04,
        avgProductivityScore: 4.1 + i * 0.04,
        avgEngagementScore: 3.9 + i * 0.04,
        overallPerformanceScore: 4.0 + i * 0.04,
        hasAnomaly: false,
      });
    }
  }

  await prisma.dailyPerformanceMetric.createMany({ data: dailyMetrics });
  console.log(`  ✓ ${dailyMetrics.length} daily performance metrics (7 days × 4 users)`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 19: Leaderboard
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 19: Leaderboard...');

  const leaderboard = await prisma.leaderboard.create({
    data: {
      tenantId,
      name: 'Q1 2026 Performance Champions',
      leaderboardType: 'PERFORMANCE',
      scope: 'TENANT',
      metricName: 'overallPerformanceScore',
      metricCategory: 'PERFORMANCE',
      rankingPeriod: 'QUARTERLY',
      topN: 10,
      showRank: true,
      showScore: true,
      showTrend: true,
      isActive: true,
    },
  });

  const lbRankings = [
    { user: preethi, rank: 1, score: 92.5 },
    { user: danish, rank: 2, score: 88.3 },
    { user: prasina, rank: 3, score: 85.1 },
    { user: sanjay, rank: 4, score: 78.6 },
  ];

  await prisma.leaderboardEntry.createMany({
    data: lbRankings.map((e) => ({
      tenantId,
      leaderboardId: leaderboard.id,
      userId: e.user.id,
      rank: e.rank,
      previousRank: e.rank + 1,
      score: e.score,
      previousScore: e.score - 3.5,
      rankChange: 1,
      scoreChange: 3.5,
      trend: 'UP',
      periodStart: d('2026-01-01'),
      periodEnd: d('2026-03-31'),
      periodLabel: 'Q1 2026',
    })),
  });

  console.log('  ✓ 1 leaderboard + 4 ranked entries');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 20: Compliance Assessment
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 20: Compliance Assessment...');

  await prisma.complianceAssessment.create({
    data: {
      tenantId,
      assessmentType: 'PERFORMANCE_REVIEW_COMPLIANCE',
      assessmentScope: 'TENANT',
      complianceStatus: 'COMPLIANT',
      complianceScore: 98.5,
      violationCount: 0,
      criticalViolations: 0,
      minorViolations: 0,
      riskLevel: 'LOW',
      riskScore: 2.5,
      autoDetected: true,
      detectionConfidence: 0.95,
      remediationRequired: false,
      assessmentPeriodStart: d('2026-01-01'),
      assessmentPeriodEnd: d('2026-02-22'),
      assessedBy: prasina.id,
      assessedAt: TODAY,
    },
  });

  console.log('  ✓ 1 compliance assessment (COMPLIANT, 98.5%)');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 21: Organizational Health Metrics
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 21: Org Health Metrics...');

  await prisma.organizationalHealthMetrics.create({
    data: {
      tenantId,
      metricDate: TODAY,
      period: 'MONTHLY',
      periodStart: d('2026-02-01'),
      periodEnd: d('2026-02-28'),
      overallHealthScore: 78.5,
      healthLevel: 'GOOD',
      trendDirection: 'UP',
      engagementScore: 82.0,
      performanceScore: 76.5,
      cultureScore: 80.0,
      leadershipScore: 85.0,
      collaborationScore: 78.0,
      innovationScore: 72.0,
      wellbeingScore: 74.0,
      headcount: 4,
      activeEmployees: 4,
      newHires: 0,
      terminations: 0,
      turnoverRate: 0.0,
      retentionRate: 100.0,
      avgEngagementScore: 4.15,
      avgPerformanceRating: 4.10,
      highPerformers: 2,
      lowPerformers: 0,
      goalCompletionRate: 65.0,
      employeesInDevelopment: 1,
    },
  });

  console.log('  ✓ 1 org health snapshot (GOOD, 78.5%)');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 22: Notifications + Board Items
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 22: Notifications...');

  const notifRecords: any[] = [];
  for (const user of allUsers) {
    notifRecords.push(
      { tenantId, userId: user.id, type: 'REVIEW_CYCLE_STARTED', title: 'Q1 Performance Review Now Open', body: 'Q1 FY2026 Annual Review is officially open. Your self-assessment is due by Feb 28 — 6 days away.', status: 'SENT', sentAt: d('2026-02-10'), data: { cycleId: reviewCycle.id, deadline: '2026-02-28' } },
      { tenantId, userId: user.id, type: 'GOAL_DEADLINE_APPROACHING', title: 'Goal Deadline Approaching', body: 'One of your active goals has a deadline within the next 7 days. Update your progress to stay on track.', status: 'SENT', sentAt: d('2026-02-20'), data: {} },
      { tenantId, userId: user.id, type: 'FEEDBACK_RECEIVED', title: 'You Received New Feedback', body: 'A colleague has shared feedback with you. Log in to view what they said.', status: 'SENT', sentAt: d('2026-02-15'), data: {} },
    );
  }

  await prisma.notification.createMany({ data: notifRecords });

  await prisma.notificationBoardItem.createMany({
    data: [
      {
        tenantId,
        itemType: 'ANNOUNCEMENT',
        category: 'performance',
        priority: 'high',
        title: 'Q1 FY2026 Performance Review Season Now Open',
        message: 'Self-assessments are due by February 28. Log in and complete yours today to stay on track for the full review cycle.',
        affectedUserIds: allUsers.map((u) => u.id),
        sourceType: 'system',
        isDismissible: true,
        status: 'active',
      },
      {
        tenantId,
        itemType: 'MILESTONE',
        category: 'achievement',
        priority: 'normal',
        title: 'Sanjay delivered User Dashboard 7 days ahead of schedule! 🎯',
        message: 'Outstanding delivery on the User Dashboard feature — shipped ahead of schedule with zero critical bugs and a 40% load time improvement.',
        affectedUserIds: [sanjay.id, preethi.id, danish.id],
        sourceType: 'system',
        isDismissible: true,
        status: 'active',
      },
      {
        tenantId,
        itemType: 'DEADLINE',
        category: 'review',
        priority: 'high',
        title: 'Self-Assessment Deadline: 6 Days Remaining',
        message: 'February 28 is the last day to submit your self-assessment for the Q1 FY2026 performance review. 2 submissions still pending.',
        affectedUserIds: [sanjay.id, preethi.id],
        expiresAt: d('2026-02-28'),
        sourceType: 'system',
        isDismissible: false,
        status: 'active',
      },
    ],
  });

  console.log(`  ✓ ${notifRecords.length} notifications + 3 board items`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 23: Calendar Events
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 23: Calendar Events...');

  const calendarData: any[] = [];

  // Self-assessment deadline for all users
  for (const user of allUsers) {
    calendarData.push({
      tenantId, userId: user.id,
      title: 'Self-Assessment Due — Q1 FY2026 Review',
      type: 'REVIEW_RELATED',
      eventDate: d('2026-02-28'),
      allDay: true,
      reviewCycleId: reviewCycle.id,
      color: '#ef4444',
    });
  }

  calendarData.push(
    { tenantId, userId: preethi.id, title: 'Weekly Engineering Sync', type: 'MEETING', eventDate: d('2026-02-24'), startTime: d('2026-02-24T10:00:00.000Z'), endTime: d('2026-02-24T11:00:00.000Z'), color: '#3b82f6' },
    { tenantId, userId: preethi.id, title: '1-on-1: Preethi & Sanjay', type: 'MEETING', eventDate: d('2026-02-25'), startTime: d('2026-02-25T11:00:00.000Z'), endTime: d('2026-02-25T11:30:00.000Z'), color: '#8b5cf6' },
    { tenantId, userId: danish.id, title: 'All-Hands: Q1 Business Review', type: 'MEETING', eventDate: d('2026-02-27'), startTime: d('2026-02-27T09:00:00.000Z'), endTime: d('2026-02-27T10:30:00.000Z'), color: '#10b981' },
    { tenantId, userId: sanjay.id, title: 'React Advanced Cert Exam', type: 'GOAL_RELATED', eventDate: d('2026-03-15'), allDay: true, goalId: goals[8].id, color: '#f59e0b' },
    { tenantId, userId: prasina.id, title: 'Q1 Calibration Session', type: 'REVIEW_RELATED', eventDate: d('2026-03-22'), startTime: d('2026-03-22T09:00:00.000Z'), endTime: d('2026-03-22T12:00:00.000Z'), reviewCycleId: reviewCycle.id, color: '#ef4444' },
  );

  await prisma.calendarEvent.createMany({ data: calendarData });
  console.log(`  ✓ ${calendarData.length} calendar events`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 24: Chat
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 24: Chat...');

  const conversation = await prisma.conversation.create({
    data: {
      tenantId,
      type: 'GROUP',
      name: 'Product Engineering Team',
      createdById: danish.id,
    },
  });

  await prisma.conversationParticipant.createMany({
    data: allUsers.map((u) => ({
      conversationId: conversation.id,
      userId: u.id,
      role: u.id === danish.id ? 'ADMIN' : 'MEMBER',
    })),
  });

  const chatMsgs = [
    { senderId: danish.id, content: 'Q1 review season is officially open — please complete your self-assessments by February 28. Let me know if you need any support! 📋', createdAt: d('2026-02-20T09:15:00.000Z') },
    { senderId: preethi.id, content: "Sanjay's dashboard just shipped to production! Zero critical bugs, 40% faster load time. Outstanding work Sanjay 🚀", createdAt: d('2026-02-20T11:30:00.000Z') },
    { senderId: sanjay.id, content: "Thanks Preethi! 🙏 Already started Module 2 of the React cert — aiming to complete it by March 10 👍", createdAt: d('2026-02-20T13:45:00.000Z') },
    { senderId: prasina.id, content: 'Reminder: Q1 Calibration session is confirmed for March 22, 9am–12pm. Please mark your calendars. Agenda will be shared by March 15 📅', createdAt: d('2026-02-21T10:00:00.000Z') },
    { senderId: preethi.id, content: 'Weekly engineering sync is tomorrow at 10am. Agenda in the calendar: Sprint 8 planning + Q1 self-review prep 🗓️', createdAt: d('2026-02-22T09:00:00.000Z') },
    { senderId: danish.id, content: 'Strong Q1 so far — velocity up 32%, customer satisfaction trending at 68%, zero attrition. Let\'s keep this momentum going into March! 💪', createdAt: d('2026-02-22T10:00:00.000Z') },
  ];

  for (const msg of chatMsgs) {
    await prisma.chatMessage.create({
      data: { conversationId: conversation.id, senderId: msg.senderId, content: msg.content, type: 'TEXT', createdAt: msg.createdAt },
    });
  }

  await prisma.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: d('2026-02-22T10:00:00.000Z') } });

  console.log(`  ✓ 1 group conversation + ${chatMsgs.length} messages`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 25: AI Insight Cards
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 25: AI Insight Cards...');

  const insightCards = [
    {
      userId: danish.id,
      agentType: 'performance_agent',
      insightType: 'achievement',
      priority: 'high',
      title: 'Sanjay exceeded goal 7 days early — consider stretch targets',
      description: 'Sanjay delivered the User Dashboard goal 7 days ahead of schedule with zero critical defects and a 40% performance improvement bonus. Consider assigning stretch targets to maintain his growth momentum toward L4.',
      actionLabel: 'View Goal',
    },
    {
      userId: prasina.id,
      agentType: 'hr_agent',
      insightType: 'warning',
      priority: 'high',
      title: 'Q1 self-assessment deadline in 6 days — 2 submissions pending',
      description: 'Sanjay and 1 other team member have not yet submitted their Q1 self-assessments. The deadline is February 28. Consider sending a reminder to maintain the review cycle timeline.',
      actionLabel: 'Send Reminder',
    },
    {
      userId: preethi.id,
      agentType: 'engagement_agent',
      insightType: 'opportunity',
      priority: 'medium',
      title: "Sanjay's engagement score trending up +0.4 points this week",
      description: "Sanjay's engagement score improved from 3.3 to 3.7 this week, driven by goal completion, positive feedback received, and active participation in sprint ceremonies. Good momentum to sustain.",
      actionLabel: 'View Engagement',
    },
    {
      userId: danish.id,
      agentType: 'career_agent',
      insightType: 'recommendation',
      priority: 'medium',
      title: 'Sanjay is on track for L4 promotion by Q2 2026',
      description: 'Based on current performance trajectory, React certification progress, and delivery quality, Sanjay meets 82% of L4 promotion criteria. Promotion is recommended for formal review in the Q1 calibration session.',
      actionLabel: 'View Promotion Case',
    },
    {
      userId: preethi.id,
      agentType: 'performance_agent',
      insightType: 'alert',
      priority: 'low',
      title: 'Bug reduction goal at 72% — on track to exceed target by Feb 28',
      description: 'The "Reduce Bug Count by 50%" goal is currently at 72%, significantly ahead of target. At the current velocity, the team will exceed the 50% target before the February 28 deadline.',
      actionLabel: 'View Goal',
    },
    {
      userId: danish.id,
      agentType: 'hr_agent',
      insightType: 'achievement',
      priority: 'medium',
      title: '100% team retention for 3 consecutive quarters',
      description: 'The team has maintained 100% retention across Q2, Q3, and Q4 FY2025 and into Q1 FY2026. Engagement scores remain consistently above 4.0 for all senior contributors.',
      actionLabel: 'View Retention Report',
    },
  ];

  await prisma.aIInsightCard.createMany({
    data: insightCards.map((ins) => ({
      tenantId,
      userId: ins.userId,
      agentType: ins.agentType,
      insightType: ins.insightType,
      priority: ins.priority,
      title: ins.title,
      description: ins.description,
      actionLabel: ins.actionLabel,
      isRead: false,
      isDismissed: false,
      expiresAt: new Date(TODAY.getTime() + 30 * 24 * 60 * 60 * 1000),
    })),
  });

  console.log(`  ✓ ${insightCards.length} AI insight cards`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 26: Summary
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('✅  DEMO DATA SEEDING COMPLETE');
  console.log('══════════════════════════════════════════════════');
  console.log(`Tenant  : ${tenant.name}`);
  console.log(`Date    : 2026-02-22 (demo tomorrow Feb 23)`);
  console.log('');
  console.log('Data created:');
  console.log(`  🏢  Org         : 1 business unit, 2 departments, 3 reporting lines`);
  console.log(`  👥  Team        : Product Engineering Squad (2 members)`);
  console.log(`  🎯  Goals       : ${goals.length} (1 completed, 9 active) + alignments + milestones`);
  console.log(`  📝  Reviews     : Q1 cycle (SELF_ASSESSMENT, deadline Feb 28) + 4 review records`);
  console.log(`  💬  Feedback    : 6 records (Feb 8–20)`);
  console.log(`  🎛️   Calibration : 1 session scheduled Mar 22 + 3 participants`);
  console.log(`  💰  Comp/Promo  : 1 approved merit increase + 1 promotion under review`);
  console.log(`  🔧  PIP         : 1 coaching plan + 2 check-ins + 2 milestones`);
  console.log(`  🤝  1-on-1s     : 4 meetings (2 completed, 2 scheduled)`);
  console.log(`  📈  Dev Plan    : 1 career growth plan (35% complete)`);
  console.log(`  📎  Evidence    : 3 verified records`);
  console.log(`  🧠  Skills      : 4 categories + 6 assessments`);
  console.log(`  🏆  Succession  : 1 plan (Senior Engineering Manager)`);
  console.log(`  🛤️   Career      : 2 career paths`);
  console.log(`  💓  Pulse       : ${pulseRecords.length} daily survey responses`);
  console.log(`  ⚡  Engagement  : 4 scores + 4 events`);
  console.log(`  📊  Perf Metrics: ${dailyMetrics.length} daily records`);
  console.log(`  🥇  Leaderboard : 4 ranked entries (Q1 2026)`);
  console.log(`  ✅  Compliance  : COMPLIANT (98.5%)`);
  console.log(`  🏥  Org Health  : 1 monthly snapshot (GOOD, 78.5%)`);
  console.log(`  🔔  Notifications: ${notifRecords.length} + 3 board items`);
  console.log(`  📅  Calendar    : ${calendarData.length} events`);
  console.log(`  💬  Chat        : 1 group conversation + 6 messages`);
  console.log(`  🤖  AI Insights : 6 cards`);
  console.log('');
  console.log('🚀  Ready for demo!');
  console.log('');
  console.log('Credentials:');
  console.log('  agdanishr@gmail.com          → Demo@123  (CTO / TENANT_ADMIN)');
  console.log('  danish@xzashr.com            → Demo@123  (Head of HR / HR_ADMIN)');
  console.log('  preethisivachandran0@gmail.com → Demo@123  (Eng Manager / MANAGER)');
  console.log('  sanjayn0369@gmail.com         → Demo@123  (Frontend Engineer / EMPLOYEE)');
}

main()
  .catch((e) => {
    console.error('\n❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
