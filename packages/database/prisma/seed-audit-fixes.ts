/**
 * Seed script for remaining Visual QA Audit issues.
 *
 * Fixes:
 * - M12: Seed review templates with rating scale sections (admin/config)
 * - M10: Seed PerformanceBenchmark + PerformanceComparison data (benchmarks page)
 * - M7:  Seed SentimentAnalysis records (ai-insights sentiment trend)
 *
 * Run: pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/seed-audit-fixes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'cbd87cec-52e8-406d-9fae-5a43a6449c73';

async function main() {
  console.log('=== Audit Fixes Seed Script ===\n');

  // ── Phase 0: Fetch demo users ──
  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true, firstName: true, lastName: true, email: true },
  });

  const danish = users.find(u => u.firstName === 'Danish');
  const preethi = users.find(u => u.firstName === 'Preethi');
  const sanjay = users.find(u => u.firstName === 'Sanjay');
  const prasina = users.find(u => u.firstName === 'Prasina');

  if (!danish || !preethi || !sanjay || !prasina) {
    console.error('Missing demo users:', { danish: !!danish, preethi: !!preethi, sanjay: !!sanjay, prasina: !!prasina });
    return;
  }

  const allUsers = [danish, preethi, sanjay, prasina];
  console.log('Found users:', allUsers.map(u => `${u.firstName} ${u.lastName}`).join(', '));

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 1: Review Templates with Rating Scales (fixes M12 — /admin/config)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Phase 1: Review Templates with Rating Scales ---');

  // Delete existing templates for clean seed
  await prisma.reviewTemplate.deleteMany({ where: { tenantId: TENANT_ID } });

  const templates = [
    {
      name: 'Standard Performance Review',
      description: 'Comprehensive annual performance evaluation covering key competencies and goals',
      isDefault: true,
      sections: [
        {
          name: 'Job Performance',
          weight: 35,
          ratingScale: {
            name: 'Performance 5-Point',
            minValue: 1,
            maxValue: 5,
            levels: [
              { value: 1, label: 'Needs Improvement', description: 'Performance consistently falls below expectations', color: '#ef4444' },
              { value: 2, label: 'Below Expectations', description: 'Performance sometimes falls below expectations', color: '#f97316' },
              { value: 3, label: 'Meets Expectations', description: 'Performance consistently meets expectations', color: '#eab308' },
              { value: 4, label: 'Exceeds Expectations', description: 'Performance frequently exceeds expectations', color: '#22c55e' },
              { value: 5, label: 'Outstanding', description: 'Performance consistently and significantly exceeds expectations', color: '#10b981' },
            ],
          },
        },
        {
          name: 'Core Competencies',
          weight: 30,
          ratingScale: {
            name: 'Competency 5-Point',
            minValue: 1,
            maxValue: 5,
            levels: [
              { value: 1, label: 'Foundational', description: 'Basic understanding; requires guidance', color: '#ef4444' },
              { value: 2, label: 'Developing', description: 'Growing capability; needs occasional support', color: '#f97316' },
              { value: 3, label: 'Proficient', description: 'Competent and independent', color: '#eab308' },
              { value: 4, label: 'Advanced', description: 'Strong capability; mentors others', color: '#22c55e' },
              { value: 5, label: 'Expert', description: 'Recognized expert; drives innovation', color: '#10b981' },
            ],
          },
        },
        {
          name: 'Goals Achievement',
          weight: 35,
          ratingScale: {
            name: 'Goal Achievement',
            minValue: 1,
            maxValue: 5,
            levels: [
              { value: 1, label: 'Not Achieved', description: 'Less than 50% of goals met', color: '#ef4444' },
              { value: 2, label: 'Partially Achieved', description: '50-74% of goals met', color: '#f97316' },
              { value: 3, label: 'Achieved', description: '75-99% of goals met', color: '#eab308' },
              { value: 4, label: 'Exceeded', description: '100-120% of goals met', color: '#22c55e' },
              { value: 5, label: 'Significantly Exceeded', description: 'Over 120% of goals met', color: '#10b981' },
            ],
          },
        },
      ],
    },
    {
      name: 'Leadership Assessment',
      description: 'Evaluation template focused on leadership and management capabilities',
      isDefault: false,
      sections: [
        {
          name: 'Strategic Thinking',
          weight: 25,
          ratingScale: {
            name: 'Leadership 4-Point',
            minValue: 1,
            maxValue: 4,
            levels: [
              { value: 1, label: 'Emerging', description: 'Developing strategic mindset', color: '#f97316' },
              { value: 2, label: 'Capable', description: 'Applies strategy at team level', color: '#eab308' },
              { value: 3, label: 'Strong', description: 'Drives strategy across teams', color: '#22c55e' },
              { value: 4, label: 'Visionary', description: 'Shapes organizational strategy', color: '#10b981' },
            ],
          },
        },
        {
          name: 'People Management',
          weight: 30,
          ratingScale: {
            name: 'Leadership 4-Point',
            minValue: 1,
            maxValue: 4,
            levels: [
              { value: 1, label: 'Emerging', color: '#f97316' },
              { value: 2, label: 'Capable', color: '#eab308' },
              { value: 3, label: 'Strong', color: '#22c55e' },
              { value: 4, label: 'Visionary', color: '#10b981' },
            ],
          },
        },
        {
          name: 'Communication & Influence',
          weight: 20,
          ratingScale: {
            name: 'Leadership 4-Point',
            minValue: 1,
            maxValue: 4,
            levels: [
              { value: 1, label: 'Emerging', color: '#f97316' },
              { value: 2, label: 'Capable', color: '#eab308' },
              { value: 3, label: 'Strong', color: '#22c55e' },
              { value: 4, label: 'Visionary', color: '#10b981' },
            ],
          },
        },
        {
          name: 'Results Delivery',
          weight: 25,
          ratingScale: {
            name: 'Leadership 4-Point',
            minValue: 1,
            maxValue: 4,
            levels: [
              { value: 1, label: 'Emerging', color: '#f97316' },
              { value: 2, label: 'Capable', color: '#eab308' },
              { value: 3, label: 'Strong', color: '#22c55e' },
              { value: 4, label: 'Visionary', color: '#10b981' },
            ],
          },
        },
      ],
    },
    {
      name: 'Probation Review',
      description: 'Simplified evaluation for employees on probation period',
      isDefault: false,
      sections: [
        {
          name: 'Role Fit',
          weight: 40,
          ratingScale: {
            name: 'Probation 3-Point',
            minValue: 1,
            maxValue: 3,
            levels: [
              { value: 1, label: 'Below Standard', description: 'Does not meet role requirements', color: '#ef4444' },
              { value: 2, label: 'On Track', description: 'Meeting role expectations for probation stage', color: '#eab308' },
              { value: 3, label: 'Exceeding', description: 'Ahead of expectations for this stage', color: '#22c55e' },
            ],
          },
        },
        {
          name: 'Learning & Adaptation',
          weight: 30,
          ratingScale: {
            name: 'Probation 3-Point',
            minValue: 1,
            maxValue: 3,
            levels: [
              { value: 1, label: 'Below Standard', color: '#ef4444' },
              { value: 2, label: 'On Track', color: '#eab308' },
              { value: 3, label: 'Exceeding', color: '#22c55e' },
            ],
          },
        },
        {
          name: 'Culture Fit',
          weight: 30,
          ratingScale: {
            name: 'Probation 3-Point',
            minValue: 1,
            maxValue: 3,
            levels: [
              { value: 1, label: 'Below Standard', color: '#ef4444' },
              { value: 2, label: 'On Track', color: '#eab308' },
              { value: 3, label: 'Exceeding', color: '#22c55e' },
            ],
          },
        },
      ],
    },
  ];

  for (const t of templates) {
    await prisma.reviewTemplate.create({
      data: {
        tenantId: TENANT_ID,
        name: t.name,
        description: t.description,
        isDefault: t.isDefault,
        sections: t.sections,
      },
    });
    console.log(`  Created template: ${t.name} (${t.sections.length} sections with rating scales)`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 2: Performance Benchmarks (fixes M10 — /benchmarks)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Phase 2: Performance Benchmarks ---');

  // Clean existing
  await prisma.performanceComparison.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.performanceBenchmark.deleteMany({ where: { tenantId: TENANT_ID } });

  const now = new Date();
  const benchmarks = [
    {
      benchmarkName: 'Engineering Goal Completion',
      benchmarkType: 'DEPARTMENT',
      targetRole: 'Engineer',
      targetDepartment: null,
      targetLevel: null,
      metricName: 'goal_completion_rate',
      metricCategory: 'PERFORMANCE',
      percentile25: 62, percentile50: 74, percentile75: 85, percentile90: 93,
      mean: 75, standardDeviation: 12,
    },
    {
      benchmarkName: 'Engineering Code Quality',
      benchmarkType: 'DEPARTMENT',
      targetRole: 'Engineer',
      targetDepartment: null,
      targetLevel: null,
      metricName: 'code_quality_score',
      metricCategory: 'QUALITY',
      percentile25: 68, percentile50: 78, percentile75: 87, percentile90: 95,
      mean: 79, standardDeviation: 10,
    },
    {
      benchmarkName: 'HR Process Efficiency',
      benchmarkType: 'DEPARTMENT',
      targetRole: 'HR Manager',
      targetDepartment: null,
      targetLevel: null,
      metricName: 'process_efficiency',
      metricCategory: 'PERFORMANCE',
      percentile25: 70, percentile50: 80, percentile75: 88, percentile90: 94,
      mean: 80, standardDeviation: 9,
    },
    {
      benchmarkName: 'Overall Performance Rating',
      benchmarkType: 'ROLE',
      targetRole: null,
      targetDepartment: null,
      targetLevel: null,
      metricName: 'overall_rating',
      metricCategory: 'PERFORMANCE',
      percentile25: 3.0, percentile50: 3.5, percentile75: 4.2, percentile90: 4.7,
      mean: 3.6, standardDeviation: 0.7,
    },
    {
      benchmarkName: 'Feedback Frequency',
      benchmarkType: 'ROLE',
      targetRole: null,
      targetDepartment: null,
      targetLevel: null,
      metricName: 'feedback_frequency',
      metricCategory: 'ENGAGEMENT',
      percentile25: 2, percentile50: 4, percentile75: 7, percentile90: 10,
      mean: 5, standardDeviation: 3,
    },
  ];

  const createdBenchmarks = [];
  for (const b of benchmarks) {
    const sampleSize = 50 + Math.floor(Math.random() * 200);
    const created = await prisma.performanceBenchmark.create({
      data: {
        tenantId: TENANT_ID,
        benchmarkName: b.benchmarkName,
        benchmarkType: b.benchmarkType,
        targetRole: b.targetRole,
        targetDepartment: b.targetDepartment,
        targetLevel: b.targetLevel,
        metricName: b.metricName,
        metricCategory: b.metricCategory,
        percentile25: b.percentile25,
        percentile50: b.percentile50,
        percentile75: b.percentile75,
        percentile90: b.percentile90,
        mean: b.mean,
        standardDeviation: b.standardDeviation,
        minValue: Math.max(0, b.mean - b.standardDeviation * 3),
        maxValue: b.mean + b.standardDeviation * 2,
        sampleSize,
        dataPoints: sampleSize * 3,
        modelVersion: 'v1.0',
        computationMethod: 'PERCENTILE_RANK',
        validFrom: new Date(now.getFullYear(), 0, 1),
        validUntil: new Date(now.getFullYear(), 11, 31),
        isActive: true,
        computedAt: now,
      },
    });
    createdBenchmarks.push(created);
    console.log(`  Created benchmark: ${b.benchmarkName} (${b.metricName})`);
  }

  // Create comparisons for each user against relevant benchmarks
  const performanceLevels = ['ABOVE', 'AT', 'ABOVE', 'EXCEPTIONAL'];
  const relativePositions = ['TOP_25', 'MIDDLE_50', 'TOP_25', 'TOP_10'];

  for (let i = 0; i < allUsers.length; i++) {
    const user = allUsers[i];
    for (const benchmark of createdBenchmarks) {
      const mean = Number(benchmark.mean);
      const sd = Number(benchmark.standardDeviation);
      const userValue = mean + (Math.random() - 0.3) * sd * 2;
      const zScore = (userValue - mean) / sd;
      const percentileRank = Math.min(99, Math.max(1, 50 + zScore * 20));

      await prisma.performanceComparison.create({
        data: {
          tenantId: TENANT_ID,
          userId: user.id,
          benchmarkId: benchmark.id,
          userValue: Math.round(userValue * 100) / 100,
          benchmarkValue: mean,
          percentileRank: Math.round(percentileRank * 100) / 100,
          deviationFromMean: Math.round((userValue - mean) * 100) / 100,
          zScore: Math.round(zScore * 100) / 100,
          performanceLevel: performanceLevels[i],
          relativePosition: relativePositions[i],
          strengths: ['Goal Setting', 'Collaboration', 'Technical Skill'].slice(0, 2 + Math.floor(Math.random() * 2)),
          improvementAreas: ['Time Management', 'Documentation'].slice(0, 1 + Math.floor(Math.random() * 2)),
          recommendations: ['Focus on cross-functional projects', 'Increase documentation frequency'],
          comparisonDate: now,
        },
      });
    }
    console.log(`  Created ${createdBenchmarks.length} comparisons for ${user.firstName}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Phase 3: Sentiment Analysis records (fixes M7 — /ai-insights trend)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n--- Phase 3: Sentiment Analysis ---');

  // Clean existing
  await prisma.sentimentAnalysis.deleteMany({ where: { tenantId: TENANT_ID } });

  const sourceTypes = ['REVIEW', 'FEEDBACK', 'SLACK', 'EMAIL'];
  const sentimentLabels = ['VERY_POSITIVE', 'POSITIVE', 'NEUTRAL', 'NEGATIVE', 'VERY_NEGATIVE'];
  const emotions = [
    { joy: 0.8, trust: 0.6, anticipation: 0.4 },
    { joy: 0.6, trust: 0.5, surprise: 0.3 },
    { trust: 0.5, anticipation: 0.4 },
    { sadness: 0.3, fear: 0.2, trust: 0.4 },
    { anger: 0.3, disgust: 0.2, sadness: 0.4 },
  ];
  const dominantEmotions = ['joy', 'joy', 'trust', 'sadness', 'anger'];
  const topics = [
    ['performance', 'goals'],
    ['collaboration', 'teamwork'],
    ['workload', 'deadline'],
    ['recognition', 'feedback'],
    ['growth', 'career'],
  ];
  const intents = ['PRAISE', 'UPDATE', 'QUESTION', 'REQUEST', 'COMPLAINT'];

  let sentimentCount = 0;
  for (const user of allUsers) {
    // Create 30 days of sentiment data per user (2-3 per day)
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const entriesPerDay = 2 + Math.floor(Math.random() * 2);

      for (let e = 0; e < entriesPerDay; e++) {
        // Bias towards positive sentiment (realistic distribution)
        const sentimentIndex = Math.random() < 0.5 ? 0 : Math.random() < 0.35 ? 1 : Math.random() < 0.5 ? 2 : Math.random() < 0.7 ? 3 : 4;
        const score = [0.8, 0.5, 0.0, -0.4, -0.8][sentimentIndex] + (Math.random() * 0.2 - 0.1);

        date.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60));

        await prisma.sentimentAnalysis.create({
          data: {
            tenantId: TENANT_ID,
            userId: user.id,
            sourceType: sourceTypes[Math.floor(Math.random() * sourceTypes.length)],
            contentSample: null,
            sentimentScore: Math.round(Math.max(-1, Math.min(1, score)) * 1000) / 1000,
            sentimentLabel: sentimentLabels[sentimentIndex],
            confidence: 0.75 + Math.random() * 0.2,
            emotions: emotions[sentimentIndex],
            dominantEmotion: dominantEmotions[sentimentIndex],
            topics: topics[Math.floor(Math.random() * topics.length)],
            intent: intents[Math.floor(Math.random() * intents.length)],
            modelVersion: 'v1.2',
            modelType: 'TRANSFORMER',
            processingTime: 50 + Math.floor(Math.random() * 150),
            analyzedAt: new Date(date),
            createdAt: new Date(date),
          },
        });
        sentimentCount++;
      }
    }
  }
  console.log(`  Created ${sentimentCount} sentiment analysis records across ${allUsers.length} users`);

  console.log('\n=== Audit Fixes Seed Complete ===');
  console.log(`Templates: 3 | Benchmarks: ${createdBenchmarks.length} | Comparisons: ${allUsers.length * createdBenchmarks.length} | Sentiments: ${sentimentCount}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
