import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create a demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      domain: 'demo.pms-platform.local',
      settings: {
        features: {
          goals: true,
          reviews: true,
          feedback: true,
          calibration: true,
          oneOnOnes: true,
        },
        branding: {
          primaryColor: '#3B82F6',
        },
      },
      subscriptionTier: 'enterprise',
      maxUsers: 1000,
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create Business Units
  const techBU = await prisma.businessUnit.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'TECH' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Technology',
      code: 'TECH',
      description: 'Technology and Engineering Business Unit',
    },
  });

  const opsBU = await prisma.businessUnit.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'OPS' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Operations',
      code: 'OPS',
      description: 'Business Operations',
    },
  });

  console.log('✅ Created business units:', techBU.name, opsBU.name);

  // Create Departments
  const engineeringDept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'ENG' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Engineering',
      code: 'ENG',
      description: 'Software Engineering Department',
    },
  });

  const hrDept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'HR' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Human Resources',
      code: 'HR',
      description: 'HR Department',
    },
  });

  console.log('✅ Created departments:', engineeringDept.name, hrDept.name);

  // Create Teams (FUNCTIONAL is a valid TeamType)
  const backendTeam = await prisma.team.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'BACKEND' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Backend Engineering',
      code: 'BACKEND',
      type: 'FUNCTIONAL',
      departmentId: engineeringDept.id,
      businessUnitId: techBU.id,
    },
  });

  const frontendTeam = await prisma.team.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'FRONTEND' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Frontend Engineering',
      code: 'FRONTEND',
      type: 'FUNCTIONAL',
      departmentId: engineeringDept.id,
      businessUnitId: techBU.id,
    },
  });

  console.log('✅ Created teams:', backendTeam.name, frontendTeam.name);

  // ==========================================================================
  // ROLES — Principle of Least Privilege
  // Names MUST match authorize.ts ROLE_ALIASES
  // Permission format: resource:action:scope
  // ==========================================================================

  const superAdminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'SUPER_ADMIN' } },
    update: { permissions: ['*:manage:all'] },
    create: {
      tenantId: tenant.id,
      name: 'SUPER_ADMIN',
      description: 'System Owner with full unrestricted access',
      permissions: ['*:manage:all'],
      isSystem: true,
    },
  });

  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'ADMIN' } },
    update: { permissions: ['*:manage:all'] },
    create: {
      tenantId: tenant.id,
      name: 'ADMIN',
      description: 'System Administrator with full access',
      permissions: ['*:manage:all'],
      isSystem: true,
    },
  });

  const hrRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'HR_ADMIN' } },
    update: {
      permissions: [
        'users:manage:all',
        'roles:read:all',
        'reviews:manage:all',
        'calibration:manage:all',
        'feedback:read:all',
        'goals:read:all',
        'analytics:read:all',
        'reports:manage:all',
        'settings:read:all',
        'compensation:manage:all',
        'promotions:manage:all',
      ],
    },
    create: {
      tenantId: tenant.id,
      name: 'HR_ADMIN',
      description: 'HR Administrator — Process Lead for reviews, calibration, analytics',
      permissions: [
        'users:manage:all',
        'roles:read:all',
        'reviews:manage:all',
        'calibration:manage:all',
        'feedback:read:all',
        'goals:read:all',
        'analytics:read:all',
        'reports:manage:all',
        'settings:read:all',
        'compensation:manage:all',
        'promotions:manage:all',
      ],
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'MANAGER' } },
    update: {
      permissions: [
        'goals:read:team',
        'goals:update:team',
        'goals:create:own',
        'reviews:manage:team',
        'reviews:read:own',
        'reviews:update:own',
        'feedback:create:all',
        'feedback:read:team',
        'calibration:read:team',
        'one-on-ones:manage:team',
        'users:read:team',
        'analytics:read:team',
        'reports:read:own',
      ],
    },
    create: {
      tenantId: tenant.id,
      name: 'MANAGER',
      description: 'People Manager / Evaluator — manages team goals, reviews, 1:1s',
      permissions: [
        'goals:read:team',
        'goals:update:team',
        'goals:create:own',
        'reviews:manage:team',
        'reviews:read:own',
        'reviews:update:own',
        'feedback:create:all',
        'feedback:read:team',
        'calibration:read:team',
        'one-on-ones:manage:team',
        'users:read:team',
        'analytics:read:team',
        'reports:read:own',
      ],
      isSystem: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'EMPLOYEE' } },
    update: {
      permissions: [
        'goals:create:own',
        'goals:read:own',
        'goals:update:own',
        'reviews:read:own',
        'reviews:update:own',
        'feedback:create:all',
        'feedback:read:own',
        'one-on-ones:read:own',
        'reports:read:own',
      ],
    },
    create: {
      tenantId: tenant.id,
      name: 'EMPLOYEE',
      description: 'Individual Contributor — manages own goals, reads own reviews',
      permissions: [
        'goals:create:own',
        'goals:read:own',
        'goals:update:own',
        'reviews:read:own',
        'reviews:update:own',
        'feedback:create:all',
        'feedback:read:own',
        'one-on-ones:read:own',
        'reports:read:own',
      ],
      isSystem: true,
    },
  });

  console.log('✅ Created roles:', superAdminRole.name, adminRole.name, hrRole.name, managerRole.name, employeeRole.name);

  // ==========================================================================
  // USERS — 4 Real Entity Users with unique passwords
  // ==========================================================================

  // Hash passwords (each user gets a unique password)
  const prasinaHash = await bcrypt.hash('demo@pms', 10);
  const danishHash = await bcrypt.hash('demo@123', 10);
  const preethiHash = await bcrypt.hash('demo@789', 10);
  const sanjayHash = await bcrypt.hash('demo@456', 10);

  // 1. System Owner / Super Admin — Dr. Prasina Sathish A.
  const prasinaUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'prssanjana@gmail.com' } },
    update: {},
    create: {
      email: 'prssanjana@gmail.com',
      passwordHash: prasinaHash,
      firstName: 'Prasina',
      lastName: 'Sathish A',
      displayName: 'Dr. Prasina Sathish A.',
      tenantId: tenant.id,
      departmentId: hrDept.id,
      businessUnitId: opsBU.id,
      jobTitle: 'System Owner',
      emailVerified: true,
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PS&backgroundColor=6366f1&textColor=ffffff',
    },
  });

  // 2. Process Lead / HR Manager — Danish A. G. (reports to Prasina)
  const danishUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'agdanishr@gmail.com' } },
    update: {},
    create: {
      email: 'agdanishr@gmail.com',
      passwordHash: danishHash,
      firstName: 'Danish',
      lastName: 'A G',
      displayName: 'Danish A. G.',
      tenantId: tenant.id,
      managerId: prasinaUser.id,
      departmentId: hrDept.id,
      businessUnitId: opsBU.id,
      jobTitle: 'HR Manager',
      emailVerified: true,
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=DA&backgroundColor=0ea5e9&textColor=ffffff',
    },
  });

  // 3. Evaluator / Team Lead — Preethi S. (reports to Prasina)
  const preethiUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'preethisivachandran0@gmail.com' } },
    update: {},
    create: {
      email: 'preethisivachandran0@gmail.com',
      passwordHash: preethiHash,
      firstName: 'Preethi',
      lastName: 'S',
      displayName: 'Preethi S.',
      tenantId: tenant.id,
      managerId: prasinaUser.id,
      departmentId: engineeringDept.id,
      businessUnitId: techBU.id,
      jobTitle: 'Team Lead',
      emailVerified: true,
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PS2&backgroundColor=ec4899&textColor=ffffff',
    },
  });

  // 4. Employee / Individual Contributor — Sanjay N. (reports to Preethi)
  const sanjayUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'sanjayn0369@gmail.com' } },
    update: {},
    create: {
      email: 'sanjayn0369@gmail.com',
      passwordHash: sanjayHash,
      firstName: 'Sanjay',
      lastName: 'N',
      displayName: 'Sanjay N.',
      tenantId: tenant.id,
      managerId: preethiUser.id,
      departmentId: engineeringDept.id,
      businessUnitId: techBU.id,
      jobTitle: 'Software Engineer',
      emailVerified: true,
      avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=SN&backgroundColor=f59e0b&textColor=ffffff',
    },
  });

  console.log('✅ Created users:', prasinaUser.email, danishUser.email, preethiUser.email, sanjayUser.email);

  // ==========================================================================
  // ROLE ASSIGNMENTS (Principle of Least Privilege)
  // ==========================================================================

  // Prasina: SUPER_ADMIN + HR_ADMIN (full system access + HR operations)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: prasinaUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: prasinaUser.id, roleId: superAdminRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: prasinaUser.id, roleId: hrRole.id } },
    update: {},
    create: { userId: prasinaUser.id, roleId: hrRole.id },
  });

  // Danish: HR_ADMIN + EMPLOYEE (HR operations + own goals/reviews)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: danishUser.id, roleId: hrRole.id } },
    update: {},
    create: { userId: danishUser.id, roleId: hrRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: danishUser.id, roleId: employeeRole.id } },
    update: {},
    create: { userId: danishUser.id, roleId: employeeRole.id },
  });

  // Preethi: MANAGER + EMPLOYEE (team management + own goals/reviews)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: preethiUser.id, roleId: managerRole.id } },
    update: {},
    create: { userId: preethiUser.id, roleId: managerRole.id },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: preethiUser.id, roleId: employeeRole.id } },
    update: {},
    create: { userId: preethiUser.id, roleId: employeeRole.id },
  });

  // Sanjay: EMPLOYEE only (individual contributor access)
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: sanjayUser.id, roleId: employeeRole.id } },
    update: {},
    create: { userId: sanjayUser.id, roleId: employeeRole.id },
  });

  console.log('✅ Assigned roles to users');
  console.log('   Prasina → SUPER_ADMIN + HR_ADMIN');
  console.log('   Danish  → HR_ADMIN + EMPLOYEE');
  console.log('   Preethi → MANAGER + EMPLOYEE');
  console.log('   Sanjay  → EMPLOYEE');

  // ==========================================================================
  // TEAM MEMBERSHIPS
  // ==========================================================================

  // Preethi leads the Backend Engineering team
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: backendTeam.id, userId: preethiUser.id } },
    update: {},
    create: {
      teamId: backendTeam.id,
      userId: preethiUser.id,
      role: 'LEAD',
      isPrimary: true,
    },
  });

  // Sanjay is a member of Backend Engineering
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: backendTeam.id, userId: sanjayUser.id } },
    update: {},
    create: {
      teamId: backendTeam.id,
      userId: sanjayUser.id,
      role: 'MEMBER',
      isPrimary: true,
    },
  });

  // Danish is part of the Frontend team (cross-functional HR representation)
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: frontendTeam.id, userId: danishUser.id } },
    update: {},
    create: {
      teamId: frontendTeam.id,
      userId: danishUser.id,
      role: 'MEMBER',
      isPrimary: true,
    },
  });

  console.log('✅ Created team memberships');

  // ==========================================================================
  // COMPETENCY FRAMEWORK
  // ==========================================================================

  const framework = await prisma.competencyFramework.upsert({
    where: { id: '00000000-0000-0000-00cf-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-00cf-000000000001',
      tenantId: tenant.id,
      name: 'Engineering Competency Framework',
      description: 'Core competencies for engineering roles',
      isDefault: true,
    },
  });

  const leadershipComp = await prisma.competency.create({
    data: {
      frameworkId: framework.id,
      name: 'Leadership',
      description: 'Ability to lead and inspire teams',
      category: 'CORE',
      levelDescriptions: {
        '1': 'Basic leadership awareness',
        '2': 'Can lead small projects',
        '3': 'Leads teams effectively',
        '4': 'Strategic leadership',
        '5': 'Executive leadership',
      },
      sortOrder: 1,
    },
  });

  const communicationComp = await prisma.competency.create({
    data: {
      frameworkId: framework.id,
      name: 'Communication',
      description: 'Effective communication skills',
      category: 'CORE',
      levelDescriptions: {
        '1': 'Basic communication',
        '2': 'Clear verbal and written communication',
        '3': 'Persuasive communication',
        '4': 'Strategic communication',
        '5': 'Masterful communication',
      },
      sortOrder: 2,
    },
  });

  const technicalComp = await prisma.competency.create({
    data: {
      frameworkId: framework.id,
      name: 'Technical Skills',
      description: 'Technical proficiency and expertise',
      category: 'TECHNICAL',
      levelDescriptions: {
        '1': 'Junior level',
        '2': 'Mid level',
        '3': 'Senior level',
        '4': 'Expert level',
        '5': 'Thought leader',
      },
      sortOrder: 3,
    },
  });

  console.log('✅ Created competencies:', leadershipComp.name, communicationComp.name, technicalComp.name);

  // ==========================================================================
  // REVIEW CYCLE
  // ==========================================================================

  const reviewCycle = await prisma.reviewCycle.create({
    data: {
      tenantId: tenant.id,
      name: '2024 Annual Review',
      type: 'ANNUAL',
      status: 'SCHEDULED',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      selfAssessmentStart: new Date('2024-11-01'),
      selfAssessmentEnd: new Date('2024-11-15'),
      managerReviewStart: new Date('2024-11-16'),
      managerReviewEnd: new Date('2024-11-30'),
      calibrationStart: new Date('2024-12-01'),
      calibrationEnd: new Date('2024-12-10'),
      sharingStart: new Date('2024-12-11'),
      createdById: prasinaUser.id,
    },
  });

  console.log('✅ Created review cycle:', reviewCycle.name);

  // ==========================================================================
  // REVIEWS
  // ==========================================================================

  const review = await prisma.review.create({
    data: {
      tenantId: tenant.id,
      revieweeId: sanjayUser.id,
      reviewerId: preethiUser.id,
      cycleId: reviewCycle.id,
      type: 'MANAGER',
      status: 'IN_PROGRESS',
      overallRating: 4,
      summary: 'Strong technical skills and great team collaboration',
      strengths: ['Strong technical skills', 'Great team collaboration'],
      areasForGrowth: ['Time management', 'Documentation'],
      content: {
        recommendations: 'Ready for senior level promotion',
      },
    },
  });

  console.log('✅ Created review for:', sanjayUser.firstName);

  // ==========================================================================
  // FEEDBACK
  // ==========================================================================

  await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      fromUserId: preethiUser.id,
      toUserId: sanjayUser.id,
      type: 'PRAISE',
      visibility: 'PRIVATE',
      content: 'Excellent work on the performance module implementation!',
      sentiment: 'POSITIVE',
      sentimentScore: 0.95,
    },
  });

  await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      fromUserId: danishUser.id,
      toUserId: sanjayUser.id,
      type: 'RECOGNITION',
      visibility: 'PUBLIC',
      content: 'Great collaboration on the backend integration',
      sentiment: 'POSITIVE',
      sentimentScore: 0.9,
    },
  });

  console.log('✅ Created feedback records');

  // ==========================================================================
  // GOALS
  // ==========================================================================

  const companyGoal = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      ownerId: prasinaUser.id,
      createdById: prasinaUser.id,
      type: 'COMPANY',
      title: 'Launch PMS Platform v1.0',
      description: 'Successfully launch the performance management platform',
      status: 'ACTIVE',
      priority: 'CRITICAL',
      progress: 75,
      targetValue: 100,
      currentValue: 75,
      unit: 'percent',
      startDate: new Date('2024-01-01'),
      dueDate: new Date('2024-12-31'),
      weight: 1,
    },
  });

  const teamGoal = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      ownerId: preethiUser.id,
      createdById: preethiUser.id,
      teamId: backendTeam.id,
      parentGoalId: companyGoal.id,
      type: 'TEAM',
      title: 'Complete Backend API Development',
      description: 'Finish all backend API endpoints',
      status: 'ACTIVE',
      priority: 'HIGH',
      progress: 85,
      targetValue: 100,
      currentValue: 85,
      unit: 'percent',
      startDate: new Date('2024-01-01'),
      dueDate: new Date('2024-10-31'),
      weight: 1,
    },
  });

  const individualGoal = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      ownerId: sanjayUser.id,
      createdById: sanjayUser.id,
      parentGoalId: teamGoal.id,
      type: 'INDIVIDUAL',
      title: 'Implement Review Module',
      description: 'Build the performance review module',
      status: 'COMPLETED',
      priority: 'HIGH',
      progress: 100,
      targetValue: 1,
      currentValue: 1,
      unit: 'module',
      startDate: new Date('2024-03-01'),
      dueDate: new Date('2024-06-30'),
      completedAt: new Date('2024-06-28'),
      weight: 1,
    },
  });

  console.log('✅ Created goals:', companyGoal.title, teamGoal.title, individualGoal.title);

  // ==========================================================================
  // CALIBRATION SESSION
  // ==========================================================================

  const calibrationSession = await prisma.calibrationSession.create({
    data: {
      tenantId: tenant.id,
      cycleId: reviewCycle.id,
      name: 'Q4 Engineering Calibration',
      status: 'SCHEDULED',
      scheduledStart: new Date('2024-12-05T09:00:00Z'),
      scheduledEnd: new Date('2024-12-05T12:00:00Z'),
      facilitatorId: prasinaUser.id,
      preAnalysis: {
        distributionTargets: {
          '5': 10,
          '4': 30,
          '3': 40,
          '2': 15,
          '1': 5,
        },
      },
    },
  });

  await prisma.calibrationParticipant.create({
    data: {
      sessionId: calibrationSession.id,
      userId: preethiUser.id,
      role: 'PARTICIPANT',
    },
  });

  console.log('✅ Created calibration session:', calibrationSession.name);

  // ==========================================================================
  // ONE-ON-ONE
  // ==========================================================================

  const oneOnOne = await prisma.oneOnOne.create({
    data: {
      tenantId: tenant.id,
      managerId: preethiUser.id,
      employeeId: sanjayUser.id,
      scheduledAt: new Date('2024-12-15T10:00:00Z'),
      duration: 30,
      status: 'SCHEDULED',
      agenda: ['Review current sprint progress', 'Discuss career development', 'Address any blockers'],
    },
  });

  console.log('✅ Created one-on-one meeting');

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  await prisma.notification.create({
    data: {
      userId: sanjayUser.id,
      type: 'REVIEW_ASSIGNED',
      title: 'Performance Review Assigned',
      body: 'Your annual performance review has been assigned',
      status: 'PENDING',
      data: {
        priority: 'HIGH',
        relatedEntityType: 'REVIEW',
        relatedEntityId: review.id,
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: sanjayUser.id,
      type: 'FEEDBACK_RECEIVED',
      title: 'New Feedback Received',
      body: 'You received positive feedback from your manager',
      status: 'PENDING',
      data: {
        priority: 'MEDIUM',
        relatedEntityType: 'FEEDBACK',
      },
    },
  });

  console.log('✅ Created notifications');

  // ==========================================================================
  // REAL-TIME PERFORMANCE DATA
  // ==========================================================================
  console.log('\n🔄 Seeding real-time performance data...');

  const now = new Date();
  const allUsers = [
    { user: prasinaUser, role: 'admin' },
    { user: danishUser, role: 'hr' },
    { user: preethiUser, role: 'manager' },
    { user: sanjayUser, role: 'employee' },
  ];

  // Helper: random number in range
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const randDec = (min: number, max: number, decimals = 2) =>
    parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

  // -----------------------------------------------------------------------
  // 1. Hourly Performance Metrics (last 24 hours for all users)
  // -----------------------------------------------------------------------
  await prisma.hourlyPerformanceMetric.deleteMany({
    where: { tenantId: tenant.id, userId: { in: allUsers.map(u => u.user.id) } },
  });

  for (const { user, role } of allUsers) {
    for (let h = 23; h >= 0; h--) {
      const metricHour = new Date(now);
      metricHour.setHours(now.getHours() - h, 0, 0, 0);

      const hour = metricHour.getHours();
      const isWorkHour = hour >= 8 && hour <= 18;
      const multiplier = isWorkHour ? 1.0 : 0.1;
      const isManager = role === 'manager' || role === 'admin' || role === 'hr';

      await prisma.hourlyPerformanceMetric.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          metricHour,
          tasksCompleted: Math.round(rand(0, 4) * multiplier),
          tasksCreated: Math.round(rand(0, 3) * multiplier),
          taskCompletionRate: isWorkHour ? randDec(60, 100) : 0,
          activeMinutes: Math.round(rand(10, 55) * multiplier),
          focusMinutes: Math.round(rand(5, 40) * multiplier),
          meetingMinutes: isManager
            ? Math.round(rand(10, 30) * multiplier)
            : Math.round(rand(0, 15) * multiplier),
          goalUpdates: Math.round(rand(0, 2) * multiplier),
          goalProgressDelta: isWorkHour ? randDec(0, 5) : 0,
          interactionsCount: Math.round(rand(2, 15) * multiplier),
          feedbackGiven: isWorkHour ? rand(0, 2) : 0,
          feedbackReceived: isWorkHour ? rand(0, 2) : 0,
          messagesSent: Math.round(rand(1, 12) * multiplier),
          collaborationScore: isWorkHour ? randDec(50, 95) : null,
          qualityScore: isWorkHour ? randDec(65, 98) : null,
          errorCount: isWorkHour ? rand(0, 2) : 0,
          productivityScore: isWorkHour ? randDec(55, 95) : null,
          engagementScore: isWorkHour ? randDec(60, 95) : null,
          performanceScore: isWorkHour ? randDec(60, 95) : null,
        },
      });
    }
  }
  console.log('✅ Created hourly performance metrics (24h × 4 users)');

  // -----------------------------------------------------------------------
  // 2. Daily Performance Metrics (last 30 days for anomaly detection baseline)
  // -----------------------------------------------------------------------
  await prisma.dailyPerformanceMetric.deleteMany({
    where: { tenantId: tenant.id, userId: { in: allUsers.map(u => u.user.id) } },
  });

  for (const { user, role } of allUsers) {
    const isManager = role === 'manager';
    for (let d = 29; d >= 0; d--) {
      const metricDate = new Date(now);
      metricDate.setDate(now.getDate() - d);
      metricDate.setHours(0, 0, 0, 0);

      const isWeekend = metricDate.getDay() === 0 || metricDate.getDay() === 6;
      const dayMultiplier = isWeekend ? 0.15 : 1.0;

      const recentDip = d <= 2 ? 0.7 : 1.0;

      await prisma.dailyPerformanceMetric.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          metricDate,
          totalTasksCompleted: Math.round(rand(5, 15) * dayMultiplier * recentDip),
          totalTasksCreated: Math.round(rand(3, 10) * dayMultiplier),
          avgTaskCompletionRate: isWeekend ? randDec(0, 30) : randDec(65, 95) * recentDip,
          totalActiveMinutes: Math.round(rand(300, 480) * dayMultiplier * recentDip),
          totalFocusMinutes: Math.round(rand(150, 300) * dayMultiplier * recentDip),
          totalMeetingMinutes: isManager
            ? Math.round(rand(60, 180) * dayMultiplier)
            : Math.round(rand(30, 90) * dayMultiplier),
          firstActivityAt: isWeekend ? null : new Date(metricDate.getTime() + 8 * 3600000 + rand(0, 60) * 60000),
          lastActivityAt: isWeekend ? null : new Date(metricDate.getTime() + 17 * 3600000 + rand(0, 120) * 60000),
          totalGoalUpdates: Math.round(rand(1, 5) * dayMultiplier),
          totalGoalProgressDelta: isWeekend ? 0 : randDec(1, 8),
          goalsOnTrack: rand(2, 5),
          goalsAtRisk: rand(0, 2),
          goalsOffTrack: rand(0, 1),
          totalInteractions: Math.round(rand(15, 50) * dayMultiplier),
          totalFeedbackGiven: Math.round(rand(0, 3) * dayMultiplier),
          totalFeedbackReceived: Math.round(rand(0, 3) * dayMultiplier),
          totalMessagesSent: Math.round(rand(10, 40) * dayMultiplier),
          avgCollaborationScore: isWeekend ? null : randDec(55, 90),
          avgProductivityScore: isWeekend ? null : randDec(60, 92) * recentDip,
          avgEngagementScore: isWeekend ? null : randDec(58, 90) * recentDip,
          overallPerformanceScore: isWeekend ? null : randDec(60, 92) * recentDip,
          hasAnomaly: d <= 1 && !isWeekend,
          anomalyTypes: d <= 1 && !isWeekend ? ['productivity_dip'] : [],
          productivityTrend: d <= 2 ? 'declining' : 'stable',
          engagementTrend: d <= 2 ? 'declining' : 'improving',
        },
      });
    }
  }
  console.log('✅ Created daily performance metrics (30 days × 4 users)');

  // -----------------------------------------------------------------------
  // 3. Activity Events (variety of event types over last 48 hours)
  // -----------------------------------------------------------------------
  const activityTypes = [
    { eventType: 'TASK_COMPLETED', eventSubtype: 'bug_fix', entityType: 'task', isProductive: true },
    { eventType: 'TASK_COMPLETED', eventSubtype: 'feature', entityType: 'task', isProductive: true },
    { eventType: 'TASK_CREATED', eventSubtype: 'story', entityType: 'task', isProductive: true },
    { eventType: 'GOAL_UPDATED', eventSubtype: 'progress', entityType: 'goal', isProductive: true },
    { eventType: 'GOAL_COMPLETED', eventSubtype: null, entityType: 'goal', isProductive: true },
    { eventType: 'FEEDBACK_GIVEN', eventSubtype: 'praise', entityType: 'feedback', isProductive: true },
    { eventType: 'FEEDBACK_RECEIVED', eventSubtype: 'recognition', entityType: 'feedback', isProductive: true },
    { eventType: 'REVIEW_SUBMITTED', eventSubtype: null, entityType: 'review', isProductive: true },
    { eventType: 'MEETING_ATTENDED', eventSubtype: 'standup', entityType: 'meeting', isProductive: true },
    { eventType: 'MEETING_ATTENDED', eventSubtype: 'one_on_one', entityType: 'meeting', isProductive: true },
    { eventType: 'MESSAGE_SENT', eventSubtype: 'slack', entityType: 'message', isProductive: false },
    { eventType: 'DOCUMENT_CREATED', eventSubtype: 'spec', entityType: 'document', isProductive: true },
    { eventType: 'CODE_REVIEW', eventSubtype: 'approved', entityType: 'pull_request', isProductive: true },
    { eventType: 'LOGIN', eventSubtype: null, entityType: 'session', isProductive: false },
  ];

  for (const { user } of allUsers) {
    for (let i = 0; i < 40; i++) {
      const activity = activityTypes[rand(0, activityTypes.length - 1)];
      const createdAt = new Date(now.getTime() - rand(0, 48 * 3600000));

      await prisma.activityEvent.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          eventType: activity.eventType,
          eventSubtype: activity.eventSubtype,
          entityType: activity.entityType,
          entityId: null,
          metadata: {
            source: 'seed',
            details: `Auto-generated ${activity.eventType.toLowerCase().replace('_', ' ')} event`,
          },
          durationSeconds: activity.eventType.includes('MEETING') ? rand(900, 3600) : rand(60, 1800),
          isProductive: activity.isProductive,
          createdAt,
        },
      });
    }
  }
  console.log('✅ Created activity events (40 × 4 users)');

  // -----------------------------------------------------------------------
  // 4. Workload Snapshots (current snapshot per user)
  // -----------------------------------------------------------------------
  const workloadStatuses = ['underloaded', 'optimal', 'heavy', 'overloaded'];

  for (const { user, role } of allUsers) {
    const isManager = role === 'manager' || role === 'hr';
    const activeGoals = rand(3, 7);
    const activeTasks = rand(5, 15);
    const pendingReviews = isManager ? rand(2, 6) : rand(0, 1);
    const meetings = rand(2, 6);
    const estimatedHours = randDec(6, 12);
    const availableHours = 8;
    const utilization = (estimatedHours / availableHours) * 100;
    const balanceIdx = utilization < 60 ? 0 : utilization < 80 ? 1 : utilization < 100 ? 2 : 3;

    await prisma.workloadSnapshot.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        snapshotTime: now,
        activeGoals,
        activeTasks,
        pendingReviews,
        scheduledMeetingsToday: meetings,
        estimatedHoursRequired: estimatedHours,
        availableHours,
        capacityUtilization: Math.min(utilization, 150),
        workloadScore: randDec(40, 95),
        balanceStatus: workloadStatuses[balanceIdx],
        redistributionRecommended: balanceIdx >= 3,
        recommendedActions: balanceIdx >= 2
          ? [
              { action: 'Redistribute tasks', priority: 'high', details: 'Move 2 tasks to less loaded team members' },
              { action: 'Postpone non-critical goals', priority: 'medium', details: 'Defer 1 goal to next sprint' },
            ]
          : [],
      },
    });

    // Also create a few historical snapshots
    for (let d = 1; d <= 5; d++) {
      const snapTime = new Date(now);
      snapTime.setDate(now.getDate() - d);
      const histGoals = rand(2, 7);
      const histEst = randDec(5, 11);
      const histUtil = (histEst / 8) * 100;
      const histIdx = histUtil < 60 ? 0 : histUtil < 80 ? 1 : histUtil < 100 ? 2 : 3;

      await prisma.workloadSnapshot.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          snapshotTime: snapTime,
          activeGoals: histGoals,
          activeTasks: rand(4, 14),
          pendingReviews: isManager ? rand(1, 5) : rand(0, 1),
          scheduledMeetingsToday: rand(1, 5),
          estimatedHoursRequired: histEst,
          availableHours: 8,
          capacityUtilization: Math.min(histUtil, 150),
          workloadScore: randDec(40, 90),
          balanceStatus: workloadStatuses[histIdx],
          redistributionRecommended: histIdx >= 3,
          recommendedActions: [],
        },
      });
    }
  }
  console.log('✅ Created workload snapshots (current + 5 days history × 4 users)');

  // -----------------------------------------------------------------------
  // 5. Communication Sentiment (weekly analysis for last 4 weeks)
  // -----------------------------------------------------------------------
  for (const { user } of allUsers) {
    for (let w = 3; w >= 0; w--) {
      const periodEnd = new Date(now);
      periodEnd.setDate(now.getDate() - w * 7);
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - 7);

      const weekBonus = (3 - w) * 3;

      await prisma.communicationSentiment.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          analysisPeriodStart: periodStart,
          analysisPeriodEnd: periodEnd,
          overallSentimentScore: randDec(60 + weekBonus, 85 + weekBonus),
          positivityRatio: randDec(0.55, 0.85),
          collaborationSentiment: randDec(60 + weekBonus, 90 + weekBonus),
          stressIndicators: randDec(10, 35 - weekBonus / 2),
          communicationFrequency: w === 0 ? 'high' : 'moderate',
          responseTimeTrend: w <= 1 ? 'improving' : 'stable',
          engagementLevel: w === 0 ? 'high' : w === 1 ? 'moderate' : 'moderate',
          feedbackSentiment: randDec(65, 90),
          reviewTextSentiment: randDec(55, 85),
          goalCommentSentiment: randDec(60, 88),
          moraleAlert: w === 3,
          moraleAlertReason: w === 3 ? 'Elevated stress indicators detected' : null,
        },
      });
    }
  }
  console.log('✅ Created communication sentiment data (4 weeks × 4 users)');

  // -----------------------------------------------------------------------
  // 6. Deadline Alerts (mix of alert levels)
  // -----------------------------------------------------------------------
  const deadlineAlertData = [
    {
      entityTitle: 'Complete Backend API Development',
      daysUntil: 5,
      progress: 85,
      alertLevel: 'warning',
      probability: 75,
    },
    {
      entityTitle: 'Implement Review Module',
      daysUntil: -2,
      progress: 100,
      alertLevel: 'info',
      probability: 100,
    },
    {
      entityTitle: 'Q1 Performance Self-Assessment',
      daysUntil: 2,
      progress: 30,
      alertLevel: 'urgent',
      probability: 25,
    },
    {
      entityTitle: 'Sprint 12 Deliverables',
      daysUntil: 8,
      progress: 60,
      alertLevel: 'info',
      probability: 85,
    },
    {
      entityTitle: 'Annual Review Submission',
      daysUntil: 1,
      progress: 45,
      alertLevel: 'urgent',
      probability: 30,
    },
    {
      entityTitle: 'Code Quality Improvement Initiative',
      daysUntil: -1,
      progress: 70,
      alertLevel: 'overdue',
      probability: 0,
    },
  ];

  for (let i = 0; i < deadlineAlertData.length; i++) {
    const alert = deadlineAlertData[i];
    const deadline = new Date(now);
    deadline.setDate(now.getDate() + alert.daysUntil);
    const targetUser = i % 2 === 0 ? sanjayUser : preethiUser;

    await prisma.deadlineAlert.create({
      data: {
        tenantId: tenant.id,
        userId: targetUser.id,
        entityType: i < 4 ? 'goal' : 'review',
        entityId: i < 2 ? teamGoal.id : i < 4 ? individualGoal.id : review.id,
        entityTitle: alert.entityTitle,
        deadline,
        daysUntilDeadline: Math.max(alert.daysUntil, 0),
        hoursUntilDeadline: Math.max(alert.daysUntil * 24, 0),
        currentProgress: alert.progress,
        requiredDailyProgress: alert.daysUntil > 0 ? (100 - alert.progress) / alert.daysUntil : 0,
        completionProbability: alert.probability,
        alertLevel: alert.alertLevel,
        isAcknowledged: alert.alertLevel === 'info',
        acknowledgedAt: alert.alertLevel === 'info' ? new Date() : null,
        isSnoozed: false,
        notificationCount: rand(1, 5),
        lastNotifiedAt: new Date(now.getTime() - rand(1, 12) * 3600000),
      },
    });
  }
  console.log('✅ Created deadline alerts (6 alerts)');

  // -----------------------------------------------------------------------
  // 7. Performance Anomalies (detected anomalies)
  // -----------------------------------------------------------------------
  const anomalyData = [
    {
      type: 'productivity_spike',
      severity: 'low',
      metric: 'productivityScore',
      expected: 72,
      actual: 95,
      status: 'detected',
    },
    {
      type: 'engagement_drop',
      severity: 'medium',
      metric: 'engagementScore',
      expected: 78,
      actual: 52,
      status: 'detected',
    },
    {
      type: 'activity_drop',
      severity: 'high',
      metric: 'totalActiveMinutes',
      expected: 420,
      actual: 180,
      status: 'acknowledged',
    },
    {
      type: 'overtime_pattern',
      severity: 'medium',
      metric: 'totalActiveMinutes',
      expected: 480,
      actual: 620,
      status: 'resolved',
    },
    {
      type: 'collaboration_spike',
      severity: 'low',
      metric: 'collaborationScore',
      expected: 65,
      actual: 92,
      status: 'detected',
    },
  ];

  for (let i = 0; i < anomalyData.length; i++) {
    const anomaly = anomalyData[i];
    const targetUser = i % 3 === 0 ? preethiUser : i % 3 === 1 ? sanjayUser : danishUser;
    const detectedAt = new Date(now.getTime() - rand(1, 72) * 3600000);
    const deviation = ((anomaly.actual - anomaly.expected) / anomaly.expected) * 100;

    await prisma.performanceAnomaly.create({
      data: {
        tenantId: tenant.id,
        userId: targetUser.id,
        anomalyType: anomaly.type,
        severity: anomaly.severity,
        detectedAt,
        metricName: anomaly.metric,
        expectedValue: anomaly.expected,
        actualValue: anomaly.actual,
        deviationPercentage: Math.abs(deviation),
        zScore: randDec(2.0, 4.0),
        detectionWindowStart: new Date(detectedAt.getTime() - 7 * 24 * 3600000),
        detectionWindowEnd: detectedAt,
        baselinePeriodDays: 30,
        status: anomaly.status,
        acknowledgedById: anomaly.status !== 'detected' ? preethiUser.id : null,
        acknowledgedAt: anomaly.status !== 'detected' ? new Date(detectedAt.getTime() + 3600000) : null,
        resolvedAt: anomaly.status === 'resolved' ? new Date(detectedAt.getTime() + 24 * 3600000) : null,
        resolutionNotes: anomaly.status === 'resolved' ? 'Addressed via workload rebalancing' : null,
        managerNotified: anomaly.severity !== 'low',
        managerNotifiedAt: anomaly.severity !== 'low' ? new Date(detectedAt.getTime() + 1800000) : null,
        metadata: {
          baselineAvg: anomaly.expected,
          baselineStdDev: randDec(8, 15),
          trendDirection: anomaly.actual > anomaly.expected ? 'increasing' : 'decreasing',
        },
      },
    });
  }
  console.log('✅ Created performance anomalies (5 anomalies)');

  // -----------------------------------------------------------------------
  // 8. Project Milestones + Milestone Progress Events
  // -----------------------------------------------------------------------
  const milestone1 = await prisma.projectMilestone.create({
    data: {
      tenantId: tenant.id,
      goalId: companyGoal.id,
      teamId: backendTeam.id,
      title: 'MVP Backend Complete',
      description: 'All core API endpoints functional with test coverage',
      milestoneType: 'delivery',
      plannedDate: new Date(now.getTime() - 15 * 24 * 3600000),
      actualDate: new Date(now.getTime() - 13 * 24 * 3600000),
      originalPlannedDate: new Date(now.getTime() - 20 * 24 * 3600000),
      status: 'completed',
      progressPercentage: 100,
      completionCriteria: [
        { criterion: 'All API endpoints implemented', met: true },
        { criterion: 'Unit test coverage > 80%', met: true },
        { criterion: 'Integration tests passing', met: true },
      ],
      dependsOn: [],
      blockedBy: [],
      autoDetected: false,
      delayDays: 0,
      ownerId: preethiUser.id,
    },
  });

  const milestone2 = await prisma.projectMilestone.create({
    data: {
      tenantId: tenant.id,
      goalId: companyGoal.id,
      teamId: frontendTeam.id,
      title: 'Frontend Dashboard Launch',
      description: 'Complete dashboard UI with all real-time performance widgets',
      milestoneType: 'delivery',
      plannedDate: new Date(now.getTime() + 10 * 24 * 3600000),
      originalPlannedDate: new Date(now.getTime() + 7 * 24 * 3600000),
      status: 'in_progress',
      progressPercentage: 72,
      completionCriteria: [
        { criterion: 'All dashboard widgets implemented', met: true },
        { criterion: 'Responsive design verified', met: false },
        { criterion: 'Performance benchmarks met', met: false },
      ],
      dependsOn: [milestone1.id],
      blockedBy: [],
      autoDetected: false,
      delayDays: 3,
      velocityBasedEta: new Date(now.getTime() + 12 * 24 * 3600000),
      ownerId: danishUser.id,
    },
  });

  const milestone3 = await prisma.projectMilestone.create({
    data: {
      tenantId: tenant.id,
      goalId: teamGoal.id,
      teamId: backendTeam.id,
      title: 'Performance Review Module v2',
      description: 'Enhanced review workflows with calibration integration',
      milestoneType: 'feature',
      plannedDate: new Date(now.getTime() + 25 * 24 * 3600000),
      originalPlannedDate: new Date(now.getTime() + 25 * 24 * 3600000),
      status: 'pending',
      progressPercentage: 15,
      completionCriteria: [
        { criterion: 'Review workflow redesigned', met: false },
        { criterion: 'Calibration integration complete', met: false },
        { criterion: 'Manager feedback incorporated', met: false },
      ],
      dependsOn: [milestone1.id, milestone2.id],
      blockedBy: [],
      autoDetected: false,
      delayDays: 0,
      ownerId: sanjayUser.id,
    },
  });

  const milestone4 = await prisma.projectMilestone.create({
    data: {
      tenantId: tenant.id,
      goalId: companyGoal.id,
      teamId: backendTeam.id,
      title: 'API Rate Limiting & Security Hardening',
      description: 'Production-ready security measures and rate limiting',
      milestoneType: 'security',
      plannedDate: new Date(now.getTime() + 5 * 24 * 3600000),
      originalPlannedDate: new Date(now.getTime() + 3 * 24 * 3600000),
      status: 'at_risk',
      progressPercentage: 45,
      completionCriteria: [
        { criterion: 'Rate limiting implemented', met: true },
        { criterion: 'OWASP top 10 addressed', met: false },
        { criterion: 'Penetration testing passed', met: false },
      ],
      dependsOn: [],
      blockedBy: [],
      autoDetected: true,
      detectionConfidence: 85,
      delayDays: 2,
      velocityBasedEta: new Date(now.getTime() + 8 * 24 * 3600000),
      ownerId: sanjayUser.id,
    },
  });

  console.log('✅ Created project milestones (4 milestones)');

  // Milestone Progress Events
  const milestoneEvents = [
    { milestone: milestone1, eventType: 'status_change', prev: { status: 'pending' }, next: { status: 'in_progress' }, daysAgo: 30 },
    { milestone: milestone1, eventType: 'progress_update', prev: { progress: 0 }, next: { progress: 50 }, daysAgo: 22 },
    { milestone: milestone1, eventType: 'progress_update', prev: { progress: 50 }, next: { progress: 85 }, daysAgo: 16 },
    { milestone: milestone1, eventType: 'status_change', prev: { status: 'in_progress' }, next: { status: 'completed' }, daysAgo: 13 },
    { milestone: milestone2, eventType: 'status_change', prev: { status: 'pending' }, next: { status: 'in_progress' }, daysAgo: 14 },
    { milestone: milestone2, eventType: 'progress_update', prev: { progress: 0 }, next: { progress: 35 }, daysAgo: 10 },
    { milestone: milestone2, eventType: 'progress_update', prev: { progress: 35 }, next: { progress: 55 }, daysAgo: 6 },
    { milestone: milestone2, eventType: 'progress_update', prev: { progress: 55 }, next: { progress: 72 }, daysAgo: 1 },
    { milestone: milestone4, eventType: 'status_change', prev: { status: 'pending' }, next: { status: 'in_progress' }, daysAgo: 8 },
    { milestone: milestone4, eventType: 'progress_update', prev: { progress: 0 }, next: { progress: 25 }, daysAgo: 5 },
    { milestone: milestone4, eventType: 'status_change', prev: { status: 'in_progress' }, next: { status: 'at_risk' }, daysAgo: 2 },
    { milestone: milestone4, eventType: 'progress_update', prev: { progress: 25 }, next: { progress: 45 }, daysAgo: 1 },
  ];

  for (const evt of milestoneEvents) {
    const triggeredBy = evt.milestone === milestone1 || evt.milestone === milestone4 ? sanjayUser : danishUser;
    await prisma.milestoneProgressEvent.create({
      data: {
        milestoneId: evt.milestone.id,
        eventType: evt.eventType,
        previousValue: evt.prev,
        newValue: evt.next,
        triggeredById: triggeredBy.id,
        triggerSource: 'manual',
        notes: evt.eventType === 'status_change'
          ? `Status changed from ${(evt.prev as { status: string }).status} to ${(evt.next as { status: string }).status}`
          : `Progress updated to ${(evt.next as { progress: number }).progress}%`,
        createdAt: new Date(now.getTime() - evt.daysAgo * 24 * 3600000),
      },
    });
  }
  console.log('✅ Created milestone progress events (12 events)');

  // -----------------------------------------------------------------------
  // 9. Performance Alerts (general alerts)
  // -----------------------------------------------------------------------
  await prisma.performanceAlert.create({
    data: {
      tenantId: tenant.id,
      targetUserId: sanjayUser.id,
      alertType: 'goal_at_risk',
      alertCategory: 'goal',
      severity: 'medium',
      priority: 2,
      title: 'Goal falling behind schedule',
      description: 'Sprint 12 Deliverables goal is at 60% with only 8 days remaining',
      actionRequired: 'Review goal timeline and adjust milestones',
      status: 'active',
      notifyUser: true,
      notifyManager: true,
      notifyHr: false,
      notificationChannels: ['in_app', 'email'],
      metadata: {
        goalProgress: 60,
        daysRemaining: 8,
        requiredDailyProgress: 5,
      },
    },
  });

  await prisma.performanceAlert.create({
    data: {
      tenantId: tenant.id,
      targetUserId: danishUser.id,
      alertType: 'engagement_drop',
      alertCategory: 'engagement',
      severity: 'low',
      priority: 1,
      title: 'Engagement score declining',
      description: 'Engagement score has decreased by 15% over the past week',
      actionRequired: 'Schedule a check-in meeting',
      status: 'active',
      notifyUser: false,
      notifyManager: true,
      notifyHr: false,
      notificationChannels: ['in_app'],
      metadata: {
        currentScore: 58,
        previousScore: 73,
        trendPeriod: '7 days',
      },
    },
  });

  await prisma.performanceAlert.create({
    data: {
      tenantId: tenant.id,
      targetTeamId: backendTeam.id,
      alertType: 'workload_imbalance',
      alertCategory: 'workload',
      severity: 'medium',
      priority: 2,
      title: 'Team workload imbalance detected',
      description: 'Backend team has uneven task distribution — some members overloaded while others underutilized',
      actionRequired: 'Rebalance task assignments across team members',
      status: 'active',
      notifyUser: false,
      notifyManager: true,
      notifyHr: false,
      notificationChannels: ['in_app'],
      metadata: {
        maxUtilization: 135,
        minUtilization: 45,
        avgUtilization: 88,
      },
    },
  });

  console.log('✅ Created performance alerts (3 alerts)');

  // ==========================================================================
  // CAREER PATHS — HR Manager Track & Engineering Track
  // ==========================================================================

  const hrCareerPath = await prisma.careerPath.create({
    data: {
      tenantId: tenant.id,
      pathName: 'HR Leadership Track',
      pathDescription: 'Career progression from HR Coordinator to Chief Human Resources Officer (CHRO). This track develops strategic HR capabilities including talent management, organizational development, and people analytics.',
      startingRole: 'HR Coordinator',
      department: 'Human Resources',
      roles: [
        { title: 'HR Coordinator', level: 1, description: 'Entry-level HR support and administration' },
        { title: 'HR Specialist', level: 2, description: 'Focused HR functional expertise' },
        { title: 'HR Manager', level: 3, description: 'HR team leadership and strategy execution' },
        { title: 'Senior HR Manager', level: 4, description: 'Cross-functional HR leadership' },
        { title: 'HR Director', level: 5, description: 'Departmental HR strategy and policy' },
        { title: 'VP of People', level: 6, description: 'Organization-wide people strategy' },
        { title: 'CHRO', level: 7, description: 'Executive leadership of all people functions' },
      ],
      levels: [
        { level: 1, title: 'Foundation', minYears: 0, maxYears: 2, skills: ['HRIS', 'Recruitment basics', 'Onboarding'] },
        { level: 2, title: 'Specialist', minYears: 2, maxYears: 4, skills: ['Employee relations', 'Compensation', 'Benefits administration'] },
        { level: 3, title: 'Management', minYears: 4, maxYears: 7, skills: ['Team leadership', 'Performance management', 'HR analytics'] },
        { level: 4, title: 'Senior Management', minYears: 7, maxYears: 10, skills: ['Strategic planning', 'Change management', 'Organizational design'] },
        { level: 5, title: 'Director', minYears: 10, maxYears: 14, skills: ['Executive coaching', 'M&A integration', 'Culture transformation'] },
        { level: 6, title: 'VP', minYears: 14, maxYears: 18, skills: ['Board reporting', 'Investor relations', 'Global HR strategy'] },
        { level: 7, title: 'C-Suite', minYears: 18, maxYears: null, skills: ['CEO partnership', 'Enterprise transformation', 'Thought leadership'] },
      ],
      branches: [
        { from: 'HR Manager', to: 'Talent Acquisition Director', description: 'Specialize in recruiting and employer branding' },
        { from: 'HR Manager', to: 'Learning & Development Manager', description: 'Focus on training, upskilling, and career development' },
        { from: 'Senior HR Manager', to: 'People Analytics Director', description: 'Data-driven HR strategy and workforce planning' },
      ],
      skillRequirements: {
        core: ['Communication', 'Empathy', 'Conflict resolution', 'Analytical thinking'],
        technical: ['HRIS systems', 'People analytics', 'Compensation modeling', 'ATS platforms'],
        leadership: ['Team management', 'Strategic planning', 'Change management', 'Executive presence'],
      },
      competencyRequirements: {
        'HR Coordinator': { leadership: 1, communication: 2, technical: 2 },
        'HR Specialist': { leadership: 2, communication: 3, technical: 3 },
        'HR Manager': { leadership: 3, communication: 4, technical: 3 },
        'HR Director': { leadership: 4, communication: 5, technical: 4 },
        'CHRO': { leadership: 5, communication: 5, technical: 4 },
      },
      experienceRequirements: {
        'HR Coordinator': { minYears: 0, certifications: [] },
        'HR Specialist': { minYears: 2, certifications: ['PHR'] },
        'HR Manager': { minYears: 4, certifications: ['PHR', 'SHRM-CP'] },
        'HR Director': { minYears: 10, certifications: ['SPHR', 'SHRM-SCP'] },
        'CHRO': { minYears: 18, certifications: ['SPHR', 'SHRM-SCP', 'Executive MBA preferred'] },
      },
      averageDuration: 120,
      successRate: 72.5,
      isActive: true,
    },
  });

  const engineeringCareerPath = await prisma.careerPath.create({
    data: {
      tenantId: tenant.id,
      pathName: 'Software Engineering Track',
      pathDescription: 'Career progression from Junior Software Engineer to Principal Engineer or VP of Engineering. This track covers individual contributor and management branches for engineering professionals.',
      startingRole: 'Junior Software Engineer',
      department: 'Engineering',
      roles: [
        { title: 'Junior Software Engineer', level: 1, description: 'Learning fundamentals and contributing to team projects' },
        { title: 'Software Engineer', level: 2, description: 'Independent contributor on features and bug fixes' },
        { title: 'Senior Software Engineer', level: 3, description: 'Technical leadership on complex features' },
        { title: 'Staff Engineer', level: 4, description: 'Cross-team technical leadership and architecture' },
        { title: 'Principal Engineer', level: 5, description: 'Organization-wide technical strategy' },
      ],
      levels: [
        { level: 1, title: 'Junior', minYears: 0, maxYears: 2, skills: ['Programming basics', 'Version control', 'Testing'] },
        { level: 2, title: 'Mid-Level', minYears: 2, maxYears: 5, skills: ['System design', 'Code review', 'CI/CD'] },
        { level: 3, title: 'Senior', minYears: 5, maxYears: 8, skills: ['Architecture', 'Mentoring', 'Technical planning'] },
        { level: 4, title: 'Staff', minYears: 8, maxYears: 12, skills: ['Cross-team coordination', 'Technical vision', 'Influence without authority'] },
        { level: 5, title: 'Principal', minYears: 12, maxYears: null, skills: ['Industry thought leadership', 'R&D strategy', 'Executive communication'] },
      ],
      branches: [
        { from: 'Senior Software Engineer', to: 'Engineering Manager', description: 'People management track for engineering leaders' },
        { from: 'Staff Engineer', to: 'Director of Engineering', description: 'Engineering leadership combining technical and people management' },
        { from: 'Senior Software Engineer', to: 'DevOps Lead', description: 'Infrastructure and platform engineering specialization' },
      ],
      skillRequirements: {
        core: ['Problem solving', 'Communication', 'Collaboration', 'Continuous learning'],
        technical: ['Programming languages', 'System design', 'Databases', 'Cloud services', 'Security'],
        leadership: ['Mentoring', 'Technical vision', 'Project planning', 'Stakeholder management'],
      },
      competencyRequirements: {
        'Junior Software Engineer': { leadership: 1, communication: 1, technical: 2 },
        'Software Engineer': { leadership: 1, communication: 2, technical: 3 },
        'Senior Software Engineer': { leadership: 3, communication: 3, technical: 4 },
        'Staff Engineer': { leadership: 4, communication: 4, technical: 5 },
        'Principal Engineer': { leadership: 5, communication: 5, technical: 5 },
      },
      experienceRequirements: {
        'Junior Software Engineer': { minYears: 0, certifications: [] },
        'Software Engineer': { minYears: 2, certifications: [] },
        'Senior Software Engineer': { minYears: 5, certifications: ['AWS Solutions Architect preferred'] },
        'Staff Engineer': { minYears: 8, certifications: [] },
        'Principal Engineer': { minYears: 12, certifications: [] },
      },
      averageDuration: 96,
      successRate: 68.0,
      isActive: true,
    },
  });

  const managementCareerPath = await prisma.careerPath.create({
    data: {
      tenantId: tenant.id,
      pathName: 'Engineering Management Track',
      pathDescription: 'Career progression from Team Lead to VP of Engineering. Combines technical expertise with people management, strategic planning, and organizational leadership.',
      startingRole: 'Team Lead',
      department: 'Engineering',
      roles: [
        { title: 'Team Lead', level: 1, description: 'Leading a small engineering team' },
        { title: 'Engineering Manager', level: 2, description: 'Managing multiple teams or a larger team' },
        { title: 'Senior Engineering Manager', level: 3, description: 'Strategic engineering leadership' },
        { title: 'Director of Engineering', level: 4, description: 'Department-level engineering strategy' },
        { title: 'VP of Engineering', level: 5, description: 'Organization-wide engineering vision' },
      ],
      levels: [
        { level: 1, title: 'Team Lead', minYears: 4, maxYears: 7, skills: ['1:1s', 'Sprint planning', 'Code review'] },
        { level: 2, title: 'Manager', minYears: 7, maxYears: 10, skills: ['Hiring', 'Performance management', 'Budget planning'] },
        { level: 3, title: 'Senior Manager', minYears: 10, maxYears: 14, skills: ['Cross-team strategy', 'Vendor management', 'Organizational design'] },
        { level: 4, title: 'Director', minYears: 14, maxYears: 18, skills: ['Technical strategy', 'Executive reporting', 'P&L ownership'] },
        { level: 5, title: 'VP', minYears: 18, maxYears: null, skills: ['Board presentations', 'M&A technical diligence', 'Innovation strategy'] },
      ],
      branches: [
        { from: 'Engineering Manager', to: 'Product Manager', description: 'Transition to product leadership' },
        { from: 'Director of Engineering', to: 'CTO', description: 'Executive technical leadership path' },
      ],
      skillRequirements: {
        core: ['Leadership', 'Communication', 'Strategic thinking', 'Empathy'],
        technical: ['Architecture', 'System design', 'DevOps', 'Security basics'],
        leadership: ['Hiring', 'Performance management', 'Budget', 'Organizational design'],
      },
      competencyRequirements: {
        'Team Lead': { leadership: 3, communication: 3, technical: 4 },
        'Engineering Manager': { leadership: 4, communication: 4, technical: 3 },
        'Director of Engineering': { leadership: 5, communication: 5, technical: 4 },
        'VP of Engineering': { leadership: 5, communication: 5, technical: 4 },
      },
      experienceRequirements: {
        'Team Lead': { minYears: 4, certifications: [] },
        'Engineering Manager': { minYears: 7, certifications: [] },
        'Director of Engineering': { minYears: 14, certifications: [] },
        'VP of Engineering': { minYears: 18, certifications: ['Executive MBA preferred'] },
      },
      averageDuration: 108,
      successRate: 55.0,
      isActive: true,
    },
  });

  console.log('✅ Created career paths:', hrCareerPath.pathName, engineeringCareerPath.pathName, managementCareerPath.pathName);

  // ==========================================================================
  // SKILL CATEGORIES & TECHNICAL SKILL ASSESSMENTS
  // ==========================================================================

  // Clean up existing data for idempotent re-seeding (cascading FKs)
  await prisma.technicalSkillAssessment.deleteMany({ where: { tenantId: tenant.id } });
  await prisma.$executeRawUnsafe(`DELETE FROM leadership_competency_scores WHERE tenant_id = '${tenant.id}'`).catch(() => {});
  await prisma.$executeRawUnsafe(`DELETE FROM behavioral_competency_scores WHERE tenant_id = '${tenant.id}'`).catch(() => {});
  await prisma.skillCategory.deleteMany({ where: { tenantId: tenant.id } });

  const technicalSkillCat = await prisma.skillCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Technical Skills',
      description: 'Core technical and engineering competencies',
      categoryType: 'TECHNICAL',
      competencyFramework: {
        name: 'Technical Competency Framework',
        version: '1.0',
        levels: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      },
      levelDefinitions: [
        { level: 'BEGINNER', description: 'Basic knowledge and supervised application', scoreRange: [1.0, 2.5] },
        { level: 'INTERMEDIATE', description: 'Independent application with consistent results', scoreRange: [2.5, 4.0] },
        { level: 'ADVANCED', description: 'Deep expertise and ability to mentor others', scoreRange: [4.0, 5.0] },
        { level: 'EXPERT', description: 'Industry-leading knowledge and innovation', scoreRange: [5.0, 5.0] },
      ],
      assessmentCriteria: [
        { method: 'self_assessment', weight: 0.2 },
        { method: 'manager_assessment', weight: 0.3 },
        { method: 'project_score', weight: 0.3 },
        { method: 'peer_review', weight: 0.2 },
      ],
      defaultWeight: 1.0,
    },
  });

  const leadershipSkillCat = await prisma.skillCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Leadership Skills',
      description: 'Leadership, management, and people development competencies',
      categoryType: 'LEADERSHIP',
      competencyFramework: {
        name: 'Leadership Competency Framework',
        version: '1.0',
        levels: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      },
      levelDefinitions: [
        { level: 'BEGINNER', description: 'Emerging leadership awareness', scoreRange: [1.0, 2.5] },
        { level: 'INTERMEDIATE', description: 'Effective team leadership', scoreRange: [2.5, 4.0] },
        { level: 'ADVANCED', description: 'Strategic leadership across teams', scoreRange: [4.0, 5.0] },
        { level: 'EXPERT', description: 'Transformational organizational leadership', scoreRange: [5.0, 5.0] },
      ],
      assessmentCriteria: [
        { method: 'self_assessment', weight: 0.15 },
        { method: 'manager_assessment', weight: 0.35 },
        { method: '360_feedback', weight: 0.3 },
        { method: 'peer_review', weight: 0.2 },
      ],
      defaultWeight: 0.8,
    },
  });

  const behavioralSkillCat = await prisma.skillCategory.create({
    data: {
      tenantId: tenant.id,
      name: 'Behavioral Competencies',
      description: 'Communication, collaboration, and professional behavior competencies',
      categoryType: 'BEHAVIORAL',
      competencyFramework: {
        name: 'Behavioral Competency Framework',
        version: '1.0',
        levels: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'],
      },
      levelDefinitions: [
        { level: 'BEGINNER', description: 'Developing professional behaviors', scoreRange: [1.0, 2.5] },
        { level: 'INTERMEDIATE', description: 'Consistent professional conduct', scoreRange: [2.5, 4.0] },
        { level: 'ADVANCED', description: 'Role model for professional excellence', scoreRange: [4.0, 5.0] },
        { level: 'EXPERT', description: 'Culture shaper and organizational influencer', scoreRange: [5.0, 5.0] },
      ],
      assessmentCriteria: [
        { method: 'self_assessment', weight: 0.2 },
        { method: 'manager_assessment', weight: 0.3 },
        { method: 'peer_review', weight: 0.3 },
        { method: 'behavioral_observation', weight: 0.2 },
      ],
      defaultWeight: 0.7,
    },
  });

  console.log('✅ Created skill categories:', technicalSkillCat.name, leadershipSkillCat.name, behavioralSkillCat.name);

  // Technical Skill Assessments for Danish (high scores — HR Manager)
  const danishSkillAssessments = [
    { skillName: 'People Analytics & HRIS', skillLevel: 'EXPERT', finalScore: 4.85, selfAssessment: 4.7, managerAssessment: 4.9, categoryId: technicalSkillCat.id },
    { skillName: 'Performance Management Systems', skillLevel: 'EXPERT', finalScore: 4.90, selfAssessment: 4.8, managerAssessment: 5.0, categoryId: technicalSkillCat.id },
    { skillName: 'Compensation & Benefits Analysis', skillLevel: 'ADVANCED', finalScore: 4.50, selfAssessment: 4.3, managerAssessment: 4.7, categoryId: technicalSkillCat.id },
    { skillName: 'Strategic HR Leadership', skillLevel: 'EXPERT', finalScore: 4.80, selfAssessment: 4.6, managerAssessment: 4.9, categoryId: leadershipSkillCat.id },
    { skillName: 'Team Development & Coaching', skillLevel: 'ADVANCED', finalScore: 4.60, selfAssessment: 4.5, managerAssessment: 4.7, categoryId: leadershipSkillCat.id },
    { skillName: 'Cross-functional Communication', skillLevel: 'EXPERT', finalScore: 4.95, selfAssessment: 4.8, managerAssessment: 5.0, categoryId: behavioralSkillCat.id },
    { skillName: 'Conflict Resolution', skillLevel: 'ADVANCED', finalScore: 4.55, selfAssessment: 4.4, managerAssessment: 4.7, categoryId: behavioralSkillCat.id },
  ];

  for (const skill of danishSkillAssessments) {
    await prisma.technicalSkillAssessment.create({
      data: {
        tenantId: tenant.id,
        userId: danishUser.id,
        skillCategoryId: skill.categoryId,
        skillName: skill.skillName,
        skillLevel: skill.skillLevel,
        selfAssessment: skill.selfAssessment,
        managerAssessment: skill.managerAssessment,
        finalScore: skill.finalScore,
        confidence: 0.92,
        scoreWeights: { selfAssessment: 0.2, managerAssessment: 0.3, projectBased: 0.3, peerReview: 0.2 },
        lastAssessedAt: new Date(),
      },
    });
  }

  // Technical Skill Assessments for Preethi (Team Lead)
  const preethiSkillAssessments = [
    { skillName: 'Backend Development (Node.js)', skillLevel: 'ADVANCED', finalScore: 4.30, selfAssessment: 4.2, managerAssessment: 4.4, categoryId: technicalSkillCat.id },
    { skillName: 'System Architecture & Design', skillLevel: 'ADVANCED', finalScore: 4.10, selfAssessment: 4.0, managerAssessment: 4.2, categoryId: technicalSkillCat.id },
    { skillName: 'Database Design (PostgreSQL)', skillLevel: 'INTERMEDIATE', finalScore: 3.80, selfAssessment: 3.7, managerAssessment: 3.9, categoryId: technicalSkillCat.id },
    { skillName: 'Team Leadership', skillLevel: 'ADVANCED', finalScore: 4.20, selfAssessment: 4.0, managerAssessment: 4.4, categoryId: leadershipSkillCat.id },
    { skillName: 'Technical Communication', skillLevel: 'ADVANCED', finalScore: 4.00, selfAssessment: 3.9, managerAssessment: 4.1, categoryId: behavioralSkillCat.id },
  ];

  for (const skill of preethiSkillAssessments) {
    await prisma.technicalSkillAssessment.create({
      data: {
        tenantId: tenant.id,
        userId: preethiUser.id,
        skillCategoryId: skill.categoryId,
        skillName: skill.skillName,
        skillLevel: skill.skillLevel,
        selfAssessment: skill.selfAssessment,
        managerAssessment: skill.managerAssessment,
        finalScore: skill.finalScore,
        confidence: 0.88,
        scoreWeights: { selfAssessment: 0.2, managerAssessment: 0.3, projectBased: 0.3, peerReview: 0.2 },
        lastAssessedAt: new Date(),
      },
    });
  }

  // Technical Skill Assessments for Sanjay (Software Engineer)
  const sanjaySkillAssessments = [
    { skillName: 'React & Frontend Development', skillLevel: 'INTERMEDIATE', finalScore: 3.50, selfAssessment: 3.4, managerAssessment: 3.6, categoryId: technicalSkillCat.id },
    { skillName: 'TypeScript', skillLevel: 'INTERMEDIATE', finalScore: 3.60, selfAssessment: 3.5, managerAssessment: 3.7, categoryId: technicalSkillCat.id },
    { skillName: 'API Development', skillLevel: 'INTERMEDIATE', finalScore: 3.40, selfAssessment: 3.3, managerAssessment: 3.5, categoryId: technicalSkillCat.id },
    { skillName: 'Collaboration & Teamwork', skillLevel: 'INTERMEDIATE', finalScore: 3.70, selfAssessment: 3.6, managerAssessment: 3.8, categoryId: behavioralSkillCat.id },
  ];

  for (const skill of sanjaySkillAssessments) {
    await prisma.technicalSkillAssessment.create({
      data: {
        tenantId: tenant.id,
        userId: sanjayUser.id,
        skillCategoryId: skill.categoryId,
        skillName: skill.skillName,
        skillLevel: skill.skillLevel,
        selfAssessment: skill.selfAssessment,
        managerAssessment: skill.managerAssessment,
        finalScore: skill.finalScore,
        confidence: 0.85,
        scoreWeights: { selfAssessment: 0.2, managerAssessment: 0.3, projectBased: 0.3, peerReview: 0.2 },
        lastAssessedAt: new Date(),
      },
    });
  }

  // Technical Skill Assessments for Prasina (System Owner)
  const prasinaSkillAssessments = [
    { skillName: 'Organizational Strategy', skillLevel: 'EXPERT', finalScore: 4.90, selfAssessment: 4.8, managerAssessment: 5.0, categoryId: leadershipSkillCat.id },
    { skillName: 'Executive Leadership', skillLevel: 'EXPERT', finalScore: 4.95, selfAssessment: 4.9, managerAssessment: 5.0, categoryId: leadershipSkillCat.id },
    { skillName: 'Healthcare Systems Knowledge', skillLevel: 'EXPERT', finalScore: 4.80, selfAssessment: 4.7, managerAssessment: 4.9, categoryId: technicalSkillCat.id },
  ];

  for (const skill of prasinaSkillAssessments) {
    await prisma.technicalSkillAssessment.create({
      data: {
        tenantId: tenant.id,
        userId: prasinaUser.id,
        skillCategoryId: skill.categoryId,
        skillName: skill.skillName,
        skillLevel: skill.skillLevel,
        selfAssessment: skill.selfAssessment,
        managerAssessment: skill.managerAssessment,
        finalScore: skill.finalScore,
        confidence: 0.95,
        scoreWeights: { selfAssessment: 0.2, managerAssessment: 0.3, projectBased: 0.3, peerReview: 0.2 },
        lastAssessedAt: new Date(),
      },
    });
  }

  console.log('✅ Created technical skill assessments (7 Danish + 5 Preethi + 4 Sanjay + 3 Prasina)');

  // ==========================================================================
  // GOALS FOR DANISH — High progress to dominate leaderboard
  // ==========================================================================

  // Clean up Danish-specific data for idempotent re-seeding
  await prisma.goal.deleteMany({ where: { tenantId: tenant.id, ownerId: danishUser.id } });
  await prisma.review.deleteMany({ where: { tenantId: tenant.id, revieweeId: danishUser.id } });
  await prisma.feedback.deleteMany({ where: { tenantId: tenant.id, toUserId: danishUser.id } });
  await prisma.developmentPlan.deleteMany({ where: { tenantId: tenant.id, userId: danishUser.id } });
  await prisma.developmentPlan.deleteMany({ where: { tenantId: tenant.id, userId: preethiUser.id } });
  await prisma.developmentPlan.deleteMany({ where: { tenantId: tenant.id, userId: sanjayUser.id } });

  const danishGoal1 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      ownerId: danishUser.id,
      createdById: danishUser.id,
      parentGoalId: companyGoal.id,
      type: 'INDIVIDUAL',
      title: 'Implement Enterprise Performance Management Framework',
      description: 'Design and deploy a comprehensive performance management framework including review cycles, calibration workflows, and 360-degree feedback mechanisms',
      status: 'COMPLETED',
      priority: 'CRITICAL',
      progress: 100,
      targetValue: 100,
      currentValue: 100,
      unit: 'percent',
      startDate: new Date('2024-01-15'),
      dueDate: new Date('2024-06-30'),
      completedAt: new Date('2024-06-25'),
      weight: 1.5,
      tags: ['performance-management', 'framework', 'strategic'],
    },
  });

  const danishGoal2 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      ownerId: danishUser.id,
      createdById: danishUser.id,
      parentGoalId: companyGoal.id,
      type: 'INDIVIDUAL',
      title: 'Launch Employee Engagement & Retention Program',
      description: 'Create and execute an organization-wide employee engagement initiative targeting 90%+ satisfaction scores and reducing turnover by 25%',
      status: 'COMPLETED',
      priority: 'CRITICAL',
      progress: 100,
      targetValue: 100,
      currentValue: 100,
      unit: 'percent',
      startDate: new Date('2024-02-01'),
      dueDate: new Date('2024-08-31'),
      completedAt: new Date('2024-08-15'),
      weight: 1.3,
      tags: ['engagement', 'retention', 'culture'],
    },
  });

  const danishGoal3 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      ownerId: danishUser.id,
      createdById: danishUser.id,
      type: 'INDIVIDUAL',
      title: 'Build People Analytics Dashboard & Reporting Suite',
      description: 'Develop real-time HR analytics dashboards with predictive workforce planning, attrition risk modeling, and automated compliance reporting',
      status: 'ACTIVE',
      priority: 'HIGH',
      progress: 95,
      targetValue: 100,
      currentValue: 95,
      unit: 'percent',
      startDate: new Date('2024-03-01'),
      dueDate: new Date('2024-12-31'),
      weight: 1.2,
      tags: ['analytics', 'dashboard', 'data-driven'],
    },
  });

  const danishGoal4 = await prisma.goal.create({
    data: {
      tenantId: tenant.id,
      ownerId: danishUser.id,
      createdById: danishUser.id,
      type: 'INDIVIDUAL',
      title: 'Design Career Pathways & Succession Planning System',
      description: 'Create structured career paths for all departments with competency matrices, development milestones, and automated succession planning workflows',
      status: 'ACTIVE',
      priority: 'HIGH',
      progress: 92,
      targetValue: 100,
      currentValue: 92,
      unit: 'percent',
      startDate: new Date('2024-04-01'),
      dueDate: new Date('2024-12-31'),
      weight: 1.1,
      tags: ['career-paths', 'succession', 'development'],
    },
  });

  console.log('✅ Created goals for Danish (4 goals: 2 completed at 100%, 2 active at 92-95%)');

  // ==========================================================================
  // REVIEWS FOR DANISH — High ratings (4.8-5.0)
  // ==========================================================================

  const danishManagerReview = await prisma.review.create({
    data: {
      tenantId: tenant.id,
      revieweeId: danishUser.id,
      reviewerId: prasinaUser.id,
      cycleId: reviewCycle.id,
      type: 'MANAGER',
      status: 'FINALIZED',
      overallRating: 4.9,
      calibratedRating: 4.85,
      summary: 'Danish has been an exceptional HR Manager this year. His implementation of the performance management framework was flawless and ahead of schedule. His analytical approach to people operations has transformed our HR function from reactive to predictive. Outstanding leadership in driving organizational change.',
      strengths: [
        'Exceptional strategic thinking and execution',
        'Outstanding people analytics capabilities',
        'Superior cross-functional communication',
        'Innovative approach to HR technology adoption',
        'Excellent stakeholder management',
      ],
      areasForGrowth: ['Delegation of operational tasks', 'Work-life balance optimization'],
      content: {
        recommendations: 'Strongly recommended for promotion to Senior HR Manager. Ready for expanded organizational scope.',
        keyAchievements: [
          'Launched performance management framework 2 weeks ahead of schedule',
          'Achieved 94% employee engagement score (up from 78%)',
          'Reduced voluntary turnover by 28%',
          'Implemented people analytics dashboard used by all managers',
        ],
      },
      submittedAt: new Date('2024-11-28'),
      calibratedAt: new Date('2024-12-05'),
      finalizedAt: new Date('2024-12-10'),
    },
  });

  await prisma.review.create({
    data: {
      tenantId: tenant.id,
      revieweeId: danishUser.id,
      reviewerId: danishUser.id,
      cycleId: reviewCycle.id,
      type: 'SELF',
      status: 'SUBMITTED',
      overallRating: 4.7,
      summary: 'This year I focused on transforming our HR operations through data-driven decision making and building scalable performance management processes. I am proud of the frameworks we built and the measurable impact on employee engagement and retention.',
      strengths: [
        'Data-driven HR strategy',
        'Performance management system design',
        'Cross-team collaboration',
        'Process automation and efficiency',
      ],
      areasForGrowth: ['Need to delegate more operational tasks', 'Should invest more time in personal development'],
      content: {
        selfReflection: 'I believe I have significantly exceeded my goals this year. The performance management framework and engagement program have both delivered measurable results above targets.',
      },
      submittedAt: new Date('2024-11-12'),
    },
  });

  await prisma.review.create({
    data: {
      tenantId: tenant.id,
      revieweeId: danishUser.id,
      reviewerId: preethiUser.id,
      cycleId: reviewCycle.id,
      type: 'PEER',
      status: 'SUBMITTED',
      overallRating: 4.8,
      summary: 'Working with Danish on cross-functional projects has been outstanding. His ability to translate HR strategy into actionable engineering-friendly processes is remarkable. He proactively reaches out to understand team dynamics and always follows through.',
      strengths: [
        'Excellent cross-functional collaboration',
        'Proactive communication',
        'Data-driven approach to people challenges',
        'Always available for consultation',
      ],
      areasForGrowth: ['Could share more context on HR strategy changes earlier'],
      content: {
        peerFeedback: 'Danish is one of the most effective HR professionals I have worked with. His understanding of engineering workflows makes his HR solutions practical and impactful.',
      },
      submittedAt: new Date('2024-11-20'),
    },
  });

  console.log('✅ Created reviews for Danish (manager: 4.9, self: 4.7, peer: 4.8)');

  // ==========================================================================
  // POSITIVE FEEDBACK FOR DANISH — High sentiment scores
  // ==========================================================================

  await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      fromUserId: prasinaUser.id,
      toUserId: danishUser.id,
      type: 'PRAISE',
      visibility: 'PUBLIC',
      content: 'Danish led the performance management framework rollout with exceptional skill. The system he designed has fundamentally improved how we evaluate and develop our people. His attention to detail and stakeholder management were outstanding throughout the project.',
      sentiment: 'POSITIVE',
      sentimentScore: 0.98,
      tags: ['leadership', 'innovation', 'execution'],
      skillTags: ['performance-management', 'project-management', 'stakeholder-management'],
    },
  });

  await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      fromUserId: preethiUser.id,
      toUserId: danishUser.id,
      type: 'RECOGNITION',
      visibility: 'PUBLIC',
      content: 'Huge thanks to Danish for building the people analytics dashboard. The data insights have helped our engineering team make better decisions about workload distribution and team composition. A truly cross-functional impact.',
      sentiment: 'POSITIVE',
      sentimentScore: 0.96,
      tags: ['collaboration', 'analytics', 'impact'],
      skillTags: ['people-analytics', 'cross-functional-collaboration'],
    },
  });

  await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      fromUserId: sanjayUser.id,
      toUserId: danishUser.id,
      type: 'PRAISE',
      visibility: 'PUBLIC',
      content: 'Danish organized an incredible career development workshop that gave me clarity on my growth path. His mentoring approach is supportive and actionable. He took time to understand each team member individually.',
      sentiment: 'POSITIVE',
      sentimentScore: 0.95,
      tags: ['mentoring', 'development', 'support'],
      skillTags: ['career-development', 'coaching', 'empathy'],
    },
  });

  await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      fromUserId: prasinaUser.id,
      toUserId: danishUser.id,
      type: 'RECOGNITION',
      visibility: 'PUBLIC',
      content: 'The employee engagement program Danish launched achieved a 94% satisfaction score, far exceeding our 85% target. His strategic approach to culture building and data-driven interventions have set a new standard for our HR function.',
      sentiment: 'POSITIVE',
      sentimentScore: 0.97,
      tags: ['engagement', 'culture', 'exceeding-targets'],
      skillTags: ['employee-engagement', 'strategic-hr', 'program-management'],
    },
  });

  await prisma.feedback.create({
    data: {
      tenantId: tenant.id,
      fromUserId: preethiUser.id,
      toUserId: danishUser.id,
      type: 'PRAISE',
      visibility: 'MANAGER_VISIBLE',
      content: 'Danish has been instrumental in resolving a complex inter-team conflict. His mediation skills and empathetic approach brought both teams to a productive resolution within a single session.',
      sentiment: 'POSITIVE',
      sentimentScore: 0.95,
      tags: ['conflict-resolution', 'mediation', 'empathy'],
      skillTags: ['conflict-resolution', 'interpersonal-skills'],
    },
  });

  console.log('✅ Created positive feedback for Danish (5 records, sentiment 0.95-0.98)');

  // ==========================================================================
  // DEVELOPMENT PLANS FOR DANISH — Career growth focused
  // ==========================================================================

  await prisma.developmentPlan.create({
    data: {
      tenantId: tenant.id,
      userId: danishUser.id,
      planName: 'Senior HR Manager Advancement Plan',
      planType: 'CAREER_GROWTH',
      duration: 12,
      startDate: new Date('2024-01-01'),
      targetCompletionDate: new Date('2024-12-31'),
      careerGoal: 'Advance to Senior HR Manager role with expanded organizational scope, leading people strategy across all business units',
      targetRole: 'Senior HR Manager',
      targetLevel: 'Level 4 - Senior Management',
      careerPath: [
        { milestone: 'Complete SHRM-SCP certification', targetDate: '2024-03-31', status: 'COMPLETED' },
        { milestone: 'Lead cross-functional HR transformation project', targetDate: '2024-06-30', status: 'COMPLETED' },
        { milestone: 'Implement enterprise-wide people analytics', targetDate: '2024-09-30', status: 'COMPLETED' },
        { milestone: 'Demonstrate strategic business partnership', targetDate: '2024-12-31', status: 'IN_PROGRESS' },
      ],
      currentLevel: 'Level 3 - Management',
      strengthsAssessed: ['Strategic HR leadership', 'People analytics', 'Performance management', 'Cross-functional communication', 'Change management'],
      developmentAreas: ['Executive presence', 'Board-level reporting', 'Global HR operations'],
      skillGapAnalysis: {
        'Executive Presence': { current: 3.5, target: 4.5, gap: 1.0, priority: 'HIGH' },
        'Board Reporting': { current: 2.5, target: 4.0, gap: 1.5, priority: 'MEDIUM' },
        'Global HR': { current: 2.0, target: 3.5, gap: 1.5, priority: 'LOW' },
      },
      competencyGaps: {
        leadership: { current: 4, target: 5, gap: 1 },
        communication: { current: 4, target: 5, gap: 1 },
        strategic_thinking: { current: 4, target: 5, gap: 1 },
      },
      activities: [
        { name: 'SHRM-SCP Certification', type: 'CERTIFICATION', status: 'COMPLETED', completedDate: '2024-03-15' },
        { name: 'Executive Leadership Workshop', type: 'TRAINING', status: 'COMPLETED', completedDate: '2024-05-20' },
        { name: 'Cross-functional Project Leadership', type: 'PROJECT', status: 'COMPLETED', completedDate: '2024-06-25' },
        { name: 'People Analytics Advanced Course', type: 'COURSE', status: 'COMPLETED', completedDate: '2024-08-10' },
        { name: 'Strategic HR Business Partnership Masterclass', type: 'TRAINING', status: 'IN_PROGRESS', dueDate: '2024-12-15' },
        { name: 'Executive Coaching Sessions', type: 'COACHING', status: 'IN_PROGRESS', dueDate: '2024-12-31' },
      ],
      totalActivities: 6,
      completedActivities: 4,
      targetSkills: [
        { skill: 'Executive Presence', targetLevel: 'ADVANCED', currentLevel: 'INTERMEDIATE' },
        { skill: 'Board-Level Reporting', targetLevel: 'ADVANCED', currentLevel: 'BEGINNER' },
        { skill: 'Global HR Strategy', targetLevel: 'INTERMEDIATE', currentLevel: 'BEGINNER' },
      ],
      targetCompetencies: [
        { competency: 'Strategic Leadership', targetLevel: 5, currentLevel: 4 },
        { competency: 'Organizational Design', targetLevel: 4, currentLevel: 3 },
      ],
      certifications: ['SHRM-SCP', 'PHR'],
      learningResources: [
        { title: 'SHRM-SCP Study Guide', type: 'book', url: 'https://www.shrm.org' },
        { title: 'People Analytics Specialization', type: 'course', provider: 'Coursera' },
        { title: 'Executive Leadership Program', type: 'program', provider: 'Harvard Business School Online' },
      ],
      mentorAssigned: prasinaUser.id,
      budget: 5000,
      budgetSpent: 3200,
      progressPercentage: 88.0,
      milestones: [
        { name: 'SHRM-SCP Certified', status: 'ACHIEVED', achievedDate: '2024-03-15' },
        { name: 'HR Framework Launched', status: 'ACHIEVED', achievedDate: '2024-06-25' },
        { name: 'People Analytics Live', status: 'ACHIEVED', achievedDate: '2024-09-15' },
        { name: 'Promotion Ready', status: 'IN_PROGRESS', targetDate: '2024-12-31' },
      ],
      milestonesAchieved: 3,
      evaluationCriteria: {
        performanceRating: { weight: 0.3, target: 4.5 },
        goalCompletion: { weight: 0.3, target: 90 },
        skillDevelopment: { weight: 0.2, target: 80 },
        stakeholderFeedback: { weight: 0.2, target: 4.0 },
      },
      successMetrics: [
        { metric: 'Performance Rating', target: 4.5, current: 4.9, status: 'EXCEEDED' },
        { metric: 'Goal Completion Rate', target: 90, current: 97, status: 'EXCEEDED' },
        { metric: 'Skill Assessment Average', target: 4.0, current: 4.74, status: 'EXCEEDED' },
        { metric: 'Stakeholder Satisfaction', target: 4.0, current: 4.6, status: 'EXCEEDED' },
      ],
      status: 'ACTIVE',
      approvedBy: prasinaUser.id,
      approvedAt: new Date('2024-01-10'),
      generatedBy: 'HYBRID',
      confidence: 0.92,
      notes: 'Danish is on an accelerated growth path. All milestones either on track or completed ahead of schedule.',
      managerNotes: 'Exceptional progress. Recommend for promotion in the next review cycle.',
    },
  });

  await prisma.developmentPlan.create({
    data: {
      tenantId: tenant.id,
      userId: danishUser.id,
      planName: 'People Analytics Mastery Plan',
      planType: 'SKILL_DEVELOPMENT',
      duration: 6,
      startDate: new Date('2024-03-01'),
      targetCompletionDate: new Date('2024-08-31'),
      careerGoal: 'Become an expert-level practitioner in people analytics, predictive workforce modeling, and data-driven HR decision making',
      targetRole: 'Senior HR Manager (Analytics Focus)',
      targetLevel: 'Expert',
      careerPath: [
        { milestone: 'Complete People Analytics certification', targetDate: '2024-04-30', status: 'COMPLETED' },
        { milestone: 'Build predictive attrition model', targetDate: '2024-06-15', status: 'COMPLETED' },
        { milestone: 'Launch real-time HR dashboard', targetDate: '2024-08-31', status: 'COMPLETED' },
      ],
      currentLevel: 'Advanced',
      strengthsAssessed: ['Data visualization', 'Statistical analysis', 'HR domain knowledge'],
      developmentAreas: ['Machine learning applications in HR', 'Advanced predictive modeling'],
      skillGapAnalysis: {
        'Machine Learning for HR': { current: 2.5, target: 4.0, gap: 1.5, priority: 'HIGH' },
        'Predictive Modeling': { current: 3.0, target: 4.5, gap: 1.5, priority: 'HIGH' },
      },
      competencyGaps: {
        analytics: { current: 4, target: 5, gap: 1 },
        data_engineering: { current: 3, target: 4, gap: 1 },
      },
      activities: [
        { name: 'People Analytics Certificate (Wharton)', type: 'CERTIFICATION', status: 'COMPLETED', completedDate: '2024-04-20' },
        { name: 'Python for HR Analytics', type: 'COURSE', status: 'COMPLETED', completedDate: '2024-05-15' },
        { name: 'Build Attrition Prediction Model', type: 'PROJECT', status: 'COMPLETED', completedDate: '2024-06-10' },
        { name: 'HR Dashboard Development', type: 'PROJECT', status: 'COMPLETED', completedDate: '2024-08-20' },
      ],
      totalActivities: 4,
      completedActivities: 4,
      targetSkills: [
        { skill: 'Predictive Workforce Modeling', targetLevel: 'EXPERT', currentLevel: 'ADVANCED' },
        { skill: 'HR Data Visualization', targetLevel: 'EXPERT', currentLevel: 'EXPERT' },
      ],
      targetCompetencies: [
        { competency: 'Data Analytics', targetLevel: 5, currentLevel: 4 },
      ],
      certifications: ['People Analytics Certificate (Wharton)'],
      learningResources: [
        { title: 'People Analytics for HR', type: 'course', provider: 'Wharton Online' },
        { title: 'Python for Data Analysis', type: 'book', author: 'Wes McKinney' },
      ],
      mentorAssigned: prasinaUser.id,
      budget: 2500,
      budgetSpent: 2500,
      progressPercentage: 100.0,
      milestones: [
        { name: 'Analytics Certification', status: 'ACHIEVED', achievedDate: '2024-04-20' },
        { name: 'Prediction Model Live', status: 'ACHIEVED', achievedDate: '2024-06-10' },
        { name: 'Dashboard Launched', status: 'ACHIEVED', achievedDate: '2024-08-20' },
      ],
      milestonesAchieved: 3,
      evaluationCriteria: {
        certificationObtained: { weight: 0.3, target: true },
        projectDelivery: { weight: 0.4, target: 100 },
        skillImprovement: { weight: 0.3, target: 4.0 },
      },
      successMetrics: [
        { metric: 'Certification', target: 1, current: 1, status: 'ACHIEVED' },
        { metric: 'Projects Delivered', target: 2, current: 2, status: 'ACHIEVED' },
        { metric: 'Analytics Skill Score', target: 4.0, current: 4.85, status: 'EXCEEDED' },
      ],
      status: 'COMPLETED',
      approvedBy: prasinaUser.id,
      approvedAt: new Date('2024-03-05'),
      completedAt: new Date('2024-08-25'),
      generatedBy: 'AI',
      confidence: 0.95,
      notes: 'Completed all activities ahead of schedule. Analytics capabilities now at expert level.',
      managerNotes: 'Exceptional dedication to skill development. The analytics dashboard has been a game-changer for our HR operations.',
    },
  });

  // Development Plan for Preethi
  await prisma.developmentPlan.create({
    data: {
      tenantId: tenant.id,
      userId: preethiUser.id,
      planName: 'Engineering Manager Transition Plan',
      planType: 'CAREER_GROWTH',
      duration: 18,
      startDate: new Date('2024-01-01'),
      targetCompletionDate: new Date('2025-06-30'),
      careerGoal: 'Transition from Team Lead to Engineering Manager with expanded scope covering multiple engineering teams',
      targetRole: 'Engineering Manager',
      targetLevel: 'Level 2 - Manager',
      careerPath: [
        { milestone: 'Complete management training program', targetDate: '2024-06-30', status: 'COMPLETED' },
        { milestone: 'Lead cross-team initiative', targetDate: '2024-12-31', status: 'IN_PROGRESS' },
        { milestone: 'Demonstrate budget and hiring capabilities', targetDate: '2025-06-30', status: 'NOT_STARTED' },
      ],
      currentLevel: 'Level 1 - Team Lead',
      strengthsAssessed: ['Technical expertise', 'Team coordination', 'Problem solving'],
      developmentAreas: ['Hiring and interviewing', 'Budget management', 'Strategic planning'],
      skillGapAnalysis: {
        'Hiring & Interviewing': { current: 2.0, target: 4.0, gap: 2.0, priority: 'HIGH' },
        'Budget Management': { current: 1.5, target: 3.5, gap: 2.0, priority: 'MEDIUM' },
        'Strategic Planning': { current: 2.5, target: 4.0, gap: 1.5, priority: 'HIGH' },
      },
      competencyGaps: {
        leadership: { current: 3, target: 4, gap: 1 },
        strategic_thinking: { current: 2, target: 4, gap: 2 },
      },
      activities: [
        { name: 'Engineering Leadership Course', type: 'COURSE', status: 'COMPLETED', completedDate: '2024-04-15' },
        { name: 'Shadow Senior EM for 2 months', type: 'MENTORING', status: 'COMPLETED', completedDate: '2024-06-30' },
        { name: 'Lead Backend + Frontend cross-team project', type: 'PROJECT', status: 'IN_PROGRESS', dueDate: '2024-12-31' },
        { name: 'Interview Training Certification', type: 'CERTIFICATION', status: 'NOT_STARTED', dueDate: '2025-03-31' },
      ],
      totalActivities: 4,
      completedActivities: 2,
      targetSkills: [
        { skill: 'People Management', targetLevel: 'ADVANCED', currentLevel: 'INTERMEDIATE' },
        { skill: 'Strategic Planning', targetLevel: 'ADVANCED', currentLevel: 'BEGINNER' },
      ],
      targetCompetencies: [
        { competency: 'Leadership', targetLevel: 4, currentLevel: 3 },
        { competency: 'Strategic Thinking', targetLevel: 4, currentLevel: 2 },
      ],
      certifications: [],
      learningResources: [
        { title: 'The Manager Path', type: 'book', author: 'Camille Fournier' },
        { title: 'Engineering Management Fundamentals', type: 'course', provider: 'Pluralsight' },
      ],
      mentorAssigned: prasinaUser.id,
      budget: 3000,
      budgetSpent: 1200,
      progressPercentage: 55.0,
      milestones: [
        { name: 'Management Training Complete', status: 'ACHIEVED', achievedDate: '2024-06-30' },
        { name: 'Cross-Team Project Success', status: 'IN_PROGRESS', targetDate: '2024-12-31' },
        { name: 'Promotion Ready', status: 'NOT_STARTED', targetDate: '2025-06-30' },
      ],
      milestonesAchieved: 1,
      evaluationCriteria: {
        projectDelivery: { weight: 0.3, target: 100 },
        leadershipGrowth: { weight: 0.4, target: 4.0 },
        teamFeedback: { weight: 0.3, target: 4.0 },
      },
      successMetrics: [
        { metric: 'Leadership Score', target: 4.0, current: 3.2, status: 'IN_PROGRESS' },
        { metric: 'Team Satisfaction', target: 4.0, current: 3.8, status: 'IN_PROGRESS' },
      ],
      status: 'ACTIVE',
      approvedBy: prasinaUser.id,
      approvedAt: new Date('2024-01-15'),
      generatedBy: 'HYBRID',
      confidence: 0.78,
      notes: 'Good progress on management skills. Need to accelerate strategic planning development.',
      managerNotes: 'Preethi is making steady progress. Cross-team project will be a key milestone.',
    },
  });

  // Development Plan for Sanjay
  await prisma.developmentPlan.create({
    data: {
      tenantId: tenant.id,
      userId: sanjayUser.id,
      planName: 'Senior Software Engineer Growth Plan',
      planType: 'SKILL_DEVELOPMENT',
      duration: 12,
      startDate: new Date('2024-06-01'),
      targetCompletionDate: new Date('2025-05-31'),
      careerGoal: 'Grow from mid-level to Senior Software Engineer with expertise in system design and technical mentoring',
      targetRole: 'Senior Software Engineer',
      targetLevel: 'Level 3 - Senior',
      careerPath: [
        { milestone: 'Complete system design course', targetDate: '2024-09-30', status: 'COMPLETED' },
        { milestone: 'Lead a feature end-to-end', targetDate: '2025-01-31', status: 'IN_PROGRESS' },
        { milestone: 'Mentor a junior engineer', targetDate: '2025-05-31', status: 'NOT_STARTED' },
      ],
      currentLevel: 'Level 2 - Mid-Level',
      strengthsAssessed: ['Strong coding skills', 'Quick learner', 'Good team collaboration'],
      developmentAreas: ['System design', 'Technical writing', 'Mentoring skills'],
      skillGapAnalysis: {
        'System Design': { current: 2.5, target: 4.0, gap: 1.5, priority: 'HIGH' },
        'Technical Writing': { current: 2.0, target: 3.5, gap: 1.5, priority: 'MEDIUM' },
        'Mentoring': { current: 1.5, target: 3.0, gap: 1.5, priority: 'MEDIUM' },
      },
      competencyGaps: {
        technical: { current: 3, target: 4, gap: 1 },
        communication: { current: 2, target: 3, gap: 1 },
      },
      activities: [
        { name: 'System Design Fundamentals', type: 'COURSE', status: 'COMPLETED', completedDate: '2024-09-15' },
        { name: 'Build Review Module v2', type: 'PROJECT', status: 'IN_PROGRESS', dueDate: '2025-01-31' },
        { name: 'Technical Blog Writing', type: 'SELF_STUDY', status: 'NOT_STARTED', dueDate: '2025-03-31' },
        { name: 'Junior Engineer Mentoring', type: 'MENTORING', status: 'NOT_STARTED', dueDate: '2025-05-31' },
      ],
      totalActivities: 4,
      completedActivities: 1,
      targetSkills: [
        { skill: 'System Design', targetLevel: 'ADVANCED', currentLevel: 'INTERMEDIATE' },
        { skill: 'Technical Writing', targetLevel: 'INTERMEDIATE', currentLevel: 'BEGINNER' },
      ],
      targetCompetencies: [
        { competency: 'Technical Skills', targetLevel: 4, currentLevel: 3 },
        { competency: 'Communication', targetLevel: 3, currentLevel: 2 },
      ],
      certifications: [],
      learningResources: [
        { title: 'Designing Data-Intensive Applications', type: 'book', author: 'Martin Kleppmann' },
        { title: 'System Design Interview', type: 'course', provider: 'Educative' },
      ],
      mentorAssigned: preethiUser.id,
      budget: 1500,
      budgetSpent: 400,
      progressPercentage: 35.0,
      milestones: [
        { name: 'System Design Course Complete', status: 'ACHIEVED', achievedDate: '2024-09-15' },
        { name: 'Feature Lead Success', status: 'IN_PROGRESS', targetDate: '2025-01-31' },
        { name: 'Mentoring Started', status: 'NOT_STARTED', targetDate: '2025-05-31' },
      ],
      milestonesAchieved: 1,
      evaluationCriteria: {
        technicalGrowth: { weight: 0.4, target: 4.0 },
        projectDelivery: { weight: 0.3, target: 100 },
        communicationImprovement: { weight: 0.3, target: 3.0 },
      },
      successMetrics: [
        { metric: 'Technical Skill Score', target: 4.0, current: 3.5, status: 'IN_PROGRESS' },
        { metric: 'Feature Delivery', target: 1, current: 0, status: 'IN_PROGRESS' },
      ],
      status: 'ACTIVE',
      approvedBy: preethiUser.id,
      approvedAt: new Date('2024-06-05'),
      generatedBy: 'AI',
      confidence: 0.82,
      notes: 'System design foundations are solid. Need to start on feature leadership ASAP.',
      managerNotes: 'Sanjay is progressing well. The system design course improved his architecture thinking.',
    },
  });

  console.log('✅ Created development plans (2 Danish + 1 Preethi + 1 Sanjay)');

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log('\n========================================');
  console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!');
  console.log('========================================\n');
  console.log('🔐 RBAC Entity Credentials:');
  console.log('┌─────────────────────┬─────────────────────────────────────┬──────────┬──────────────────────────┐');
  console.log('│ Entity              │ Email                               │ Password │ Roles                    │');
  console.log('├─────────────────────┼─────────────────────────────────────┼──────────┼──────────────────────────┤');
  console.log('│ System Owner        │ prssanjana@gmail.com                │ demo@pms │ SUPER_ADMIN + HR_ADMIN   │');
  console.log('│ Process Lead        │ agdanishr@gmail.com                 │ demo@123 │ HR_ADMIN + EMPLOYEE      │');
  console.log('│ Evaluator           │ preethisivachandran0@gmail.com      │ demo@789 │ MANAGER + EMPLOYEE       │');
  console.log('│ Employee            │ sanjayn0369@gmail.com               │ demo@456 │ EMPLOYEE                 │');
  console.log('└─────────────────────┴─────────────────────────────────────┴──────────┴──────────────────────────┘');
  console.log('\n📊 Manager Hierarchy:');
  console.log('  Dr. Prasina (SUPER_ADMIN) — top');
  console.log('    ├── Danish (HR_ADMIN) — reports to Prasina');
  console.log('    └── Preethi (MANAGER) — reports to Prasina');
  console.log('          └── Sanjay (EMPLOYEE) — reports to Preethi\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
