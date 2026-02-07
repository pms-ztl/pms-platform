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
          matrixOrg: true,
          delegation: true,
        },
        branding: {
          primaryColor: '#3B82F6',
        },
      },
      subscriptionTier: 'enterprise',
      maxUsers: 1000,
    },
  });

  console.log('Created tenant:', tenant.name);

  // Create Business Units
  const businessUnits = await Promise.all([
    prisma.businessUnit.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'TECH' } },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000001',
        tenantId: tenant.id,
        name: 'Technology',
        code: 'TECH',
        description: 'Technology and Engineering Business Unit',
      },
    }),
    prisma.businessUnit.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'OPS' } },
      update: {},
      create: {
        id: '00000000-0000-0000-0001-000000000002',
        tenantId: tenant.id,
        name: 'Operations',
        code: 'OPS',
        description: 'Business Operations',
      },
    }),
  ]);

  console.log('Created business units:', businessUnits.map(bu => bu.name).join(', '));

  // Create Cost Centers
  const costCenters = await Promise.all([
    prisma.costCenter.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CC-ENG' } },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000001',
        tenantId: tenant.id,
        code: 'CC-ENG',
        name: 'Engineering Cost Center',
        budget: 5000000,
        currency: 'USD',
      },
    }),
    prisma.costCenter.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'CC-HR' } },
      update: {},
      create: {
        id: '00000000-0000-0000-0002-000000000002',
        tenantId: tenant.id,
        code: 'CC-HR',
        name: 'HR Cost Center',
        budget: 1000000,
        currency: 'USD',
      },
    }),
  ]);

  console.log('Created cost centers:', costCenters.map(cc => cc.name).join(', '));

  // Create departments
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        tenantId: tenant.id,
        name: 'Engineering',
        code: 'ENG',
      },
    }),
    prisma.department.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        tenantId: tenant.id,
        name: 'Product',
        code: 'PROD',
      },
    }),
    prisma.department.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        tenantId: tenant.id,
        name: 'Human Resources',
        code: 'HR',
      },
    }),
    // Sub-department under Engineering
    prisma.department.upsert({
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        tenantId: tenant.id,
        name: 'Frontend Engineering',
        code: 'ENG-FE',
        parentId: '00000000-0000-0000-0000-000000000001',
      },
    }),
    prisma.department.upsert({
      where: { id: '00000000-0000-0000-0000-000000000005' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000005',
        tenantId: tenant.id,
        name: 'Backend Engineering',
        code: 'ENG-BE',
        parentId: '00000000-0000-0000-0000-000000000001',
      },
    }),
  ]);

  console.log('Created departments:', departments.map(d => d.name).join(', '));

  // Hash password
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'ADMIN' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'ADMIN',
      description: 'System Administrator',
      permissions: ['*:manage:all'],
      isSystem: true,
    },
  });

  const hrRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'HR_ADMIN' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'HR_ADMIN',
      description: 'HR Administrator',
      permissions: ['users:read:all', 'reviews:manage:all', 'calibration:manage:all'],
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'MANAGER' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'MANAGER',
      description: 'People Manager',
      permissions: ['goals:read:team', 'reviews:manage:team', 'feedback:read:team'],
      isSystem: true,
    },
  });

  const employeeRole = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: 'EMPLOYEE' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'EMPLOYEE',
      description: 'Standard Employee',
      permissions: ['goals:manage:own', 'reviews:read:own', 'feedback:create:all'],
      isSystem: true,
    },
  });

  console.log('Created roles: ADMIN, HR_ADMIN, MANAGER, EMPLOYEE');

  // Create admin user
  const adminUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'admin@demo.pms-platform.local' }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.pms-platform.local',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      departmentId: departments[2].id, // HR
      businessUnitId: businessUnits[1].id, // OPS
      costCenterId: costCenters[1].id, // HR Cost Center
      jobTitle: 'HR Director',
      level: 5,
    },
  });

  // Update HR department head
  await prisma.department.update({
    where: { id: departments[2].id },
    data: { headId: adminUser.id },
  });

  // Assign roles to admin
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: hrRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: hrRole.id },
  });

  console.log('Created admin user:', adminUser.email);

  // Create manager user
  const managerUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'manager@demo.pms-platform.local' }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'manager@demo.pms-platform.local',
      passwordHash: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Manager',
      departmentId: departments[0].id, // Engineering
      businessUnitId: businessUnits[0].id, // TECH
      costCenterId: costCenters[0].id, // Engineering Cost Center
      jobTitle: 'Engineering Manager',
      level: 4,
    },
  });

  // Update Engineering department head
  await prisma.department.update({
    where: { id: departments[0].id },
    data: { headId: managerUser.id },
  });

  // Assign role to manager
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: managerUser.id, roleId: managerRole.id } },
    update: {},
    create: { userId: managerUser.id, roleId: managerRole.id },
  });

  console.log('Created manager user:', managerUser.email);

  // Create employee user
  const employeeUser = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'employee@demo.pms-platform.local' }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'employee@demo.pms-platform.local',
      passwordHash: hashedPassword,
      firstName: 'John',
      lastName: 'Developer',
      departmentId: departments[3].id, // Frontend Engineering
      businessUnitId: businessUnits[0].id, // TECH
      costCenterId: costCenters[0].id, // Engineering Cost Center
      jobTitle: 'Software Engineer',
      level: 2,
      managerId: managerUser.id,
    },
  });

  // Assign role to employee
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: employeeUser.id, roleId: employeeRole.id } },
    update: {},
    create: { userId: employeeUser.id, roleId: employeeRole.id },
  });

  console.log('Created employee user:', employeeUser.email);

  // Create a second employee for team/matrix testing
  const employee2User = await prisma.user.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'jane@demo.pms-platform.local' }
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'jane@demo.pms-platform.local',
      passwordHash: hashedPassword,
      firstName: 'Jane',
      lastName: 'Backend',
      departmentId: departments[4].id, // Backend Engineering
      businessUnitId: businessUnits[0].id, // TECH
      costCenterId: costCenters[0].id, // Engineering Cost Center
      jobTitle: 'Backend Engineer',
      level: 2,
      managerId: managerUser.id,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: employee2User.id, roleId: employeeRole.id } },
    update: {},
    create: { userId: employee2User.id, roleId: employeeRole.id },
  });

  console.log('Created second employee:', employee2User.email);

  // Create Teams
  const teams = await Promise.all([
    prisma.team.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'PLATFORM' } },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000001',
        tenantId: tenant.id,
        name: 'Platform Team',
        code: 'PLATFORM',
        type: 'FUNCTIONAL',
        departmentId: departments[0].id,
        businessUnitId: businessUnits[0].id,
        leadId: managerUser.id,
        description: 'Core platform development team',
      },
    }),
    prisma.team.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'PROJECT-X' } },
      update: {},
      create: {
        id: '00000000-0000-0000-0003-000000000002',
        tenantId: tenant.id,
        name: 'Project X',
        code: 'PROJECT-X',
        type: 'CROSS_FUNCTIONAL',
        leadId: managerUser.id,
        description: 'Cross-functional project team',
      },
    }),
  ]);

  console.log('Created teams:', teams.map(t => t.name).join(', '));

  // Add team members
  await Promise.all([
    prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: teams[0].id, userId: managerUser.id } },
      update: {},
      create: {
        teamId: teams[0].id,
        userId: managerUser.id,
        role: 'LEAD',
        allocation: 50,
        isPrimary: true,
      },
    }),
    prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: teams[0].id, userId: employeeUser.id } },
      update: {},
      create: {
        teamId: teams[0].id,
        userId: employeeUser.id,
        role: 'MEMBER',
        allocation: 100,
        isPrimary: true,
      },
    }),
    prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: teams[0].id, userId: employee2User.id } },
      update: {},
      create: {
        teamId: teams[0].id,
        userId: employee2User.id,
        role: 'MEMBER',
        allocation: 80,
        isPrimary: true,
      },
    }),
    // Cross-functional team members
    prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: teams[1].id, userId: employeeUser.id } },
      update: {},
      create: {
        teamId: teams[1].id,
        userId: employeeUser.id,
        role: 'CONTRIBUTOR',
        allocation: 20,
        isPrimary: false,
      },
    }),
  ]);

  console.log('Added team members');

  // Create Matrix Reporting Line (dotted line)
  await prisma.reportingLine.upsert({
    where: {
      reporterId_managerId_type: {
        reporterId: employeeUser.id,
        managerId: adminUser.id,
        type: 'DOTTED',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      reporterId: employeeUser.id,
      managerId: adminUser.id,
      type: 'DOTTED',
      weight: 0.3,
      isPrimary: false,
      notes: 'HR oversight for compliance projects',
    },
  });

  console.log('Created matrix reporting line');

  // Create a sample goal
  const goal = await prisma.goal.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      tenantId: tenant.id,
      ownerId: employeeUser.id,
      createdById: employeeUser.id,
      teamId: teams[0].id,
      title: 'Complete Performance Management System',
      description: 'Design and implement the core PMS features',
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      priority: 'HIGH',
      progress: 75,
      startDate: new Date('2024-01-01'),
      dueDate: new Date('2024-12-31'),
      tags: ['development', 'feature'],
    },
  });

  console.log('Created sample goal:', goal.title);

  // Create team goal
  const teamGoal = await prisma.goal.upsert({
    where: { id: '00000000-0000-0000-0000-000000000011' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000011',
      tenantId: tenant.id,
      ownerId: managerUser.id,
      createdById: managerUser.id,
      teamId: teams[0].id,
      title: 'Q1 Platform Team Delivery',
      description: 'Deliver all Q1 platform features on time',
      type: 'TEAM',
      status: 'ACTIVE',
      priority: 'HIGH',
      progress: 60,
      startDate: new Date('2024-01-01'),
      dueDate: new Date('2024-03-31'),
      tags: ['team', 'delivery'],
    },
  });

  console.log('Created team goal:', teamGoal.title);

  // Create sample access policy
  await prisma.accessPolicy.upsert({
    where: { id: '00000000-0000-0000-0004-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0004-000000000001',
      tenantId: tenant.id,
      name: 'Manager Review Access',
      description: 'Managers can view and manage reviews for their team',
      type: 'ACCESS',
      status: 'ACTIVE',
      priority: 100,
      conditions: {
        scope: 'team',
        relationship: 'manages',
      },
      actions: {
        resources: ['reviews'],
        actions: ['read', 'update', 'create'],
      },
      effect: 'ALLOW',
      targetRoles: ['MANAGER'],
      createdById: adminUser.id,
    },
  });

  console.log('Created sample access policy');

  // Create Competencies
  const competencies = await Promise.all([
    prisma.competency.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'LEADERSHIP' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Leadership',
        code: 'LEADERSHIP',
        category: 'CORE',
        description: 'Ability to lead and inspire teams',
        level: 'ADVANCED',
      },
    }),
    prisma.competency.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'COMMUNICATION' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Communication',
        code: 'COMMUNICATION',
        category: 'CORE',
        description: 'Effective communication skills',
        level: 'INTERMEDIATE',
      },
    }),
    prisma.competency.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: 'TECHNICAL' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Technical Skills',
        code: 'TECHNICAL',
        category: 'TECHNICAL',
        description: 'Technical proficiency and expertise',
        level: 'ADVANCED',
      },
    }),
  ]);

  console.log('Created competencies:', competencies.map(c => c.name).join(', '));

  // Create Review Cycle
  const reviewCycle = await prisma.reviewCycle.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: '2024 Annual Review' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '2024 Annual Review',
      type: 'ANNUAL',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'ACTIVE',
    },
  });

  console.log('Created review cycle:', reviewCycle.name);

  // Create Performance Reviews
  const review = await prisma.performanceReview.upsert({
    where: { id: '00000000-0000-0000-0005-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0005-000000000001',
      tenantId: tenant.id,
      revieweeId: employeeUser.id,
      reviewerId: managerUser.id,
      cycleId: reviewCycle.id,
      type: 'ANNUAL',
      status: 'IN_PROGRESS',
      overallRating: 4,
      strengths: ['Strong technical skills', 'Great team collaboration'],
      areasForImprovement: ['Time management', 'Documentation'],
      recommendations: 'Ready for senior level promotion',
    },
  });

  console.log('Created performance review for:', employeeUser.firstName);

  // Create Feedback Records
  await Promise.all([
    prisma.feedback.upsert({
      where: { id: '00000000-0000-0000-0006-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0006-000000000001',
        tenantId: tenant.id,
        giverId: managerUser.id,
        receiverId: employeeUser.id,
        type: 'POSITIVE',
        visibility: 'PRIVATE',
        content: 'Excellent work on the performance module implementation!',
        sentiment: 'POSITIVE',
        rating: 5,
      },
    }),
    prisma.feedback.upsert({
      where: { id: '00000000-0000-0000-0006-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0006-000000000002',
        tenantId: tenant.id,
        giverId: employee2User.id,
        receiverId: employeeUser.id,
        type: 'PEER',
        visibility: 'PUBLIC',
        content: 'Great collaboration on the backend integration',
        sentiment: 'POSITIVE',
        rating: 4,
      },
    }),
  ]);

  console.log('Created feedback records');

  // Create Promotion Recommendations (Feature 46)
  const promotionRec = await prisma.promotionRecommendation.upsert({
    where: { id: '00000000-0000-0000-0007-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0007-000000000001',
      tenantId: tenant.id,
      userId: employeeUser.id,
      recommendedBy: managerUser.id,
      currentRole: 'Software Engineer',
      currentLevel: 2,
      targetRole: 'Senior Software Engineer',
      targetLevel: 3,
      targetDepartment: 'Engineering',
      readinessScore: 85,
      status: 'PENDING',
      recommendationReason: 'Consistently high performance, strong technical skills, demonstrated leadership',
      requiredActions: ['Complete advanced architecture training', 'Lead one major project'],
      estimatedTimeframe: '3-6 months',
    },
  });

  console.log('Created promotion recommendation');

  // Create Succession Plan (Feature 46)
  await prisma.successionPlan.upsert({
    where: { id: '00000000-0000-0000-0007-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0007-000000000002',
      tenantId: tenant.id,
      positionId: 'ENG-MANAGER-001',
      positionTitle: 'Engineering Manager',
      currentIncumbent: managerUser.id,
      criticality: 'HIGH',
      successors: [
        {
          userId: employeeUser.id,
          readiness: 'READY_IN_1_2_YEARS',
          readinessScore: 75,
          developmentNeeds: ['Management training', 'Strategic planning'],
        },
      ],
      status: 'ACTIVE',
    },
  });

  console.log('Created succession plan');

  // Create Development Plans (Feature 47)
  await prisma.developmentPlan.upsert({
    where: { id: '00000000-0000-0000-0008-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0008-000000000001',
      tenantId: tenant.id,
      userId: employeeUser.id,
      planType: 'CAREER',
      careerGoal: 'Become a Senior Software Engineer and technical lead',
      targetRole: 'Senior Software Engineer',
      targetLevel: 3,
      duration: 12,
      status: 'IN_PROGRESS',
      activities: [
        {
          activityType: 'TRAINING',
          title: 'Advanced System Design Course',
          description: 'Complete architecture and system design training',
          priority: 'HIGH',
          estimatedHours: 40,
          status: 'IN_PROGRESS',
          deadline: new Date('2024-06-30'),
        },
        {
          activityType: 'PROJECT',
          title: 'Lead Performance Module',
          description: 'Take technical lead on performance management module',
          priority: 'HIGH',
          estimatedHours: 200,
          status: 'COMPLETED',
          deadline: new Date('2024-03-31'),
        },
        {
          activityType: 'MENTORSHIP',
          title: 'Mentor Junior Developers',
          description: 'Mentor 2 junior developers on best practices',
          priority: 'MEDIUM',
          estimatedHours: 20,
          status: 'NOT_STARTED',
          deadline: new Date('2024-09-30'),
        },
      ],
      progress: 35,
    },
  });

  console.log('Created development plan');

  // Create Team Optimization Record (Feature 48)
  await prisma.teamOptimization.upsert({
    where: { id: '00000000-0000-0000-0009-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0009-000000000001',
      tenantId: tenant.id,
      teamId: teams[0].id,
      optimizationType: 'REBALANCE',
      currentComposition: {
        size: 3,
        avgSkillLevel: 3.5,
        skillDistribution: { frontend: 1, backend: 1, fullstack: 1 },
      },
      recommendations: [
        {
          type: 'ADD_MEMBER',
          userId: null,
          requiredSkills: ['React', 'TypeScript'],
          rationale: 'Need more frontend capacity for upcoming features',
          priority: 'HIGH',
          estimatedImpact: 'Increase team velocity by 30%',
        },
      ],
      status: 'PROPOSED',
      metrics: {
        skillCoverage: 85,
        workloadBalance: 90,
        collaborationScore: 95,
        diversityScore: 70,
      },
    },
  });

  console.log('Created team optimization');

  // Create PIP Record (Feature 49)
  await prisma.performanceImprovementPlan.upsert({
    where: { id: '00000000-0000-0000-0010-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0010-000000000001',
      tenantId: tenant.id,
      userId: employee2User.id,
      createdBy: managerUser.id,
      pipType: 'PERFORMANCE',
      severity: 'MODERATE',
      performanceIssues: [
        {
          category: 'QUALITY',
          description: 'Code quality below standards, multiple bugs in production',
          examples: ['Bug #123', 'Bug #456'],
          impact: 'Customer complaints and increased support tickets',
        },
        {
          category: 'PRODUCTIVITY',
          description: 'Missing sprint commitments consistently',
          examples: ['Sprint 15', 'Sprint 16', 'Sprint 17'],
          impact: 'Team velocity impact',
        },
      ],
      improvementGoals: [
        {
          goal: 'Achieve 95% code coverage on all new code',
          metric: 'Code coverage percentage',
          targetValue: 95,
          deadline: new Date('2024-08-01'),
          status: 'IN_PROGRESS',
        },
        {
          goal: 'Complete all sprint commitments',
          metric: 'Sprint completion rate',
          targetValue: 100,
          deadline: new Date('2024-08-01'),
          status: 'IN_PROGRESS',
        },
      ],
      supportProvided: [
        'Pair programming with senior developers',
        'Code review training',
        'Time management workshop',
      ],
      duration: 90,
      status: 'ACTIVE',
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-08-01'),
    },
  });

  console.log('Created PIP record');

  // Create Organizational Health Metrics (Feature 50)
  await prisma.organizationalHealthMetrics.upsert({
    where: { id: '00000000-0000-0000-0011-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0011-000000000001',
      tenantId: tenant.id,
      period: '2024-Q2',
      calculatedAt: new Date(),
      metrics: {
        employeeEngagement: {
          score: 78,
          trend: 'UP',
          change: 5,
          benchmark: 75,
        },
        retention: {
          score: 92,
          trend: 'STABLE',
          change: 0,
          benchmark: 90,
        },
        performanceDistribution: {
          exceptional: 15,
          exceeds: 35,
          meets: 45,
          below: 5,
        },
        goalAlignment: {
          score: 85,
          trend: 'UP',
          change: 3,
        },
        feedbackActivity: {
          score: 70,
          trend: 'UP',
          change: 10,
        },
        developmentActivity: {
          score: 65,
          trend: 'UP',
          change: 8,
        },
      },
      insights: [
        {
          category: 'ENGAGEMENT',
          insight: 'Engagement trending upward, particularly in Engineering',
          severity: 'INFO',
          actionable: false,
        },
        {
          category: 'RETENTION',
          insight: 'High performer retention risk in Backend Engineering',
          severity: 'WARNING',
          actionable: true,
          recommendedActions: ['Conduct retention conversations', 'Review compensation'],
        },
      ],
      cultureDimensions: {
        innovation: 75,
        collaboration: 88,
        accountability: 82,
        customerFocus: 79,
        inclusion: 85,
      },
      riskAreas: [
        {
          area: 'Backend Engineering',
          risk: 'HIGH_PERFORMER_FLIGHT_RISK',
          severity: 'HIGH',
          affectedCount: 2,
        },
      ],
    },
  });

  console.log('Created organizational health metrics');

  // Create ML Model Predictions
  await Promise.all([
    prisma.mLModelPrediction.upsert({
      where: { id: '00000000-0000-0000-0012-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000001',
        tenantId: tenant.id,
        userId: employeeUser.id,
        modelType: 'ATTRITION_RISK',
        predictionType: 'ATTRITION',
        score: 15.5,
        confidence: 0.85,
        factors: [
          { factor: 'tenure', weight: 0.3, value: '2.5 years' },
          { factor: 'engagement_score', weight: 0.4, value: 'high' },
          { factor: 'promotion_readiness', weight: 0.3, value: 'ready' },
        ],
        recommendation: 'Low attrition risk. Consider for promotion.',
        validUntil: new Date('2024-12-31'),
      },
    }),
    prisma.mLModelPrediction.upsert({
      where: { id: '00000000-0000-0000-0012-000000000002' },
      update: {},
      create: {
        id: '00000000-0000-0000-0012-000000000002',
        tenantId: tenant.id,
        userId: employee2User.id,
        modelType: 'PERFORMANCE_FORECAST',
        predictionType: 'PERFORMANCE',
        score: 65.0,
        confidence: 0.78,
        factors: [
          { factor: 'recent_performance', weight: 0.5, value: 'below_target' },
          { factor: 'skill_gaps', weight: 0.3, value: 'moderate' },
          { factor: 'support_level', weight: 0.2, value: 'high' },
        ],
        recommendation: 'Performance improvement needed. Monitor PIP progress.',
        validUntil: new Date('2024-12-31'),
      },
    }),
  ]);

  console.log('Created ML predictions');

  // Create Engagement Surveys
  const engagementSurvey = await prisma.engagementSurvey.upsert({
    where: { id: '00000000-0000-0000-0013-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0013-000000000001',
      tenantId: tenant.id,
      name: 'Q2 2024 Engagement Survey',
      description: 'Quarterly employee engagement survey',
      frequency: 'QUARTERLY',
      status: 'ACTIVE',
      launchDate: new Date('2024-04-01'),
      closeDate: new Date('2024-04-30'),
      questions: [
        {
          id: 'q1',
          question: 'I am satisfied with my role',
          type: 'RATING',
          category: 'JOB_SATISFACTION',
          required: true,
        },
        {
          id: 'q2',
          question: 'My manager supports my development',
          type: 'RATING',
          category: 'MANAGEMENT',
          required: true,
        },
        {
          id: 'q3',
          question: 'I feel valued at this organization',
          type: 'RATING',
          category: 'CULTURE',
          required: true,
        },
      ],
    },
  });

  console.log('Created engagement survey');

  // Create Survey Responses
  await Promise.all([
    prisma.surveyResponse.upsert({
      where: {
        surveyId_respondentId: {
          surveyId: engagementSurvey.id,
          respondentId: employeeUser.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        surveyId: engagementSurvey.id,
        respondentId: employeeUser.id,
        answers: [
          { questionId: 'q1', rating: 5, sentiment: 'POSITIVE' },
          { questionId: 'q2', rating: 5, sentiment: 'POSITIVE' },
          { questionId: 'q3', rating: 4, sentiment: 'POSITIVE' },
        ],
        completedAt: new Date('2024-04-15'),
        overallSentiment: 'POSITIVE',
        aggregatedScore: 4.67,
      },
    }),
    prisma.surveyResponse.upsert({
      where: {
        surveyId_respondentId: {
          surveyId: engagementSurvey.id,
          respondentId: employee2User.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        surveyId: engagementSurvey.id,
        respondentId: employee2User.id,
        answers: [
          { questionId: 'q1', rating: 3, sentiment: 'NEUTRAL' },
          { questionId: 'q2', rating: 4, sentiment: 'POSITIVE' },
          { questionId: 'q3', rating: 3, sentiment: 'NEUTRAL' },
        ],
        completedAt: new Date('2024-04-20'),
        overallSentiment: 'NEUTRAL',
        aggregatedScore: 3.33,
      },
    }),
  ]);

  console.log('Created survey responses');

  console.log('\n✅ Database seeded successfully!');
  console.log('\n📋 Demo Accounts:');
  console.log('-------------------');
  console.log('Admin:    admin@demo.pms-platform.local / demo123');
  console.log('Manager:  manager@demo.pms-platform.local / demo123');
  console.log('Employee: employee@demo.pms-platform.local / demo123');
  console.log('Jane:     jane@demo.pms-platform.local / demo123');
  console.log('\n📊 Organizational Structure:');
  console.log('-------------------');
  console.log('Business Units: Technology, Operations');
  console.log('Departments: Engineering (with Frontend/Backend sub-depts), Product, HR');
  console.log('Teams: Platform Team (functional), Project X (cross-functional)');
  console.log('Matrix Reporting: John Developer has dotted-line to HR Admin');
  console.log('\n📈 Sample Data Created:');
  console.log('-------------------');
  console.log('✓ Goals & Reviews');
  console.log('✓ Feedback & Competencies');
  console.log('✓ Promotion Recommendations & Succession Plans');
  console.log('✓ Development Plans & Team Optimization');
  console.log('✓ Performance Improvement Plans');
  console.log('✓ Organizational Health Metrics');
  console.log('✓ ML Predictions & Engagement Surveys');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
