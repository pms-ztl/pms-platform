/**
 * Development Plan Generator Service
 * Feature 47: Personalized Development Plan Generator
 *
 * Creates automated career development plan generation based on performance profiles,
 * career goals, and skill gap analysis.
 */

import { prisma, Prisma } from '@pms/database';
import { MS_PER_DAY, DAYS } from '../../utils/constants';

export interface DevelopmentPlanGenerationInput {
  tenantId: string;
  userId: string;
  planType: string; // CAREER_GROWTH, SKILL_DEVELOPMENT, LEADERSHIP, PERFORMANCE_IMPROVEMENT
  careerGoal: string;
  targetRole?: string;
  targetLevel?: string;
  duration?: number; // months, default 12
}

export interface DevelopmentActivityInput {
  developmentPlanId: string;
  activityType: string;
  title: string;
  description: string;
  targetSkills?: string[];
  estimatedHours?: number;
  dueDate?: Date;
  priority?: string;
}

export class DevelopmentPlanService {

  /**
   * Generate personalized development plan using AI-driven analysis
   */
  async generateDevelopmentPlan(input: DevelopmentPlanGenerationInput) {
    const { tenantId, userId, planType, careerGoal, targetRole, targetLevel, duration = 12 } = input;

    // Get user profile and assessment data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        performanceComparisons: {
          orderBy: { comparisonDate: 'desc' },
          take: 1
        },
        engagementScores: {
          orderBy: { scoreDate: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Assess current state
    const currentLevel = await this.assessCurrentLevel(userId);
    const strengthsAssessed = await this.assessStrengths(userId);
    const developmentAreas = await this.identifyDevelopmentAreas(userId);

    // Perform skill gap analysis
    const skillGapAnalysis = targetRole
      ? await this.performSkillGapAnalysis(userId, targetRole)
      : {};

    // Perform competency gap analysis
    const competencyGaps = await this.analyzeCompetencyGaps(userId, targetRole);

    // Generate career path roadmap
    const careerPath = await this.generateCareerPathRoadmap(userId, targetRole, targetLevel, duration);

    // Generate development activities
    const activities = await this.generateDevelopmentActivities(
      userId,
      planType,
      skillGapAnalysis,
      competencyGaps,
      duration
    );

    // Generate milestones
    const milestones = this.generateMilestones(duration, activities);

    // Identify target skills and competencies
    const targetSkills = this.extractTargetSkills(activities);
    const targetCompetencies = this.extractTargetCompetencies(competencyGaps);

    // Recommend learning resources
    const learningResources = await this.recommendLearningResources(skillGapAnalysis, competencyGaps);

    // Recommend mentor/coach
    const mentorRecommendation = await this.recommendMentor(tenantId, userId, targetRole);

    // Calculate estimated budget
    const budget = this.calculateBudget(activities);

    // Define success metrics
    const successMetrics = this.defineSuccessMetrics(planType, careerGoal);

    // Generate checkpoint dates
    const checkpointDates = this.generateCheckpointDates(new Date(), duration);

    // Create development plan
    const plan = await prisma.developmentPlan.create({
      data: {
        tenantId,
        userId,
        planName: `${user.firstName} ${user.lastName} - ${planType} Plan`,
        planType,
        duration,
        startDate: new Date(),
        targetCompletionDate: new Date(Date.now() + DAYS(duration * 30)),
        careerGoal,
        targetRole,
        targetLevel,
        careerPath,
        currentLevel,
        strengthsAssessed,
        developmentAreas,
        skillGapAnalysis,
        competencyGaps,
        activities: activities,
        totalActivities: activities.length,
        targetSkills,
        targetCompetencies,
        learningResources,
        mentorAssigned: mentorRecommendation?.userId,
        budget,
        milestones,
        successMetrics,
        checkpointDates,
        generatedBy: 'AI',
        modelVersion: 'v1.0',
        confidence: 0.85
      }
    });

    // Create individual development activity records
    for (const activity of activities.slice(0, 10)) { // Limit to first 10 detailed activities
      await this.createDevelopmentActivity({
        tenantId,
        developmentPlanId: plan.id,
        userId,
        ...activity
      });
    }

    // Create checkpoint records
    for (let i = 0; i < checkpointDates.length; i++) {
      await this.createCheckpoint({
        tenantId,
        developmentPlanId: plan.id,
        userId,
        checkpointName: `${duration / checkpointDates.length * (i + 1)}-Month Review`,
        checkpointDate: checkpointDates[i],
        checkpointType: i === checkpointDates.length - 1 ? 'COMPLETION' : 'MILESTONE'
      });
    }

    return plan;
  }

  /**
   * Assess user's current level based on performance and experience
   */
  private async assessCurrentLevel(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return 'ENTRY';

    // Simple level determination based on job title keywords
    const title = user.jobTitle?.toLowerCase() || '';

    if (title.includes('senior') || title.includes('lead')) return 'SENIOR';
    if (title.includes('principal') || title.includes('staff')) return 'PRINCIPAL';
    if (title.includes('junior') || title.includes('associate')) return 'JUNIOR';
    return 'MID';
  }

  /**
   * Assess strengths based on performance data
   */
  private async assessStrengths(userId: string): Promise<string[]> {
    const strengths: string[] = [];

    // Check technical skills
    const technicalSkills = await prisma.technicalSkillAssessment.findMany({
      where: { userId, proficiencyLevel: { gte: 4 } },
      take: 5
    });

    for (const skill of technicalSkills) {
      strengths.push(`${skill.skillName} (Expert level)`);
    }

    // Check leadership competencies
    const leadershipScores = await prisma.leadershipCompetencyScore.findMany({
      where: { userId, score: { gte: 75 } },
      orderBy: { score: 'desc' },
      take: 3
    });

    for (const comp of leadershipScores) {
      strengths.push(`${comp.competencyName} leadership`);
    }

    return strengths;
  }

  /**
   * Identify development areas
   */
  private async identifyDevelopmentAreas(userId: string): Promise<string[]> {
    const areas: string[] = [];

    // Check technical skills with low scores
    const weakSkills = await prisma.technicalSkillAssessment.findMany({
      where: { userId, proficiencyLevel: { lte: 2 } },
      take: 5
    });

    for (const skill of weakSkills) {
      areas.push(`${skill.skillName} requires improvement`);
    }

    // Check leadership gaps
    const leadershipGaps = await prisma.leadershipCompetencyScore.findMany({
      where: { userId, score: { lt: 60 } },
      take: 3
    });

    for (const gap of leadershipGaps) {
      areas.push(`${gap.competencyName} development needed`);
    }

    return areas;
  }

  /**
   * Perform skill gap analysis for target role
   */
  private async performSkillGapAnalysis(userId: string, targetRole: string) {
    // Get user's current skills
    const userSkills = await prisma.technicalSkillAssessment.findMany({
      where: { userId }
    });

    // Get role requirements (simplified - would be from role catalog)
    const roleRequirements = await this.getRoleSkillRequirements(targetRole);

    const gaps: Record<string, any> = {};

    for (const req of roleRequirements) {
      const userSkill = userSkills.find(s => s.skillName === req.skillName);
      const currentLevel = userSkill?.proficiencyLevel || 0;
      const requiredLevel = req.requiredLevel;

      gaps[req.skillName] = {
        current: currentLevel,
        required: requiredLevel,
        gap: Math.max(0, requiredLevel - currentLevel),
        category: req.category,
        priority: req.priority
      };
    }

    return gaps;
  }

  /**
   * Get skill requirements for a role
   */
  private async getRoleSkillRequirements(role: string) {
    // Query competency framework for the target role's required skills
    const competencies = await prisma.competency.findMany({
      where: {
        framework: { name: { contains: role, mode: 'insensitive' } },
      },
      include: { framework: true },
    });

    if (competencies.length > 0) {
      return competencies.map((c) => ({
        skillName: c.name,
        requiredLevel: c.level ?? 3,
        category: c.category ?? 'GENERAL',
        priority: (c.level ?? 3) >= 4 ? 'HIGH' : 'MEDIUM',
      }));
    }

    // Fallback: derive from skill assessments of users currently in that role
    const roleUsers = await prisma.user.findMany({
      where: { jobTitle: { contains: role, mode: 'insensitive' }, isActive: true },
      take: 20,
    });
    if (roleUsers.length === 0) return [];

    const skills = await prisma.technicalSkillAssessment.findMany({
      where: { userId: { in: roleUsers.map((u) => u.id) } },
      include: { category: true },
    });

    const skillMap = new Map<string, { total: number; count: number; category: string }>();
    for (const s of skills) {
      const existing = skillMap.get(s.skillName) || { total: 0, count: 0, category: s.category?.name ?? 'GENERAL' };
      existing.total += s.currentLevel;
      existing.count += 1;
      skillMap.set(s.skillName, existing);
    }

    return Array.from(skillMap.entries()).map(([name, { total, count, category }]) => ({
      skillName: name,
      requiredLevel: Math.round(total / count),
      category,
      priority: Math.round(total / count) >= 4 ? 'HIGH' : 'MEDIUM',
    }));
  }

  /**
   * Analyze competency gaps
   */
  private async analyzeCompetencyGaps(userId: string, targetRole?: string) {
    const currentCompetencies = await prisma.leadershipCompetencyScore.findMany({
      where: { userId },
      orderBy: { assessmentDate: 'desc' }
    });

    const gaps: Record<string, any> = {};

    // Define target competency levels based on role
    const targetLevel = targetRole?.includes('Manager') ? 80 : 70;

    for (const comp of currentCompetencies) {
      const currentScore = comp.score.toNumber();
      if (currentScore < targetLevel) {
        gaps[comp.competencyName] = {
          current: currentScore,
          target: targetLevel,
          gap: targetLevel - currentScore,
          priority: currentScore < 50 ? 'HIGH' : 'MEDIUM'
        };
      }
    }

    return gaps;
  }

  /**
   * Generate career path roadmap
   */
  private async generateCareerPathRoadmap(
    userId: string,
    targetRole?: string,
    targetLevel?: string,
    duration: number = 12
  ) {
    const roadmap: any[] = [];

    if (!targetRole) return roadmap;

    // Get user's current role
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currentRole = user?.jobTitle || 'Current Role';

    // Define intermediate steps
    const steps = await this.defineCareerPathSteps(currentRole, targetRole);

    // Distribute steps across duration
    const timePerStep = duration / steps.length;

    for (let i = 0; i < steps.length; i++) {
      roadmap.push({
        milestone: steps[i].title,
        description: steps[i].description,
        targetMonth: Math.floor(timePerStep * (i + 1)),
        requiredSkills: steps[i].skills,
        successCriteria: steps[i].criteria
      });
    }

    return roadmap;
  }

  /**
   * Define career path steps
   */
  private async defineCareerPathSteps(currentRole: string, targetRole: string) {
    // Try to load career path milestones from DB
    const careerPath = await prisma.careerPath.findFirst({
      where: {
        OR: [
          { fromRole: { contains: currentRole, mode: 'insensitive' } },
          { toRole: { contains: targetRole, mode: 'insensitive' } },
        ],
      },
    });

    if (careerPath && Array.isArray(careerPath.milestones) && (careerPath.milestones as any[]).length > 0) {
      return (careerPath.milestones as any[]).map((m: any) => ({
        title: m.title || m.name || 'Milestone',
        description: m.description || '',
        skills: m.skills || m.requiredSkills || [],
        criteria: m.criteria || m.successCriteria || [],
      }));
    }

    // Dynamic generation: derive steps from the gap between current and target roles
    const targetSkills = await this.getRoleSkillRequirements(targetRole);
    const steps: any[] = [
      {
        title: `Excel in ${currentRole}`,
        description: 'Consistently exceed expectations in current role responsibilities',
        skills: ['Current role proficiency'],
        criteria: ['Performance rating ≥ 4.0 for 2 consecutive cycles'],
      },
    ];

    // Add a step per high-priority skill gap
    const highPriority = targetSkills.filter((s: any) => s.priority === 'HIGH');
    if (highPriority.length > 0) {
      steps.push({
        title: 'Develop Critical Skills',
        description: `Build competency in: ${highPriority.map((s: any) => s.skillName).join(', ')}`,
        skills: highPriority.map((s: any) => s.skillName),
        criteria: highPriority.map((s: any) => `Achieve level ${s.requiredLevel} in ${s.skillName}`),
      });
    }

    steps.push({
      title: `Ready for ${targetRole}`,
      description: `Demonstrate consistent performance at ${targetRole} level`,
      skills: targetSkills.map((s: any) => s.skillName),
      criteria: ['Manager endorsement', 'Successful stretch assignment'],
    });

    return steps;
  }

  /**
   * Generate development activities based on gaps
   */
  private async generateDevelopmentActivities(
    userId: string,
    planType: string,
    skillGaps: Record<string, any>,
    competencyGaps: Record<string, any>,
    duration: number
  ) {
    const activities: any[] = [];

    // Technical skill development activities
    const highPrioritySkillGaps = Object.entries(skillGaps)
      .filter(([_, gap]: [string, any]) => gap.priority === 'HIGH' && gap.gap > 0)
      .slice(0, 5);

    for (const [skill, gap] of highPrioritySkillGaps) {
      activities.push({
        activityType: 'TRAINING',
        title: `${skill} Training Course`,
        description: `Complete advanced training in ${skill} to reach proficiency level ${gap.required}`,
        targetSkills: [skill],
        estimatedHours: gap.gap * 20,
        dueDate: new Date(Date.now() + DAYS((duration / 2) * 30)),
        priority: 'HIGH',
        learningObjectives: [
          `Understand advanced concepts in ${skill}`,
          `Apply ${skill} in real-world projects`,
          `Achieve proficiency level ${gap.required}`
        ]
      });

      activities.push({
        activityType: 'PROJECT',
        title: `${skill} Application Project`,
        description: `Lead a project that requires application of ${skill}`,
        targetSkills: [skill],
        estimatedHours: 40,
        dueDate: new Date(Date.now() + DAYS(duration * 30)),
        priority: 'HIGH',
        learningObjectives: [
          `Demonstrate ${skill} in production environment`,
          `Document learnings and best practices`
        ]
      });
    }

    // Leadership competency development
    const highPriorityCompGaps = Object.entries(competencyGaps)
      .filter(([_, gap]: [string, any]) => gap.priority === 'HIGH')
      .slice(0, 3);

    for (const [competency, gap] of highPriorityCompGaps) {
      activities.push({
        activityType: 'MENTORING',
        title: `${competency} Development through Mentorship`,
        description: `Work with senior leader to develop ${competency} skills`,
        targetCompetencies: [competency],
        estimatedHours: 20,
        dueDate: new Date(Date.now() + DAYS(duration * 0.75 * 30)),
        priority: 'MEDIUM',
        learningObjectives: [
          `Learn best practices for ${competency}`,
          `Receive feedback on ${competency} application`
        ]
      });
    }

    // Add general development activities based on plan type
    if (planType === 'LEADERSHIP') {
      activities.push({
        activityType: 'COURSE',
        title: 'Leadership Fundamentals Certificate',
        description: 'Complete comprehensive leadership training program',
        targetCompetencies: ['Leadership', 'People Management', 'Strategic Thinking'],
        estimatedHours: 60,
        dueDate: new Date(Date.now() + DAYS(duration * 0.6 * 30)),
        priority: 'HIGH',
        provider: 'Internal Learning Platform',
        learningObjectives: [
          'Understand leadership principles',
          'Develop people management skills',
          'Learn strategic decision-making'
        ]
      });
    }

    return activities;
  }

  /**
   * Generate milestones for the plan
   */
  private generateMilestones(duration: number, activities: any[]) {
    const milestones: any[] = [];
    const quarterDuration = duration / 4;

    for (let i = 1; i <= 4; i++) {
      const targetMonth = quarterDuration * i;
      milestones.push({
        name: `Q${i} Milestone`,
        month: Math.floor(targetMonth),
        description: `Complete ${Math.floor(activities.length / 4)} development activities`,
        criteria: [
          `${i * 25}% of development plan completed`,
          `Demonstrate progress in key skill areas`,
          `Complete scheduled activities on time`
        ]
      });
    }

    return milestones;
  }

  /**
   * Extract target skills from activities
   */
  private extractTargetSkills(activities: any[]) {
    const skills: any[] = [];
    const skillSet = new Set<string>();

    for (const activity of activities) {
      if (activity.targetSkills) {
        for (const skill of activity.targetSkills) {
          if (!skillSet.has(skill)) {
            skillSet.add(skill);
            skills.push({
              skillName: skill,
              currentLevel: 0,
              targetLevel: 4,
              priority: activity.priority
            });
          }
        }
      }
    }

    return skills;
  }

  /**
   * Extract target competencies from gaps
   */
  private extractTargetCompetencies(competencyGaps: Record<string, any>) {
    return Object.entries(competencyGaps).map(([name, gap]: [string, any]) => ({
      competencyName: name,
      currentLevel: gap.current,
      targetLevel: gap.target,
      priority: gap.priority
    }));
  }

  /**
   * Recommend learning resources
   */
  private async recommendLearningResources(skillGaps: Record<string, any>, competencyGaps: Record<string, any>) {
    const resources: any[] = [];

    // Add resources for skill gaps
    for (const [skill, gap] of Object.entries(skillGaps)) {
      if ((gap as any).gap > 0) {
        resources.push({
          type: 'COURSE',
          title: `Advanced ${skill} Training`,
          provider: 'Online Learning Platform',
          url: `https://learning.example.com/courses/${skill.toLowerCase().replace(/\s+/g, '-')}`,
          estimatedHours: (gap as any).gap * 15,
          cost: 299
        });
      }
    }

    return resources;
  }

  /**
   * Recommend mentor based on target role
   */
  private async recommendMentor(tenantId: string, userId: string, targetRole?: string) {
    if (!targetRole) return null;

    // Find users in target role with high performance
    const potentialMentors = await prisma.user.findMany({
      where: {
        tenantId,
        jobTitle: targetRole,
        id: { not: userId },
        isActive: true
      },
      include: {
        performanceComparisons: {
          orderBy: { comparisonDate: 'desc' },
          take: 1
        }
      },
      take: 5
    });

    // Score mentors by performance and experience
    const scoredMentors = potentialMentors
      .filter(m => m.performanceComparisons[0]?.performanceLevel === 'ABOVE' || m.performanceComparisons[0]?.performanceLevel === 'EXCEPTIONAL')
      .sort((a, b) => {
        const aMonths = a.hireDate ? Math.floor((Date.now() - a.hireDate.getTime()) / DAYS(30)) : 0;
        const bMonths = b.hireDate ? Math.floor((Date.now() - b.hireDate.getTime()) / DAYS(30)) : 0;
        return bMonths - aMonths;
      });

    return scoredMentors[0] || null;
  }

  /**
   * Calculate estimated budget for development activities
   */
  private calculateBudget(activities: any[]): number {
    let totalBudget = 0;

    for (const activity of activities) {
      // Estimate costs based on activity type
      if (activity.activityType === 'COURSE' || activity.activityType === 'CERTIFICATION') {
        totalBudget += 500; // Average course cost
      } else if (activity.activityType === 'TRAINING') {
        totalBudget += 300;
      } else if (activity.activityType === 'CONFERENCE') {
        totalBudget += 1500;
      }
    }

    return totalBudget;
  }

  /**
   * Define success metrics for the plan
   */
  private defineSuccessMetrics(planType: string, careerGoal: string) {
    const metrics: any[] = [
      {
        metric: 'Activity Completion Rate',
        target: 90,
        unit: 'percentage',
        measurement: 'Percentage of planned activities completed'
      },
      {
        metric: 'Skill Level Improvement',
        target: 1,
        unit: 'levels',
        measurement: 'Average improvement in target skill levels'
      },
      {
        metric: 'Performance Rating',
        target: 4.0,
        unit: 'rating',
        measurement: 'Performance rating during plan period'
      }
    ];

    if (planType === 'LEADERSHIP') {
      metrics.push({
        metric: 'Leadership Competency Score',
        target: 80,
        unit: 'score',
        measurement: 'Average leadership competency assessment score'
      });
    }

    return metrics;
  }

  /**
   * Generate checkpoint dates
   */
  private generateCheckpointDates(startDate: Date, duration: number): Date[] {
    const dates: Date[] = [];
    const checkpointInterval = duration / 4; // Quarterly checkpoints

    for (let i = 1; i <= 4; i++) {
      const months = checkpointInterval * i;
      const checkpointDate = new Date(startDate.getTime() + DAYS(months * 30));
      dates.push(checkpointDate);
    }

    return dates;
  }

  /**
   * Create development activity record
   */
  async createDevelopmentActivity(input: any) {
    return await prisma.developmentActivity.create({
      data: input
    });
  }

  /**
   * Create checkpoint record
   */
  async createCheckpoint(input: any) {
    return await prisma.developmentCheckpoint.create({
      data: input
    });
  }

  /**
   * Update development plan progress
   */
  async updatePlanProgress(planId: string) {
    const activities = await prisma.developmentActivity.findMany({
      where: { developmentPlanId: planId }
    });

    const completedCount = activities.filter(a => a.status === 'COMPLETED').length;
    const progressPercentage = activities.length > 0 ? (completedCount / activities.length) * 100 : 0;

    return await prisma.developmentPlan.update({
      where: { id: planId },
      data: {
        completedActivities: completedCount,
        progressPercentage
      }
    });
  }

  /**
   * Complete development plan
   */
  async completePlan(planId: string) {
    return await prisma.developmentPlan.update({
      where: { id: planId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        progressPercentage: 100
      }
    });
  }

  /**
   * Get user's development plans
   */
  async getUserDevelopmentPlans(tenantId: string, userId: string) {
    return await prisma.developmentPlan.findMany({
      where: { tenantId, userId },
      include: {
        activities_rel: true,
        checkpoints: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
