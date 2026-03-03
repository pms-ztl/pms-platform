/**
 * Meetings Seed Script — Populates Meeting Analytics page with sample OneOnOne data
 * Target tenant: demo-company
 *
 * Run: pushd "D:\CDC\PMS\pms-platform\packages\database" && npx ts-node --transpile-only prisma/seed-meetings.ts
 *
 * Idempotent: deletes existing OneOnOne data for the tenant, then inserts fresh data.
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
  // PHASE 1: Cleanup existing meeting data
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 1: Cleanup...');
  await prisma.oneOnOne.deleteMany({ where: { tenantId } });
  console.log('  ✓ Deleted existing OneOnOne records');

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE 2: Create OneOnOne meetings
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\nPhase 2: Creating OneOnOne meetings...');

  // Manager relationships:
  // Danish (CTO) manages Preethi (Eng Manager) and Prasina (Head HR)
  // Preethi manages Sanjay (Frontend Engineer)

  const meetings = [
    // --- Danish <-> Preethi (weekly 1:1s) ---
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-10-06T10:00:00Z'),
      duration: 30,
      location: 'Conference Room A',
      agenda: [
        { topic: 'Sprint retrospective', notes: 'Discussed what went well in Sprint 14' },
        { topic: 'Team capacity planning', notes: 'Need to hire 1 more backend dev' },
      ],
      managerNotes: 'Preethi is handling the team well. Approved hiring request.',
      sharedNotes: 'Agreed to post the job listing by end of week.',
      actionItems: [
        { title: 'Draft job description for backend role', done: true, assignee: 'Preethi' },
        { title: 'Review team velocity metrics', done: true, assignee: 'Danish' },
      ],
      completedAt: d('2025-10-06T10:35:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-10-20T10:00:00Z'),
      duration: 45,
      location: 'Conference Room A',
      agenda: [
        { topic: 'Q4 OKR progress', notes: 'On track for 3/4 key results' },
        { topic: 'Architecture review for new module', notes: 'Decided on microservice approach' },
        { topic: 'Career growth discussion', notes: 'Preethi interested in Staff Eng track' },
      ],
      managerNotes: 'Great progress on Q4 goals. Need to accelerate the auth module.',
      sharedNotes: 'Will set up architecture review meeting with full team.',
      actionItems: [
        { title: 'Schedule architecture review for auth module', done: true, assignee: 'Preethi' },
        { title: 'Share Staff Engineer rubric with Preethi', done: false, assignee: 'Danish' },
      ],
      completedAt: d('2025-10-20T10:50:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-11-04T10:00:00Z'),
      duration: 30,
      location: 'Conference Room A',
      agenda: [
        { topic: 'New hire onboarding plan', notes: 'Backend dev starts Nov 15' },
        { topic: 'Sprint 16 planning', notes: 'Prioritize performance improvements' },
      ],
      managerNotes: 'Onboarding plan looks solid. Good prioritization.',
      actionItems: [
        { title: 'Prepare onboarding docs for new hire', done: true, assignee: 'Preethi' },
        { title: 'Set up development environment guide', done: true, assignee: 'Sanjay' },
      ],
      completedAt: d('2025-11-04T10:32:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-11-18T10:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'New hire week 1 check-in', notes: 'Going well, paired with Sanjay' },
        { topic: 'Tech debt discussion', notes: 'Allocating 20% of sprint for tech debt' },
      ],
      actionItems: [
        { title: 'Create tech debt tracking board', done: true, assignee: 'Preethi' },
      ],
      completedAt: d('2025-11-18T10:28:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-12-02T10:00:00Z'),
      duration: 45,
      agenda: [
        { topic: 'Q4 wrap-up review', notes: 'Achieved 3.5/4 OKRs' },
        { topic: 'Q1 2026 goal setting', notes: 'Focus on scalability and testing' },
        { topic: 'Year-end performance discussion', notes: 'Exceeds expectations overall' },
      ],
      managerNotes: 'Outstanding quarter. Recommending for above-target bonus.',
      actionItems: [
        { title: 'Draft Q1 2026 OKRs for engineering', done: true, assignee: 'Preethi' },
        { title: 'Submit year-end performance review', done: true, assignee: 'Danish' },
      ],
      completedAt: d('2025-12-02T10:48:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-12-16T10:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Holiday sprint planning', notes: 'Reduced capacity, focus on critical bugs' },
        { topic: 'Team morale check', notes: 'Team is happy, excited for break' },
      ],
      actionItems: [
        { title: 'Finalize holiday on-call schedule', done: true, assignee: 'Preethi' },
      ],
      completedAt: d('2025-12-16T10:25:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-01-06T10:00:00Z'),
      duration: 45,
      location: 'Virtual - Google Meet',
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      agenda: [
        { topic: 'Q1 kick-off alignment', notes: 'Reviewed new quarter priorities' },
        { topic: 'Hiring update - 2nd backend dev', notes: 'Interviews scheduled for Jan' },
        { topic: 'Performance system rollout', notes: 'PMS platform going live Feb 1' },
      ],
      managerNotes: 'Strong start to the year. PMS rollout is top priority.',
      actionItems: [
        { title: 'Coordinate PMS rollout with HR', done: true, assignee: 'Preethi' },
        { title: 'Review candidate profiles for backend role', done: true, assignee: 'Danish' },
      ],
      completedAt: d('2026-01-06T10:40:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-01-20T10:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'PMS platform testing progress', notes: 'UAT in final phase' },
        { topic: 'Interview debrief', notes: 'Strong candidate identified' },
      ],
      actionItems: [
        { title: 'Complete PMS UAT signoff', done: true, assignee: 'Preethi' },
        { title: 'Extend offer to backend candidate', done: true, assignee: 'Danish' },
      ],
      completedAt: d('2026-01-20T10:30:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-02-03T10:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'PMS go-live debrief', notes: 'Successful launch with minimal issues' },
        { topic: 'Sprint velocity trends', notes: 'Velocity up 15% with new hire' },
      ],
      actionItems: [
        { title: 'Document PMS launch learnings', done: false, assignee: 'Preethi' },
      ],
      completedAt: d('2026-02-03T10:33:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-02-17T10:00:00Z'),
      duration: 45,
      agenda: [
        { topic: 'Mid-Q1 OKR check-in', notes: '2/3 OKRs on track, testing coverage behind' },
        { topic: 'Architecture discussion - caching layer', notes: 'Redis caching for API responses' },
      ],
      managerNotes: 'Need to push harder on test coverage. Caching proposal looks solid.',
      actionItems: [
        { title: 'Create testing improvement plan', done: false, assignee: 'Preethi' },
        { title: 'Approve Redis infrastructure budget', done: true, assignee: 'Danish' },
      ],
      completedAt: d('2026-02-17T10:42:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: preethi.id,
      status: 'SCHEDULED' as const,
      scheduledAt: d('2026-03-10T10:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Q1 final stretch planning' },
        { topic: 'Team feedback roundup' },
      ],
      actionItems: [],
    },

    // --- Danish <-> Prasina (bi-weekly 1:1s) ---
    {
      tenantId,
      managerId: danish.id,
      employeeId: prasina.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-10-13T14:00:00Z'),
      duration: 30,
      location: 'Conference Room B',
      agenda: [
        { topic: 'Employee engagement survey results', notes: '82% participation rate' },
        { topic: 'Benefits renewal timeline', notes: 'Due by end of November' },
      ],
      managerNotes: 'Good survey results. Need action plan for low-scoring areas.',
      actionItems: [
        { title: 'Create engagement improvement plan', done: true, assignee: 'Prasina' },
        { title: 'Review benefits proposals from vendors', done: true, assignee: 'Prasina' },
      ],
      completedAt: d('2025-10-13T14:28:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: prasina.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-11-10T14:00:00Z'),
      duration: 45,
      agenda: [
        { topic: 'Benefits renewal decision', notes: 'Selected new dental provider' },
        { topic: 'PMS platform requirements', notes: 'Reviewed feature wishlist from HR team' },
        { topic: 'Year-end review timeline', notes: 'Reviews due Dec 15' },
      ],
      actionItems: [
        { title: 'Communicate benefits changes to all staff', done: true, assignee: 'Prasina' },
        { title: 'Finalize PMS requirement doc', done: true, assignee: 'Prasina' },
      ],
      completedAt: d('2025-11-10T14:40:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: prasina.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-12-08T14:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Year-end review progress', notes: '80% of reviews submitted' },
        { topic: 'Holiday party planning', notes: 'Dec 20 at office, budget approved' },
      ],
      actionItems: [
        { title: 'Send reminder for outstanding reviews', done: true, assignee: 'Prasina' },
      ],
      completedAt: d('2025-12-08T14:30:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: prasina.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-01-13T14:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Q1 HR priorities', notes: 'Focus on PMS rollout and training' },
        { topic: 'Headcount planning', notes: '2 new hires budgeted for Q1' },
      ],
      actionItems: [
        { title: 'Create PMS training schedule for managers', done: true, assignee: 'Prasina' },
        { title: 'Approve headcount requisitions', done: true, assignee: 'Danish' },
      ],
      completedAt: d('2026-01-13T14:32:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: prasina.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-02-10T14:00:00Z'),
      duration: 45,
      agenda: [
        { topic: 'PMS adoption metrics', notes: '95% of employees have logged in' },
        { topic: 'Employee satisfaction pulse', notes: 'Score improved from 3.8 to 4.1' },
        { topic: 'Compliance training update', notes: 'All mandatory training completed' },
      ],
      managerNotes: 'PMS adoption is excellent. Great work on the rollout.',
      actionItems: [
        { title: 'Prepare PMS adoption report for board', done: false, assignee: 'Prasina' },
      ],
      completedAt: d('2026-02-10T14:42:00Z'),
    },
    {
      tenantId,
      managerId: danish.id,
      employeeId: prasina.id,
      status: 'SCHEDULED' as const,
      scheduledAt: d('2026-03-10T14:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Mid-Q1 review' },
        { topic: 'Diversity & inclusion initiatives' },
      ],
      actionItems: [],
    },

    // --- Preethi <-> Sanjay (weekly 1:1s) ---
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-10-08T15:00:00Z'),
      duration: 30,
      location: 'Virtual - Google Meet',
      agenda: [
        { topic: 'Sprint 14 tasks review', notes: 'Dashboard component ahead of schedule' },
        { topic: 'Technical skill development', notes: 'Sanjay wants to learn TypeScript deeper' },
      ],
      managerNotes: 'Sanjay is progressing well. Good initiative on learning.',
      actionItems: [
        { title: 'Complete React Testing Library course', done: true, assignee: 'Sanjay' },
        { title: 'Share TypeScript advanced resources', done: true, assignee: 'Preethi' },
      ],
      completedAt: d('2025-10-08T15:28:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-10-22T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Code review quality discussion', notes: 'Improving PR descriptions' },
        { topic: 'Upcoming presentation prep', notes: 'Sanjay presenting at team demo' },
      ],
      actionItems: [
        { title: 'Prepare demo presentation for Sprint 15', done: true, assignee: 'Sanjay' },
        { title: 'Review Sanjay PR description template', done: true, assignee: 'Preethi' },
      ],
      completedAt: d('2025-10-22T15:30:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-11-05T15:00:00Z'),
      duration: 25,
      agenda: [
        { topic: 'Sprint 16 scope', notes: 'Performance optimization tasks assigned' },
        { topic: 'Mentoring new hire', notes: 'Sanjay to pair program with new backend dev' },
      ],
      actionItems: [
        { title: 'Set up pair programming schedule', done: true, assignee: 'Sanjay' },
      ],
      completedAt: d('2025-11-05T15:22:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-11-19T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Component library progress', notes: '12 components completed' },
        { topic: 'Work-life balance check', notes: 'Feeling good, manageable workload' },
      ],
      actionItems: [
        { title: 'Document component library usage guide', done: true, assignee: 'Sanjay' },
      ],
      completedAt: d('2025-11-19T15:26:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-12-03T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Year-end self-assessment', notes: 'Helped Sanjay frame achievements' },
        { topic: 'Goals for 2026', notes: 'Full-stack development, lead a feature end-to-end' },
      ],
      managerNotes: 'Strong growth this quarter. Ready for more responsibility.',
      actionItems: [
        { title: 'Submit self-assessment by Dec 12', done: true, assignee: 'Sanjay' },
        { title: 'Draft 2026 development goals', done: true, assignee: 'Sanjay' },
      ],
      completedAt: d('2025-12-03T15:30:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2025-12-17T15:00:00Z'),
      duration: 20,
      agenda: [
        { topic: 'Quick sync before holiday break', notes: 'All tasks closed for the sprint' },
      ],
      actionItems: [],
      completedAt: d('2025-12-17T15:18:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-01-07T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Q1 objectives review', notes: 'Assigned PMS frontend features' },
        { topic: 'Tech stack decisions', notes: 'Using Zustand for state management' },
      ],
      actionItems: [
        { title: 'Set up PMS frontend project structure', done: true, assignee: 'Sanjay' },
        { title: 'Review Zustand patterns doc', done: true, assignee: 'Sanjay' },
      ],
      completedAt: d('2026-01-07T15:28:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-01-21T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'PMS dashboard development', notes: 'Hero banner and stat cards done' },
        { topic: 'Performance optimization', notes: 'Bundle size concerns - need code splitting' },
      ],
      actionItems: [
        { title: 'Implement code splitting for PMS routes', done: true, assignee: 'Sanjay' },
      ],
      completedAt: d('2026-01-21T15:30:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-02-04T15:00:00Z'),
      duration: 45,
      location: 'Virtual - Google Meet',
      agenda: [
        { topic: 'PMS launch debrief', notes: 'Smooth deployment, minor UI tweaks needed' },
        { topic: 'Accessibility review', notes: 'Need to improve keyboard navigation' },
        { topic: 'Mid-quarter career check-in', notes: 'On track for mid-level promotion consideration' },
      ],
      managerNotes: 'Excellent work on PMS launch. Keep pushing on accessibility.',
      actionItems: [
        { title: 'Fix keyboard navigation for all modals', done: true, assignee: 'Sanjay' },
        { title: 'Add ARIA labels to chart components', done: false, assignee: 'Sanjay' },
      ],
      completedAt: d('2026-02-04T15:40:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'COMPLETED' as const,
      scheduledAt: d('2026-02-18T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Testing coverage improvement', notes: 'Added unit tests for 8 components' },
        { topic: 'Upcoming features', notes: 'Starting on analytics dashboards' },
      ],
      actionItems: [
        { title: 'Design analytics dashboard wireframes', done: false, assignee: 'Sanjay' },
      ],
      completedAt: d('2026-02-18T15:28:00Z'),
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'CANCELLED' as const,
      scheduledAt: d('2026-02-25T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Regular check-in' },
      ],
      actionItems: [],
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'SCHEDULED' as const,
      scheduledAt: d('2026-03-04T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Sprint review' },
        { topic: 'Analytics dashboard progress' },
      ],
      actionItems: [],
    },
    {
      tenantId,
      managerId: preethi.id,
      employeeId: sanjay.id,
      status: 'SCHEDULED' as const,
      scheduledAt: d('2026-03-11T15:00:00Z'),
      duration: 30,
      agenda: [
        { topic: 'Q1 goals final check' },
        { topic: 'Promotion discussion prep' },
      ],
      actionItems: [],
    },
  ];

  for (const meeting of meetings) {
    await prisma.oneOnOne.create({ data: meeting });
  }

  console.log(`  ✓ Created ${meetings.length} OneOnOne meetings`);

  // Summary stats
  const completed = meetings.filter(m => m.status === 'COMPLETED').length;
  const scheduled = meetings.filter(m => m.status === 'SCHEDULED').length;
  const cancelled = meetings.filter(m => m.status === 'CANCELLED').length;
  console.log(`    - ${completed} completed, ${scheduled} scheduled, ${cancelled} cancelled`);
  console.log(`    - Danish ↔ Preethi: ${meetings.filter(m => m.managerId === danish.id && m.employeeId === preethi.id).length} meetings`);
  console.log(`    - Danish ↔ Prasina: ${meetings.filter(m => m.managerId === danish.id && m.employeeId === prasina.id).length} meetings`);
  console.log(`    - Preethi ↔ Sanjay: ${meetings.filter(m => m.managerId === preethi.id && m.employeeId === sanjay.id).length} meetings`);

  console.log('\n✅ Meeting seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
