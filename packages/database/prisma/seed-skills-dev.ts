/**
 * Seed script — Skills & Development Plans
 *
 * Populates:
 *   1. SkillCategory records (5 categories)
 *   2. TechnicalSkillAssessment records for each user (3-5 skills each)
 *   3. DevelopmentPlan records (2 plans)
 *
 * Idempotent — cleans up existing seeded data first.
 *
 * Run:
 *   pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/seed-skills-dev.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TENANT_ID = 'cbd87cec-52e8-406d-9fae-5a43a6449c73';

async function main() {
  console.log('🔧 Seed Skills & Development Plans — starting...');

  // ── Phase 0: Fetch users ────────────────────────────────────────
  const users = await prisma.user.findMany({
    where: { tenantId: TENANT_ID, isActive: true, deletedAt: null },
    select: { id: true, firstName: true, lastName: true, jobTitle: true },
  });
  if (users.length === 0) throw new Error('No users found for tenant');

  const danish = users.find((u) => u.firstName === 'Danish');
  const preethi = users.find((u) => u.firstName === 'Preethi');
  const sanjay = users.find((u) => u.firstName === 'Sanjay');
  const prasina = users.find((u) => u.firstName === 'Prasina');

  if (!danish || !preethi || !sanjay || !prasina) {
    throw new Error('Missing expected demo users');
  }
  console.log(`  ✓ Found ${users.length} users`);

  // ── Phase 1: Cleanup ────────────────────────────────────────────
  await prisma.technicalSkillAssessment.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.skillCategory.deleteMany({ where: { tenantId: TENANT_ID } });
  await prisma.developmentPlan.deleteMany({ where: { tenantId: TENANT_ID } });
  console.log('  ✓ Cleaned up old skill/dev data');

  // ── Phase 2: Create Skill Categories ────────────────────────────
  const categories = await Promise.all([
    prisma.skillCategory.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Frontend Development',
        description: 'Client-side web technologies and frameworks',
        categoryType: 'TECHNICAL',
        competencyFramework: {},
        levelDefinitions: [],
        assessmentCriteria: [],
      },
    }),
    prisma.skillCategory.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Backend Development',
        description: 'Server-side technologies, APIs, and databases',
        categoryType: 'TECHNICAL',
        competencyFramework: {},
        levelDefinitions: [],
        assessmentCriteria: [],
      },
    }),
    prisma.skillCategory.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Leadership & Management',
        description: 'People management, strategic thinking, and team leadership',
        categoryType: 'LEADERSHIP',
        competencyFramework: {},
        levelDefinitions: [],
        assessmentCriteria: [],
      },
    }),
    prisma.skillCategory.create({
      data: {
        tenantId: TENANT_ID,
        name: 'Communication',
        description: 'Verbal and written communication, presentation skills',
        categoryType: 'BEHAVIORAL',
        competencyFramework: {},
        levelDefinitions: [],
        assessmentCriteria: [],
      },
    }),
    prisma.skillCategory.create({
      data: {
        tenantId: TENANT_ID,
        name: 'DevOps & Cloud',
        description: 'CI/CD, cloud platforms, infrastructure management',
        categoryType: 'TECHNICAL',
        competencyFramework: {},
        levelDefinitions: [],
        assessmentCriteria: [],
      },
    }),
  ]);
  const [frontend, backend, leadership, communication, devops] = categories;
  console.log(`  ✓ Created ${categories.length} skill categories`);

  // ── Phase 3: Create Skill Assessments ───────────────────────────
  const now = new Date();
  const assessed = new Date('2026-02-20');

  const assessments = [
    // ── Sanjay (Frontend Engineer) ──
    { userId: sanjay.id, skillCategoryId: frontend.id, skillName: 'React & TypeScript', skillLevel: 'ADVANCED', selfAssessment: 4.5, managerAssessment: 4.2, finalScore: 4.35, targetScore: 5.0 },
    { userId: sanjay.id, skillCategoryId: frontend.id, skillName: 'CSS & Tailwind', skillLevel: 'ADVANCED', selfAssessment: 4.0, managerAssessment: 4.5, finalScore: 4.25, targetScore: 5.0 },
    { userId: sanjay.id, skillCategoryId: backend.id, skillName: 'Node.js & Express', skillLevel: 'INTERMEDIATE', selfAssessment: 3.0, managerAssessment: 3.2, finalScore: 3.10, targetScore: 4.0 },
    { userId: sanjay.id, skillCategoryId: communication.id, skillName: 'Technical Documentation', skillLevel: 'INTERMEDIATE', selfAssessment: 3.5, managerAssessment: 3.0, finalScore: 3.25, targetScore: 4.0 },

    // ── Preethi (Sr Engineering Manager) ──
    { userId: preethi.id, skillCategoryId: leadership.id, skillName: 'Team Leadership', skillLevel: 'EXPERT', selfAssessment: 4.8, managerAssessment: 4.7, finalScore: 4.75, targetScore: 5.0 },
    { userId: preethi.id, skillCategoryId: frontend.id, skillName: 'System Design', skillLevel: 'ADVANCED', selfAssessment: 4.2, managerAssessment: 4.0, finalScore: 4.10, targetScore: 5.0 },
    { userId: preethi.id, skillCategoryId: communication.id, skillName: 'Stakeholder Communication', skillLevel: 'ADVANCED', selfAssessment: 4.5, managerAssessment: 4.3, finalScore: 4.40, targetScore: 5.0 },
    { userId: preethi.id, skillCategoryId: devops.id, skillName: 'CI/CD Pipelines', skillLevel: 'INTERMEDIATE', selfAssessment: 3.5, managerAssessment: 3.8, finalScore: 3.65, targetScore: 4.5 },
    { userId: preethi.id, skillCategoryId: backend.id, skillName: 'Architecture & Design Patterns', skillLevel: 'ADVANCED', selfAssessment: 4.3, managerAssessment: 4.5, finalScore: 4.40, targetScore: 5.0 },

    // ── Danish (CTO) ──
    { userId: danish.id, skillCategoryId: leadership.id, skillName: 'Strategic Planning', skillLevel: 'EXPERT', selfAssessment: 4.9, managerAssessment: null, finalScore: 4.90, targetScore: 5.0 },
    { userId: danish.id, skillCategoryId: leadership.id, skillName: 'Technology Vision', skillLevel: 'EXPERT', selfAssessment: 4.7, managerAssessment: null, finalScore: 4.70, targetScore: 5.0 },
    { userId: danish.id, skillCategoryId: devops.id, skillName: 'Cloud Architecture (AWS)', skillLevel: 'ADVANCED', selfAssessment: 4.0, managerAssessment: null, finalScore: 4.00, targetScore: 4.5 },
    { userId: danish.id, skillCategoryId: communication.id, skillName: 'Executive Communication', skillLevel: 'EXPERT', selfAssessment: 4.6, managerAssessment: null, finalScore: 4.60, targetScore: 5.0 },

    // ── Prasina (Head of People & HR) ──
    { userId: prasina.id, skillCategoryId: communication.id, skillName: 'HR Analytics & People Data', skillLevel: 'EXPERT', selfAssessment: 5.0, managerAssessment: 5.0, finalScore: 5.00, targetScore: 5.0 },
    { userId: prasina.id, skillCategoryId: leadership.id, skillName: 'Organizational Development', skillLevel: 'ADVANCED', selfAssessment: 4.3, managerAssessment: 4.5, finalScore: 4.40, targetScore: 5.0 },
    { userId: prasina.id, skillCategoryId: communication.id, skillName: 'Conflict Resolution', skillLevel: 'ADVANCED', selfAssessment: 4.0, managerAssessment: 4.2, finalScore: 4.10, targetScore: 5.0 },
    { userId: prasina.id, skillCategoryId: leadership.id, skillName: 'Talent Acquisition Strategy', skillLevel: 'INTERMEDIATE', selfAssessment: 3.8, managerAssessment: 3.5, finalScore: 3.65, targetScore: 4.5 },
    { userId: prasina.id, skillCategoryId: frontend.id, skillName: 'Data Visualization (Charts)', skillLevel: 'BEGINNER', selfAssessment: 2.5, managerAssessment: 2.0, finalScore: 2.25, targetScore: 3.0 },
  ];

  for (const a of assessments) {
    await prisma.technicalSkillAssessment.create({
      data: {
        tenantId: TENANT_ID,
        userId: a.userId,
        skillCategoryId: a.skillCategoryId,
        skillName: a.skillName,
        skillLevel: a.skillLevel,
        selfAssessment: a.selfAssessment,
        managerAssessment: a.managerAssessment,
        finalScore: a.finalScore,
        scoreWeights: { self: 0.4, manager: 0.4, test: 0.2 },
        evidenceLinks: [],
        behavioralEvents: [],
        certifications: [],
        lastAssessedAt: assessed,
        nextAssessmentDue: new Date('2026-05-20'),
      },
    });
  }
  console.log(`  ✓ Created ${assessments.length} skill assessments`);

  // ── Phase 4: Create Development Plans ───────────────────────────
  await prisma.developmentPlan.create({
    data: {
      tenantId: TENANT_ID,
      userId: sanjay.id,
      planName: 'Full-Stack Growth Path',
      planType: 'CAREER_GROWTH',
      duration: 6,
      startDate: new Date('2026-01-15'),
      targetCompletionDate: new Date('2026-07-15'),
      careerGoal: 'Transition from Frontend specialist to a well-rounded Full-Stack engineer capable of independently building end-to-end features.',
      targetRole: 'Full-Stack Engineer',
      targetLevel: 'Senior',
      currentLevel: 'Mid-Level',
      strengthsAssessed: ['React', 'TypeScript', 'CSS/Tailwind', 'Component Architecture'],
      developmentAreas: ['Backend APIs', 'Database Design', 'DevOps', 'System Design'],
      careerPath: [
        { milestone: 'Complete Node.js advanced course', target: '2026-02-28', status: 'COMPLETED' },
        { milestone: 'Build first API endpoint independently', target: '2026-03-15', status: 'IN_PROGRESS' },
        { milestone: 'Database design & optimization project', target: '2026-04-30', status: 'PENDING' },
        { milestone: 'Deploy a full-stack feature to production', target: '2026-06-30', status: 'PENDING' },
      ],
      skillGapAnalysis: { backendDev: { current: 3.1, target: 4.0, gap: 0.9 }, devOps: { current: 2.0, target: 3.5, gap: 1.5 }, systemDesign: { current: 2.5, target: 4.0, gap: 1.5 } },
      competencyGaps: {},
      activities: [
        { name: 'Node.js Masterclass', type: 'COURSE', status: 'COMPLETED', hours: 40 },
        { name: 'Build REST API for Reports module', type: 'PROJECT', status: 'IN_PROGRESS', hours: 20 },
        { name: 'Shadow Preethi on system design review', type: 'MENTORING', status: 'PENDING', hours: 8 },
        { name: 'AWS Fundamentals certification prep', type: 'CERTIFICATION', status: 'PENDING', hours: 30 },
        { name: 'Code review pairing with backend team', type: 'ON_THE_JOB', status: 'IN_PROGRESS', hours: 10 },
      ],
      totalActivities: 5,
      completedActivities: 1,
      targetSkills: [
        { skill: 'Node.js & Express', targetLevel: 'ADVANCED' },
        { skill: 'PostgreSQL & Prisma', targetLevel: 'INTERMEDIATE' },
        { skill: 'Docker & CI/CD', targetLevel: 'INTERMEDIATE' },
      ],
      targetCompetencies: [],
      certifications: ['AWS Cloud Practitioner'],
      learningResources: [
        { title: 'Node.js Design Patterns', type: 'BOOK' },
        { title: 'Prisma ORM Documentation', type: 'DOCUMENTATION' },
        { title: 'Docker in Practice', type: 'COURSE' },
      ],
      mentorAssigned: preethi.id,
      budget: 2000,
      budgetSpent: 350,
      progressPercentage: 35,
      milestones: [
        { name: 'Backend fundamentals', dueDate: '2026-02-28', completed: true },
        { name: 'First API feature', dueDate: '2026-04-15', completed: false },
        { name: 'Full-stack deployment', dueDate: '2026-07-15', completed: false },
      ],
      milestonesAchieved: 1,
      evaluationCriteria: { goalCompletion: 0.4, skillImprovement: 0.3, managerFeedback: 0.3 },
      successMetrics: [
        { metric: 'Backend skill score improvement', target: '≥ 4.0', current: '3.1' },
        { metric: 'Independent API features shipped', target: '≥ 3', current: '0' },
      ],
      status: 'ACTIVE',
      approvedBy: preethi.id,
      approvedAt: new Date('2026-01-14'),
      generatedBy: 'HYBRID',
    },
  });

  await prisma.developmentPlan.create({
    data: {
      tenantId: TENANT_ID,
      userId: prasina.id,
      planName: 'HR Technology & Analytics Mastery',
      planType: 'SKILL_DEVELOPMENT',
      duration: 4,
      startDate: new Date('2026-02-01'),
      targetCompletionDate: new Date('2026-06-01'),
      careerGoal: 'Deepen expertise in HR analytics and people data visualization to drive data-informed talent decisions across the organization.',
      targetRole: 'VP of People',
      targetLevel: 'Director',
      currentLevel: 'Head',
      strengthsAssessed: ['HR Analytics', 'Organizational Development', 'Conflict Resolution', 'Stakeholder Management'],
      developmentAreas: ['Data Visualization', 'Statistical Analysis', 'HR Tech Stack', 'Executive Reporting'],
      careerPath: [
        { milestone: 'Complete data viz fundamentals', target: '2026-02-28', status: 'COMPLETED' },
        { milestone: 'Build first custom HR dashboard', target: '2026-03-31', status: 'IN_PROGRESS' },
        { milestone: 'Present quarterly people analytics report', target: '2026-04-30', status: 'PENDING' },
      ],
      skillGapAnalysis: { dataVisualization: { current: 2.25, target: 3.0, gap: 0.75 }, statisticalAnalysis: { current: 3.0, target: 4.0, gap: 1.0 } },
      competencyGaps: {},
      activities: [
        { name: 'Data Visualization with D3.js', type: 'COURSE', status: 'COMPLETED', hours: 20 },
        { name: 'HR Metrics & KPIs workshop', type: 'WORKSHOP', status: 'COMPLETED', hours: 8 },
        { name: 'Build attrition prediction model (with ML team)', type: 'PROJECT', status: 'IN_PROGRESS', hours: 15 },
        { name: 'People Analytics certification', type: 'CERTIFICATION', status: 'PENDING', hours: 25 },
      ],
      totalActivities: 4,
      completedActivities: 2,
      targetSkills: [
        { skill: 'Data Visualization', targetLevel: 'INTERMEDIATE' },
        { skill: 'People Analytics', targetLevel: 'EXPERT' },
      ],
      targetCompetencies: [],
      certifications: ['SHRM People Analytics Certification'],
      learningResources: [
        { title: 'People Analytics by Ben Waber', type: 'BOOK' },
        { title: 'Tableau for HR Professionals', type: 'COURSE' },
      ],
      mentorAssigned: danish.id,
      budget: 1500,
      budgetSpent: 600,
      progressPercentage: 50,
      milestones: [
        { name: 'Data viz basics', dueDate: '2026-02-28', completed: true },
        { name: 'Custom dashboard', dueDate: '2026-03-31', completed: false },
        { name: 'Executive presentation', dueDate: '2026-06-01', completed: false },
      ],
      milestonesAchieved: 1,
      evaluationCriteria: { goalCompletion: 0.5, skillImprovement: 0.3, peerFeedback: 0.2 },
      successMetrics: [
        { metric: 'Data viz skill score', target: '≥ 3.0', current: '2.25' },
        { metric: 'Dashboards created', target: '≥ 2', current: '0' },
      ],
      status: 'ACTIVE',
      approvedBy: danish.id,
      approvedAt: new Date('2026-01-30'),
      generatedBy: 'AI',
    },
  });

  console.log('  ✓ Created 2 development plans');

  console.log('\n✅ Seed Skills & Development Plans — complete!');
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  prisma.$disconnect();
  process.exit(1);
});
