/**
 * Reports Seed Script — Populates Reports page with sample data
 * Target tenant: demo-company
 *
 * Run: pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/seed-reports.ts
 *
 * Idempotent: deletes existing report data for the tenant, then inserts fresh data.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_SLUG = 'demo-company';

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

  if (!danish) throw new Error('agdanishr@gmail.com not found');
  if (!prasina) throw new Error('danish@xzashr.com not found');
  if (!preethi) throw new Error('preethisivachandran0@gmail.com not found');
  if (!sanjay) throw new Error('sanjayn0369@gmail.com not found');

  console.log(`  ✓ Users: ${danish.firstName}, ${prasina.firstName}, ${preethi.firstName}, ${sanjay.firstName}`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 1: Cleanup existing report data
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 1: Cleanup...');

  await prisma.reportSchedule.deleteMany({ where: { tenantId } });
  await prisma.generatedReport.deleteMany({ where: { tenantId } });
  await prisma.reportDefinition.deleteMany({ where: { tenantId } });

  console.log('  ✓ Deleted existing report definitions, generated reports, and schedules');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: Fix User.managerId for team analytics
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 2: Setting User.managerId...');

  // Danish (CTO) — no manager
  // Prasina (Head of HR) → reports to Danish
  // Preethi (Eng Manager) → reports to Danish
  // Sanjay (Frontend Engineer) → reports to Preethi
  await prisma.user.update({ where: { id: prasina.id }, data: { managerId: danish.id } });
  await prisma.user.update({ where: { id: preethi.id }, data: { managerId: danish.id } });
  await prisma.user.update({ where: { id: sanjay.id }, data: { managerId: preethi.id } });

  console.log('  ✓ Sanjay→Preethi, Preethi→Danish, Prasina→Danish');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 3: Report Definitions
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 3: Report Definitions...');

  const defPerf = await prisma.reportDefinition.create({
    data: {
      tenantId,
      name: 'Weekly Performance Summary',
      description: 'Weekly snapshot of team performance metrics, goal progress, and key highlights.',
      reportType: 'WEEKLY_SUMMARY',
      templateConfig: { layout: 'standard', theme: 'professional' },
      sections: ['overview', 'goals', 'reviews', 'feedback', 'highlights'],
      metrics: ['goalCompletionRate', 'avgReviewRating', 'feedbackCount', 'activeGoals'],
      isScheduled: true,
      scheduleExpression: '0 9 * * 1',
      exportFormats: ['pdf', 'excel'],
      isActive: true,
      createdById: danish.id,
    },
  });

  const defTeam = await prisma.reportDefinition.create({
    data: {
      tenantId,
      name: 'Team Analytics Report',
      description: 'Comparative analysis of team performance across departments.',
      reportType: 'COMPARATIVE_ANALYSIS',
      templateConfig: { layout: 'dashboard', theme: 'executive' },
      sections: ['teamOverview', 'memberScores', 'trends', 'recommendations'],
      metrics: ['teamScore', 'memberZScores', 'goalVelocity', 'reviewDistribution'],
      isScheduled: false,
      exportFormats: ['pdf', 'csv'],
      isActive: true,
      createdById: danish.id,
    },
  });

  const defGoal = await prisma.reportDefinition.create({
    data: {
      tenantId,
      name: 'Monthly Goal Achievement',
      description: 'Monthly report on goal attainment rates, velocity, and risk analysis.',
      reportType: 'MONTHLY_CARD',
      templateConfig: { layout: 'card', theme: 'professional' },
      sections: ['goalSummary', 'riskAnalysis', 'velocity', 'completionTrend'],
      metrics: ['goalCompletionRate', 'onTrackGoals', 'atRiskGoals', 'avgProgress'],
      isScheduled: true,
      scheduleExpression: '0 9 1 * *',
      exportFormats: ['pdf', 'excel', 'csv'],
      isActive: true,
      createdById: prasina.id,
    },
  });

  console.log(`  ✓ 3 report definitions created`);

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 4: Generated Reports (5 records)
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 4: Generated Reports...');

  // Report 1: Weekly Summary — Feb 16-22
  await prisma.generatedReport.create({
    data: {
      tenantId,
      reportDefinitionId: defPerf.id,
      reportType: 'WEEKLY_SUMMARY',
      periodType: 'weekly',
      periodStart: d('2026-02-16T00:00:00Z'),
      periodEnd: d('2026-02-22T23:59:59Z'),
      periodLabel: 'Feb 16–22, 2026',
      title: 'Weekly Performance Summary — Feb 16–22',
      summary: 'Strong week with 3 goals completed and 87% on-track rate. Feedback volume increased 40% from last week. One at-risk goal flagged for immediate attention.',
      data: {
        totalGoals: 12, completedGoals: 3, inProgressGoals: 8, atRiskGoals: 1,
        avgGoalProgress: 68, goalCompletionRate: 25,
        totalReviews: 4, completedReviews: 2, avgReviewRating: 3.8,
        totalFeedback: 14, positiveFeedback: 10, constructiveFeedback: 4,
        activeUsers: 4, performanceScore: 74,
      },
      trends: {
        goalProgress: [52, 55, 60, 63, 68],
        weeklyLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        feedbackTrend: [8, 10, 12, 14],
        reviewCompletion: [25, 35, 50, 50],
      },
      comparisons: {
        prevWeekGoalCompletion: 18, currentGoalCompletion: 25, change: 38.9,
        prevWeekFeedback: 10, currentFeedback: 14, feedbackChange: 40,
      },
      insights: [
        'Goal completion rate improved 39% week-over-week, driven by Sprint 7 deliverables.',
        'Feedback volume up 40% — peer recognition culture strengthening.',
        'One critical goal (React Certification) at risk due to scope expansion.',
      ],
      recommendations: [
        'Schedule a check-in with Sanjay regarding the at-risk React Certification goal.',
        'Continue encouraging peer feedback — positive trend supports engagement.',
        'Consider breaking the quarterly review goal into smaller weekly milestones.',
      ],
      generationType: 'scheduled',
      generatedById: danish.id,
      generationStatus: 'completed',
      generationStartedAt: d('2026-02-24T09:00:00Z'),
      generationCompletedAt: d('2026-02-24T09:00:12Z'),
      accessCount: 5,
      lastAccessedAt: d('2026-02-28T14:30:00Z'),
    },
  });

  // Report 2: Monthly Card — February 2026
  await prisma.generatedReport.create({
    data: {
      tenantId,
      reportDefinitionId: defGoal.id,
      reportType: 'MONTHLY_CARD',
      periodType: 'monthly',
      periodStart: d('2026-02-01T00:00:00Z'),
      periodEnd: d('2026-02-28T23:59:59Z'),
      periodLabel: 'February 2026',
      title: 'Monthly Performance Card — February 2026',
      summary: 'February showed steady growth across all dimensions. Goal attainment reached 72%, review completion at 85%, and team engagement metrics improved significantly.',
      data: {
        totalGoals: 16, completedGoals: 7, inProgressGoals: 7, atRiskGoals: 2,
        avgGoalProgress: 72, goalCompletionRate: 43.75,
        totalReviews: 8, completedReviews: 7, pendingReviews: 1, avgReviewRating: 3.9,
        totalFeedback: 42, positiveFeedback: 31, constructiveFeedback: 11, avgSentimentScore: 78,
        activeUsers: 4, performanceScore: 76,
        avgProductivity: 82, avgQuality: 79, avgCollaboration: 85,
      },
      trends: {
        weeklyProgress: [58, 63, 68, 72],
        weekLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        ratingDistribution: { '5': 2, '4': 3, '3': 2, '2': 1 },
        feedbackByWeek: [8, 10, 12, 12],
      },
      comparisons: {
        prevMonthScore: 71, currentScore: 76, scoreChange: 7.0,
        prevMonthGoalRate: 37, currentGoalRate: 43.75, goalRateChange: 18.2,
      },
      insights: [
        'Performance score increased from 71 to 76 (+7%) compared to January.',
        'Collaboration score (85) is the highest dimension, reflecting strong team dynamics.',
        'Two at-risk goals identified — both tied to external dependency blockers.',
        'Review completion rate at 85% exceeds the organization benchmark of 80%.',
      ],
      recommendations: [
        'Address the two at-risk goals by scheduling dependency resolution meetings.',
        'Leverage the strong collaboration scores for cross-functional project assignments.',
        'Consider recognizing top performers formally — 2 team members scored above 4.0.',
      ],
      generationType: 'scheduled',
      generatedById: prasina.id,
      generationStatus: 'completed',
      generationStartedAt: d('2026-03-01T09:00:00Z'),
      generationCompletedAt: d('2026-03-01T09:00:18Z'),
      accessCount: 8,
      lastAccessedAt: d('2026-03-02T10:15:00Z'),
    },
  });

  // Report 3: Quarterly Review — Q1 2026
  await prisma.generatedReport.create({
    data: {
      tenantId,
      reportDefinitionId: defPerf.id,
      reportType: 'QUARTERLY_REVIEW',
      periodType: 'quarterly',
      periodStart: d('2026-01-01T00:00:00Z'),
      periodEnd: d('2026-03-31T23:59:59Z'),
      periodLabel: 'Q1 2026',
      title: 'Q1 2026 Quarterly Performance Review',
      summary: 'Q1 on track for strong finish. Goal attainment trending upward from 58% in Jan to 72% in Feb. Team velocity improved 32%. Calibration session scheduled for March 15.',
      data: {
        totalGoals: 20, completedGoals: 9, inProgressGoals: 9, atRiskGoals: 2,
        avgGoalProgress: 65, goalCompletionRate: 45,
        totalReviews: 12, completedReviews: 10, avgReviewRating: 3.85,
        totalFeedback: 78, positiveFeedback: 58, constructiveFeedback: 20, avgSentimentScore: 76,
        activeUsers: 4, performanceScore: 74,
        teamVelocityImprovement: 32,
      },
      trends: {
        monthlyProgress: [58, 65, 72],
        monthLabels: ['January', 'February', 'March (proj.)'],
        monthlyFeedback: [22, 28, 28],
        monthlyReviewCompletion: [70, 85, 90],
      },
      comparisons: {
        prevQuarterScore: 68, currentScore: 74, change: 8.8,
        prevQuarterGoalRate: 38, currentGoalRate: 45, goalChange: 18.4,
        industryBenchmark: 72, vsIndustry: 2.8,
      },
      insights: [
        'Quarter-over-quarter performance improved 8.8%, exceeding the 5% target.',
        'Team velocity improvement of 32% driven by Sprint 7 delivery optimizations.',
        'Goal attainment shows consistent upward trend: 58% → 65% → 72% across months.',
        'Feedback culture maturing — 78 feedback items is 2.4x Q4 2025 volume.',
      ],
      recommendations: [
        'Complete Q1 calibration by March 15 to finalize ratings before Q2 planning.',
        'Address the 2 at-risk goals — both are stretch goals that may need scope adjustment.',
        'Formalize the velocity improvement practices as team standards.',
        'Plan Q2 goals with 10-15% stretch over Q1 achievement levels.',
      ],
      generationType: 'on_demand',
      generatedById: danish.id,
      generationStatus: 'completed',
      generationStartedAt: d('2026-02-28T16:00:00Z'),
      generationCompletedAt: d('2026-02-28T16:00:25Z'),
      accessCount: 12,
      lastAccessedAt: d('2026-03-03T09:00:00Z'),
    },
  });

  // Report 4: Team Analytics — February 2026
  await prisma.generatedReport.create({
    data: {
      tenantId,
      reportDefinitionId: defTeam.id,
      reportType: 'COMPARATIVE_ANALYSIS',
      periodType: 'monthly',
      periodStart: d('2026-02-01T00:00:00Z'),
      periodEnd: d('2026-02-28T23:59:59Z'),
      periodLabel: 'February 2026',
      title: 'Team Analytics — February 2026',
      summary: 'Cross-team analysis reveals Product Engineering outperforming on velocity metrics, while People & HR leads on collaboration and feedback scores.',
      data: {
        teams: [
          { name: 'Product Engineering', score: 78, members: 3, avgProgress: 75, topPerformer: 'Sanjay' },
          { name: 'People & HR', score: 74, members: 1, avgProgress: 70, topPerformer: 'Prasina' },
        ],
        overallTeamScore: 76,
        memberScores: [
          { name: 'Danish', score: 82, goals: 4, reviewRating: 4.2 },
          { name: 'Prasina', score: 74, goals: 3, reviewRating: 3.8 },
          { name: 'Preethi', score: 79, goals: 5, reviewRating: 4.0 },
          { name: 'Sanjay', score: 77, goals: 4, reviewRating: 3.9 },
        ],
      },
      trends: {
        teamScoreTrend: [70, 73, 76],
        labels: ['December', 'January', 'February'],
      },
      comparisons: {
        engVsHR: { engineering: 78, hr: 74, diff: 4 },
        prevMonth: { engineering: 74, hr: 71 },
      },
      insights: [
        'Product Engineering team score improved 5.4% to 78, driven by Sprint 7 delivery.',
        'Sanjay emerged as top performer in the engineering team with consistently high goal velocity.',
        'Cross-team collaboration score at 85 — highest across all measured dimensions.',
      ],
      recommendations: [
        'Consider Sanjay for expanded ownership — performance trajectory supports growth.',
        'Bridge the 4-point gap between engineering and HR by sharing best practices.',
        'Schedule cross-functional retrospective to capitalize on collaboration strengths.',
      ],
      generationType: 'on_demand',
      generatedById: prasina.id,
      generationStatus: 'completed',
      generationStartedAt: d('2026-03-01T11:00:00Z'),
      generationCompletedAt: d('2026-03-01T11:00:15Z'),
      accessCount: 3,
      lastAccessedAt: d('2026-03-02T15:00:00Z'),
    },
  });

  // Report 5: Monthly Card — March 2026 (in progress)
  await prisma.generatedReport.create({
    data: {
      tenantId,
      reportDefinitionId: defGoal.id,
      reportType: 'MONTHLY_CARD',
      periodType: 'monthly',
      periodStart: d('2026-03-01T00:00:00Z'),
      periodEnd: d('2026-03-31T23:59:59Z'),
      periodLabel: 'March 2026',
      title: 'Monthly Performance Card — March 2026',
      summary: null,
      data: {},
      trends: {},
      comparisons: {},
      insights: [],
      recommendations: [],
      generationType: 'scheduled',
      generatedById: null,
      generationStatus: 'processing',
      generationStartedAt: d('2026-03-03T09:00:00Z'),
      generationCompletedAt: null,
      accessCount: 0,
    },
  });

  console.log('  ✓ 5 generated reports created (4 completed, 1 processing)');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 5: Report Schedules
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 5: Report Schedules...');

  await prisma.reportSchedule.create({
    data: {
      tenantId,
      reportDefinitionId: defPerf.id,
      scheduleType: 'weekly',
      cronExpression: '0 9 * * 1',
      timezone: 'Asia/Kolkata',
      isActive: true,
      startDate: d('2026-01-06T00:00:00Z'),
      lastRunAt: d('2026-02-24T09:00:12Z'),
      lastRunStatus: 'success',
      lastRunDuration: 12000,
      nextRunAt: d('2026-03-03T09:00:00Z'),
      totalRuns: 7,
      successfulRuns: 7,
      failedRuns: 0,
      avgExecutionTime: 11500,
    },
  });

  await prisma.reportSchedule.create({
    data: {
      tenantId,
      reportDefinitionId: defGoal.id,
      scheduleType: 'monthly',
      cronExpression: '0 9 1 * *',
      timezone: 'Asia/Kolkata',
      isActive: true,
      startDate: d('2026-01-01T00:00:00Z'),
      lastRunAt: d('2026-03-01T09:00:18Z'),
      lastRunStatus: 'success',
      lastRunDuration: 18000,
      nextRunAt: d('2026-04-01T09:00:00Z'),
      totalRuns: 3,
      successfulRuns: 3,
      failedRuns: 0,
      avgExecutionTime: 17000,
    },
  });

  console.log('  ✓ 2 report schedules created (weekly + monthly)');

  // ─────────────────────────────────────────────────────────────────────────
  // Done
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n✅ Reports seed complete!');
  console.log('   - 3 report definitions');
  console.log('   - 5 generated reports (4 completed, 1 processing)');
  console.log('   - 2 report schedules (weekly + monthly)');
  console.log('   - User.managerId set for team analytics');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
