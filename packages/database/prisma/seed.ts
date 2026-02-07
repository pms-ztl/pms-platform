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
