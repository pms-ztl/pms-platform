/**
 * Learning & Growth Module
 *
 * Comprehensive learning and development system that integrates with performance
 * data to deliver personalized growth paths, skill development tracking,
 * and competency management.
 *
 * Key capabilities:
 * - Personalized learning path generation
 * - Skill gap analysis and recommendations
 * - Competency framework management
 * - Learning resource integration
 * - Development plan tracking
 * - Mentor matching
 * - Career pathing
 * - Learning effectiveness measurement
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

// ============================================================================
// Type Definitions
// ============================================================================

export type SkillLevel = 'novice' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type LearningResourceType = 'course' | 'video' | 'article' | 'book' | 'workshop' | 'certification' | 'project' | 'mentorship';

export type DevelopmentGoalStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'abandoned';

export interface Skill {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  levels: SkillLevelDefinition[];
  relatedSkills: string[];
  demandTrend: 'increasing' | 'stable' | 'decreasing';
  marketValue: number; // 1-10
}

export interface SkillLevelDefinition {
  level: SkillLevel;
  description: string;
  indicators: string[];
  typicalTimeToAchieve: number; // months
  assessmentCriteria: string[];
}

export interface UserSkillProfile {
  userId: string;
  skills: UserSkill[];
  overallStrength: number;
  gapAreas: SkillGapArea[];
  recentProgress: SkillProgress[];
  learningVelocity: number;
  generatedAt: Date;
}

export interface UserSkill {
  skillId: string;
  skillName: string;
  category: string;
  currentLevel: SkillLevel;
  targetLevel?: SkillLevel;
  proficiencyScore: number; // 0-100
  lastAssessed: Date;
  assessmentSource: 'self' | 'manager' | 'peer' | 'assessment' | 'certification';
  evidence: SkillEvidence[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface SkillEvidence {
  type: string;
  description: string;
  date: Date;
  verifiedBy?: string;
}

export interface SkillGapArea {
  skillId: string;
  skillName: string;
  currentLevel: SkillLevel;
  requiredLevel: SkillLevel;
  gapSeverity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  recommendedActions: string[];
}

export interface SkillProgress {
  skillId: string;
  skillName: string;
  previousLevel: SkillLevel;
  currentLevel: SkillLevel;
  changeDate: Date;
  catalyst: string;
}

export interface LearningPath {
  id: string;
  userId: string;
  name: string;
  description: string;
  targetRole?: string;
  targetSkills: string[];
  milestones: LearningMilestone[];
  estimatedDuration: number; // months
  currentProgress: number; // 0-100
  status: DevelopmentGoalStatus;
  createdAt: Date;
  completedAt?: Date;
}

export interface LearningMilestone {
  id: string;
  name: string;
  description: string;
  order: number;
  resources: LearningResource[];
  skillsGained: { skillId: string; levelGained: SkillLevel }[];
  estimatedHours: number;
  completed: boolean;
  completedAt?: Date;
  assessmentRequired: boolean;
  assessment?: MilestoneAssessment;
}

export interface LearningResource {
  id: string;
  type: LearningResourceType;
  title: string;
  description: string;
  provider: string;
  url?: string;
  duration: number; // hours
  cost: number;
  rating: number;
  skillsCovered: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  format: 'self_paced' | 'instructor_led' | 'blended' | 'hands_on';
}

export interface MilestoneAssessment {
  type: 'quiz' | 'project' | 'review' | 'certification' | 'demonstration';
  passingScore: number;
  attempts: number;
  bestScore?: number;
  passed: boolean;
  completedAt?: Date;
}

export interface DevelopmentPlan {
  id: string;
  userId: string;
  managerId: string;
  period: string;
  status: DevelopmentGoalStatus;
  goals: DevelopmentGoal[];
  overallProgress: number;
  checkIns: DevelopmentCheckIn[];
  createdAt: Date;
  lastUpdated: Date;
}

export interface DevelopmentGoal {
  id: string;
  title: string;
  description: string;
  category: 'skill' | 'competency' | 'experience' | 'certification' | 'education';
  targetDate: Date;
  status: DevelopmentGoalStatus;
  progress: number;
  relatedSkills: string[];
  successCriteria: string[];
  actions: DevelopmentAction[];
  support: string[];
  obstacles: string[];
}

export interface DevelopmentAction {
  id: string;
  action: string;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
  notes?: string;
}

export interface DevelopmentCheckIn {
  id: string;
  date: Date;
  conductedBy: string;
  progressSummary: string;
  achievements: string[];
  challenges: string[];
  nextSteps: string[];
  overallRating: number;
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
  levels: CompetencyLevel[];
  behaviors: CompetencyBehavior[];
  relatedSkills: string[];
  applicableRoles: string[];
}

export interface CompetencyLevel {
  level: number;
  name: string;
  description: string;
  expectations: string[];
}

export interface CompetencyBehavior {
  behavior: string;
  level: number;
  indicators: string[];
}

export interface CompetencyAssessment {
  userId: string;
  competencyId: string;
  currentLevel: number;
  targetLevel: number;
  assessments: {
    assessorId: string;
    assessorRole: 'self' | 'manager' | 'peer' | 'skip_level';
    level: number;
    evidence: string[];
    date: Date;
  }[];
  gap: number;
  developmentRecommendations: string[];
}

export interface MentorMatch {
  mentorId: string;
  menteeId: string;
  matchScore: number;
  matchReasons: string[];
  sharedSkills: string[];
  complementarySkills: string[];
  relationshipType: 'career' | 'skill' | 'leadership' | 'onboarding';
  status: 'suggested' | 'active' | 'completed' | 'declined';
  startDate?: Date;
  endDate?: Date;
  goals: string[];
  meetings: MentorMeeting[];
}

export interface MentorMeeting {
  date: Date;
  duration: number;
  topics: string[];
  actionItems: string[];
  feedbackRating?: number;
}

export interface CareerPath {
  id: string;
  name: string;
  description: string;
  levels: CareerLevel[];
  branches: CareerBranch[];
  typicalDuration: number;
  demandLevel: 'high' | 'medium' | 'low';
}

export interface CareerLevel {
  level: number;
  title: string;
  description: string;
  responsibilities: string[];
  requiredSkills: { skillId: string; level: SkillLevel }[];
  requiredCompetencies: { competencyId: string; level: number }[];
  typicalTenure: number;
  compensationRange: { min: number; max: number };
}

export interface CareerBranch {
  fromLevel: number;
  toPath: string;
  requirements: string[];
  commonTransitions: string[];
}

export interface LearningAnalytics {
  userId: string;
  period: string;
  hoursLearned: number;
  resourcesCompleted: number;
  skillsImproved: number;
  certificationsEarned: number;
  learningStreak: number;
  topCategories: { category: string; hours: number }[];
  effectiveness: LearningEffectiveness;
  recommendations: string[];
}

export interface LearningEffectiveness {
  knowledgeRetention: number;
  skillApplication: number;
  performanceImpact: number;
  overallScore: number;
}

// ============================================================================
// Learning & Growth Service
// ============================================================================

export class LearningGrowthService {
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
  }

  /**
   * Generate user skill profile with gap analysis
   */
  async generateSkillProfile(userId: string, tenantId: string): Promise<UserSkillProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        feedbackReceived: {
          where: {
            createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
        },
        reviewsReceived: {
          orderBy: { createdAt: 'desc' },
          take: 4,
        },
        goalsOwned: {
          where: { status: 'completed' },
        },
      },
    });

    if (!user) throw new Error('User not found');

    // Get role requirements
    const roleRequirements = await this.getRoleSkillRequirements(user.jobTitle || '', tenantId);

    // Build skill inventory
    const userSkills = await this.buildUserSkillInventory(user, tenantId);

    // Identify gaps
    const gapAreas = this.identifySkillGaps(userSkills, roleRequirements);

    // Get recent progress
    const recentProgress = await this.getRecentSkillProgress(userId, tenantId);

    // Calculate learning velocity
    const learningVelocity = this.calculateLearningVelocity(recentProgress);

    // Calculate overall strength
    const overallStrength = userSkills.length > 0
      ? userSkills.reduce((sum, s) => sum + s.proficiencyScore, 0) / userSkills.length
      : 50;

    return {
      userId,
      skills: userSkills,
      overallStrength,
      gapAreas,
      recentProgress,
      learningVelocity,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate personalized learning path
   */
  async generateLearningPath(
    userId: string,
    targetRole: string | null,
    targetSkills: string[],
    tenantId: string
  ): Promise<LearningPath> {
    // Get current skill profile
    const profile = await this.generateSkillProfile(userId, tenantId);

    // Determine target skills
    const allTargetSkills = targetRole
      ? await this.getSkillsForRole(targetRole, tenantId)
      : targetSkills;

    // Build learning milestones
    const milestones = await this.buildLearningMilestones(
      profile.skills,
      allTargetSkills,
      tenantId
    );

    // Calculate estimated duration
    const estimatedDuration = milestones.reduce((sum, m) => sum + m.estimatedHours / 40, 0); // Convert to months assuming 40hrs/month

    const learningPath: LearningPath = {
      id: `lp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: targetRole ? `Path to ${targetRole}` : 'Custom Learning Path',
      description: targetRole
        ? `Structured learning path to develop skills needed for ${targetRole}`
        : 'Personalized learning path based on selected skills',
      targetRole: targetRole || undefined,
      targetSkills: allTargetSkills,
      milestones,
      estimatedDuration,
      currentProgress: 0,
      status: 'not_started',
      createdAt: new Date(),
    };

    // Cache the learning path
    await this.redis.set(
      `learning_path:${userId}:${learningPath.id}`,
      JSON.stringify(learningPath),
      'EX',
      365 * 24 * 60 * 60
    );

    return learningPath;
  }

  /**
   * Create development plan
   */
  async createDevelopmentPlan(
    userId: string,
    managerId: string,
    period: string,
    goals: Omit<DevelopmentGoal, 'id' | 'status' | 'progress' | 'actions'>[],
    tenantId: string
  ): Promise<DevelopmentPlan> {
    const developmentGoals: DevelopmentGoal[] = goals.map((g, idx) => ({
      ...g,
      id: `goal_${idx}_${Date.now()}`,
      status: 'not_started',
      progress: 0,
      actions: [],
    }));

    const plan: DevelopmentPlan = {
      id: `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      managerId,
      period,
      status: 'not_started',
      goals: developmentGoals,
      overallProgress: 0,
      checkIns: [],
      createdAt: new Date(),
      lastUpdated: new Date(),
    };

    await this.redis.set(
      `dev_plan:${userId}:${plan.id}`,
      JSON.stringify(plan),
      'EX',
      365 * 24 * 60 * 60
    );

    return plan;
  }

  /**
   * Record development check-in
   */
  async recordCheckIn(
    planId: string,
    userId: string,
    checkIn: Omit<DevelopmentCheckIn, 'id'>
  ): Promise<DevelopmentPlan> {
    const planKey = `dev_plan:${userId}:${planId}`;
    const cached = await this.redis.get(planKey);

    if (!cached) throw new Error('Development plan not found');

    const plan: DevelopmentPlan = JSON.parse(cached);

    plan.checkIns.push({
      ...checkIn,
      id: `checkin_${Date.now()}`,
    });

    plan.lastUpdated = new Date();

    await this.redis.set(planKey, JSON.stringify(plan), 'EX', 365 * 24 * 60 * 60);

    return plan;
  }

  /**
   * Find mentor matches for user
   */
  async findMentorMatches(
    userId: string,
    relationshipType: 'career' | 'skill' | 'leadership' | 'onboarding',
    tenantId: string
  ): Promise<MentorMatch[]> {
    const mentee = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        department: true,
      },
    });

    if (!mentee) throw new Error('User not found');

    // Get potential mentors (more senior, different team for diversity)
    const potentialMentors = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { not: userId },
        status: 'active',
        // In production, would filter by seniority level
      },
      include: {
        skills: true,
        department: true,
      },
      take: 50,
    });

    const matches: MentorMatch[] = [];

    for (const mentor of potentialMentors) {
      const matchScore = this.calculateMentorMatchScore(mentee, mentor, relationshipType);

      if (matchScore.score > 0.5) {
        matches.push({
          mentorId: mentor.id,
          menteeId: userId,
          matchScore: matchScore.score,
          matchReasons: matchScore.reasons,
          sharedSkills: matchScore.sharedSkills,
          complementarySkills: matchScore.complementarySkills,
          relationshipType,
          status: 'suggested',
          goals: [],
          meetings: [],
        });
      }
    }

    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
  }

  /**
   * Get competency assessment
   */
  async assessCompetency(
    userId: string,
    competencyId: string,
    tenantId: string
  ): Promise<CompetencyAssessment> {
    const competency = await this.getCompetency(competencyId, tenantId);
    if (!competency) throw new Error('Competency not found');

    // Get assessments from different sources
    const selfAssessment = await this.getSelfAssessment(userId, competencyId, tenantId);
    const managerAssessment = await this.getManagerAssessment(userId, competencyId, tenantId);
    const peerAssessments = await this.getPeerAssessments(userId, competencyId, tenantId);

    const allAssessments = [
      selfAssessment,
      managerAssessment,
      ...peerAssessments,
    ].filter(Boolean) as CompetencyAssessment['assessments'];

    // Calculate weighted average
    const weightedSum = allAssessments.reduce((sum, a) => {
      const weight = a.assessorRole === 'manager' ? 0.4 : a.assessorRole === 'self' ? 0.2 : 0.4 / peerAssessments.length;
      return sum + a.level * weight;
    }, 0);

    const currentLevel = Math.round(weightedSum);
    const targetLevel = currentLevel + 1; // Next level
    const gap = targetLevel - currentLevel;

    // Generate recommendations
    const recommendations = this.generateCompetencyRecommendations(competency, currentLevel, gap);

    return {
      userId,
      competencyId,
      currentLevel,
      targetLevel,
      assessments: allAssessments,
      gap,
      developmentRecommendations: recommendations,
    };
  }

  /**
   * Get learning analytics
   */
  async getLearningAnalytics(
    userId: string,
    period: string,
    tenantId: string
  ): Promise<LearningAnalytics> {
    // Get learning activities
    const activities = await this.getLearningActivities(userId, period, tenantId);

    // Calculate hours learned
    const hoursLearned = activities.reduce((sum, a) => sum + a.duration, 0);

    // Count resources completed
    const resourcesCompleted = activities.filter(a => a.completed).length;

    // Get skill improvements
    const profile = await this.generateSkillProfile(userId, tenantId);
    const skillsImproved = profile.recentProgress.length;

    // Count certifications
    const certificationsEarned = activities.filter(a =>
      a.type === 'certification' && a.completed
    ).length;

    // Calculate learning streak (consecutive weeks with learning)
    const learningStreak = this.calculateLearningStreak(activities);

    // Top categories
    const categoryHours = new Map<string, number>();
    for (const activity of activities) {
      for (const skill of activity.skillsCovered || []) {
        const current = categoryHours.get(skill) || 0;
        categoryHours.set(skill, current + activity.duration);
      }
    }
    const topCategories = Array.from(categoryHours.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, hours]) => ({ category, hours }));

    // Calculate effectiveness
    const effectiveness = await this.calculateLearningEffectiveness(userId, tenantId);

    // Generate recommendations
    const recommendations = this.generateLearningRecommendations(
      profile,
      activities,
      effectiveness
    );

    return {
      userId,
      period,
      hoursLearned,
      resourcesCompleted,
      skillsImproved,
      certificationsEarned,
      learningStreak,
      topCategories,
      effectiveness,
      recommendations,
    };
  }

  /**
   * Get available career paths
   */
  async getCareerPaths(tenantId: string): Promise<CareerPath[]> {
    // In production, this would query from career path definitions
    return [
      {
        id: 'ic_engineering',
        name: 'Individual Contributor - Engineering',
        description: 'Technical excellence track for engineers',
        levels: [
          {
            level: 1,
            title: 'Junior Engineer',
            description: 'Entry-level engineer developing core skills',
            responsibilities: ['Execute assigned tasks', 'Learn codebase', 'Write tests'],
            requiredSkills: [
              { skillId: 'programming', level: 'beginner' },
              { skillId: 'testing', level: 'novice' },
            ],
            requiredCompetencies: [],
            typicalTenure: 18,
            compensationRange: { min: 60000, max: 85000 },
          },
          {
            level: 2,
            title: 'Mid-Level Engineer',
            description: 'Engineer capable of independent feature delivery',
            responsibilities: ['Design small features', 'Code review', 'Mentor juniors'],
            requiredSkills: [
              { skillId: 'programming', level: 'intermediate' },
              { skillId: 'system_design', level: 'beginner' },
            ],
            requiredCompetencies: [],
            typicalTenure: 24,
            compensationRange: { min: 85000, max: 120000 },
          },
          {
            level: 3,
            title: 'Senior Engineer',
            description: 'Technical leader driving complex projects',
            responsibilities: ['Lead projects', 'Architecture decisions', 'Team mentorship'],
            requiredSkills: [
              { skillId: 'programming', level: 'advanced' },
              { skillId: 'system_design', level: 'intermediate' },
              { skillId: 'leadership', level: 'beginner' },
            ],
            requiredCompetencies: [],
            typicalTenure: 30,
            compensationRange: { min: 120000, max: 160000 },
          },
          {
            level: 4,
            title: 'Staff Engineer',
            description: 'Cross-team technical influence',
            responsibilities: ['Define technical direction', 'Cross-team collaboration', 'Technical strategy'],
            requiredSkills: [
              { skillId: 'programming', level: 'expert' },
              { skillId: 'system_design', level: 'advanced' },
              { skillId: 'leadership', level: 'intermediate' },
            ],
            requiredCompetencies: [],
            typicalTenure: 36,
            compensationRange: { min: 160000, max: 220000 },
          },
        ],
        branches: [
          {
            fromLevel: 3,
            toPath: 'mgmt_engineering',
            requirements: ['Leadership readiness', 'People management interest'],
            commonTransitions: ['Engineering Manager'],
          },
        ],
        typicalDuration: 96,
        demandLevel: 'high',
      },
      {
        id: 'mgmt_engineering',
        name: 'Management - Engineering',
        description: 'People leadership track for engineering managers',
        levels: [
          {
            level: 3,
            title: 'Engineering Manager',
            description: 'Direct manager of engineering team',
            responsibilities: ['Team management', 'Project delivery', 'Career development'],
            requiredSkills: [
              { skillId: 'people_management', level: 'intermediate' },
              { skillId: 'project_management', level: 'intermediate' },
            ],
            requiredCompetencies: [],
            typicalTenure: 30,
            compensationRange: { min: 140000, max: 180000 },
          },
          {
            level: 4,
            title: 'Senior Engineering Manager',
            description: 'Manager of multiple teams or large team',
            responsibilities: ['Multi-team coordination', 'Hiring strategy', 'Budget management'],
            requiredSkills: [
              { skillId: 'people_management', level: 'advanced' },
              { skillId: 'strategic_planning', level: 'intermediate' },
            ],
            requiredCompetencies: [],
            typicalTenure: 36,
            compensationRange: { min: 180000, max: 240000 },
          },
          {
            level: 5,
            title: 'Director of Engineering',
            description: 'Organizational leadership',
            responsibilities: ['Department strategy', 'Executive collaboration', 'Organizational design'],
            requiredSkills: [
              { skillId: 'people_management', level: 'expert' },
              { skillId: 'strategic_planning', level: 'advanced' },
            ],
            requiredCompetencies: [],
            typicalTenure: 48,
            compensationRange: { min: 240000, max: 350000 },
          },
        ],
        branches: [],
        typicalDuration: 72,
        demandLevel: 'medium',
      },
    ];
  }

  /**
   * Recommend learning resources
   */
  async recommendResources(
    userId: string,
    skillId: string,
    targetLevel: SkillLevel,
    tenantId: string
  ): Promise<LearningResource[]> {
    // Get user's current level
    const profile = await this.generateSkillProfile(userId, tenantId);
    const currentSkill = profile.skills.find(s => s.skillId === skillId);
    const currentLevel = currentSkill?.currentLevel || 'novice';

    // Get available resources
    const allResources = await this.getAllResources(skillId, tenantId);

    // Filter and rank by appropriateness
    const ranked = allResources
      .filter(r => this.isResourceAppropriate(r, currentLevel, targetLevel))
      .map(r => ({
        resource: r,
        score: this.calculateResourceScore(r, currentLevel, targetLevel),
      }))
      .sort((a, b) => b.score - a.score);

    return ranked.slice(0, 10).map(r => r.resource);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getRoleSkillRequirements(role: string, tenantId: string): Promise<{ skillId: string; level: SkillLevel }[]> {
    // In production, fetch from role definitions
    return [
      { skillId: 'programming', level: 'intermediate' },
      { skillId: 'communication', level: 'intermediate' },
      { skillId: 'problem_solving', level: 'intermediate' },
    ];
  }

  private async buildUserSkillInventory(user: any, tenantId: string): Promise<UserSkill[]> {
    const skills: UserSkill[] = [];

    // Add explicitly tracked skills
    for (const skill of user.skills || []) {
      skills.push({
        skillId: skill.id,
        skillName: skill.name,
        category: skill.category || 'General',
        currentLevel: skill.level as SkillLevel || 'beginner',
        proficiencyScore: this.levelToScore(skill.level as SkillLevel),
        lastAssessed: skill.updatedAt || new Date(),
        assessmentSource: 'self',
        evidence: [],
        trend: 'stable',
      });
    }

    // Infer skills from feedback
    const feedbackSkills = this.inferSkillsFromFeedback(user.feedbackReceived || []);
    for (const [skillName, data] of Object.entries(feedbackSkills)) {
      if (!skills.some(s => s.skillName.toLowerCase() === skillName.toLowerCase())) {
        skills.push({
          skillId: `inferred_${skillName}`,
          skillName,
          category: 'Inferred',
          currentLevel: data.level,
          proficiencyScore: this.levelToScore(data.level),
          lastAssessed: new Date(),
          assessmentSource: 'peer',
          evidence: data.evidence,
          trend: 'stable',
        });
      }
    }

    return skills;
  }

  private inferSkillsFromFeedback(feedbacks: any[]): Record<string, { level: SkillLevel; evidence: SkillEvidence[] }> {
    const skills: Record<string, { mentions: number; positive: number; evidence: SkillEvidence[] }> = {};

    const skillKeywords: Record<string, string[]> = {
      'Communication': ['communicate', 'presentation', 'explain', 'articulate'],
      'Leadership': ['lead', 'leadership', 'mentor', 'guide', 'direct'],
      'Technical': ['code', 'technical', 'architecture', 'system'],
      'Collaboration': ['collaborate', 'team', 'together', 'partner'],
      'Problem Solving': ['solve', 'solution', 'creative', 'innovative'],
    };

    for (const feedback of feedbacks) {
      const content = (feedback.content || '').toLowerCase();
      const isPositive = feedback.sentiment === 'positive' || !content.includes("needs improvement");

      for (const [skill, keywords] of Object.entries(skillKeywords)) {
        if (keywords.some(k => content.includes(k))) {
          if (!skills[skill]) {
            skills[skill] = { mentions: 0, positive: 0, evidence: [] };
          }
          skills[skill].mentions++;
          if (isPositive) skills[skill].positive++;
          skills[skill].evidence.push({
            type: 'feedback',
            description: 'Mentioned in peer feedback',
            date: feedback.createdAt,
          });
        }
      }
    }

    const result: Record<string, { level: SkillLevel; evidence: SkillEvidence[] }> = {};
    for (const [skill, data] of Object.entries(skills)) {
      if (data.mentions >= 2) {
        const positiveRatio = data.positive / data.mentions;
        const level: SkillLevel = positiveRatio > 0.8 ? 'advanced' :
          positiveRatio > 0.6 ? 'intermediate' : 'beginner';
        result[skill] = { level, evidence: data.evidence };
      }
    }

    return result;
  }

  private identifySkillGaps(
    userSkills: UserSkill[],
    requirements: { skillId: string; level: SkillLevel }[]
  ): SkillGapArea[] {
    const gaps: SkillGapArea[] = [];

    for (const req of requirements) {
      const userSkill = userSkills.find(s =>
        s.skillId === req.skillId || s.skillName.toLowerCase().includes(req.skillId.toLowerCase())
      );

      const currentLevel = userSkill?.currentLevel || 'novice';
      const currentScore = this.levelToScore(currentLevel);
      const requiredScore = this.levelToScore(req.level);

      if (currentScore < requiredScore) {
        gaps.push({
          skillId: req.skillId,
          skillName: userSkill?.skillName || req.skillId,
          currentLevel,
          requiredLevel: req.level,
          gapSeverity: this.getGapSeverity(currentScore, requiredScore),
          impact: `Required for current role`,
          recommendedActions: this.getGapRecommendations(req.skillId, currentLevel, req.level),
        });
      }
    }

    return gaps.sort((a, b) =>
      this.severityToNumber(b.gapSeverity) - this.severityToNumber(a.gapSeverity)
    );
  }

  private async getRecentSkillProgress(userId: string, tenantId: string): Promise<SkillProgress[]> {
    // Would fetch from skill history
    return [];
  }

  private calculateLearningVelocity(progress: SkillProgress[]): number {
    if (progress.length === 0) return 1;
    // Calculate skills improved per quarter
    return progress.length / 4;
  }

  private async getSkillsForRole(role: string, tenantId: string): Promise<string[]> {
    const paths = await this.getCareerPaths(tenantId);
    for (const path of paths) {
      for (const level of path.levels) {
        if (level.title.toLowerCase().includes(role.toLowerCase())) {
          return level.requiredSkills.map(s => s.skillId);
        }
      }
    }
    return [];
  }

  private async buildLearningMilestones(
    currentSkills: UserSkill[],
    targetSkills: string[],
    tenantId: string
  ): Promise<LearningMilestone[]> {
    const milestones: LearningMilestone[] = [];
    let order = 1;

    for (const skillId of targetSkills) {
      const current = currentSkills.find(s =>
        s.skillId === skillId || s.skillName.toLowerCase().includes(skillId.toLowerCase())
      );

      const currentLevel = current?.currentLevel || 'novice';
      const targetLevel: SkillLevel = 'intermediate'; // Default target

      if (this.levelToScore(currentLevel) < this.levelToScore(targetLevel)) {
        const resources = await this.recommendResources('', skillId, targetLevel, tenantId);

        milestones.push({
          id: `milestone_${order}`,
          name: `Develop ${skillId} Skills`,
          description: `Progress from ${currentLevel} to ${targetLevel} in ${skillId}`,
          order,
          resources: resources.slice(0, 3),
          skillsGained: [{ skillId, levelGained: targetLevel }],
          estimatedHours: this.estimateHoursForSkillGain(currentLevel, targetLevel),
          completed: false,
          assessmentRequired: true,
        });
        order++;
      }
    }

    return milestones;
  }

  private calculateMentorMatchScore(
    mentee: any,
    mentor: any,
    type: string
  ): { score: number; reasons: string[]; sharedSkills: string[]; complementarySkills: string[] } {
    let score = 0;
    const reasons: string[] = [];
    const sharedSkills: string[] = [];
    const complementarySkills: string[] = [];

    // Different department for diversity of thought
    if (mentee.departmentId !== mentor.departmentId) {
      score += 0.15;
      reasons.push('Cross-departmental perspective');
    }

    // Skill overlap
    const menteeSkills = new Set((mentee.skills || []).map((s: any) => s.name?.toLowerCase()));
    const mentorSkills = new Set((mentor.skills || []).map((s: any) => s.name?.toLowerCase()));

    for (const skill of menteeSkills) {
      if (mentorSkills.has(skill)) {
        sharedSkills.push(skill);
      }
    }

    for (const skill of mentorSkills) {
      if (!menteeSkills.has(skill)) {
        complementarySkills.push(skill);
      }
    }

    if (sharedSkills.length > 0) {
      score += Math.min(sharedSkills.length * 0.1, 0.3);
      reasons.push(`${sharedSkills.length} shared skills for guidance`);
    }

    if (complementarySkills.length > 0) {
      score += Math.min(complementarySkills.length * 0.05, 0.2);
      reasons.push(`${complementarySkills.length} skills to learn`);
    }

    // Base score for any potential mentor
    score += 0.35;
    reasons.push('Available for mentorship');

    return { score, reasons, sharedSkills, complementarySkills };
  }

  private async getCompetency(competencyId: string, tenantId: string): Promise<Competency | null> {
    // Would fetch from competency framework
    return {
      id: competencyId,
      name: 'Leadership',
      description: 'Ability to lead and influence others',
      category: 'Management',
      levels: [
        { level: 1, name: 'Developing', description: 'Learning to lead', expectations: [] },
        { level: 2, name: 'Proficient', description: 'Can lead small teams', expectations: [] },
        { level: 3, name: 'Advanced', description: 'Leads multiple teams', expectations: [] },
        { level: 4, name: 'Expert', description: 'Organizational leadership', expectations: [] },
      ],
      behaviors: [],
      relatedSkills: [],
      applicableRoles: [],
    };
  }

  private async getSelfAssessment(userId: string, competencyId: string, tenantId: string): Promise<CompetencyAssessment['assessments'][0] | null> {
    return {
      assessorId: userId,
      assessorRole: 'self',
      level: 2,
      evidence: ['Self-reflection based on recent projects'],
      date: new Date(),
    };
  }

  private async getManagerAssessment(userId: string, competencyId: string, tenantId: string): Promise<CompetencyAssessment['assessments'][0] | null> {
    return null; // Would fetch from assessments
  }

  private async getPeerAssessments(userId: string, competencyId: string, tenantId: string): Promise<CompetencyAssessment['assessments']> {
    return [];
  }

  private generateCompetencyRecommendations(
    competency: Competency,
    currentLevel: number,
    gap: number
  ): string[] {
    const recommendations: string[] = [];

    if (gap > 0) {
      recommendations.push(`Focus on developing ${competency.name.toLowerCase()} through stretch assignments`);
      recommendations.push(`Seek feedback from leaders who demonstrate strong ${competency.name.toLowerCase()}`);

      if (gap > 1) {
        recommendations.push(`Consider formal training in ${competency.name.toLowerCase()}`);
      }
    }

    return recommendations;
  }

  private async getLearningActivities(userId: string, period: string, tenantId: string): Promise<any[]> {
    // Would fetch from learning activity tracking
    return [];
  }

  private calculateLearningStreak(activities: any[]): number {
    // Calculate consecutive weeks with learning activity
    return 4; // Default
  }

  private async calculateLearningEffectiveness(userId: string, tenantId: string): Promise<LearningEffectiveness> {
    return {
      knowledgeRetention: 75,
      skillApplication: 70,
      performanceImpact: 65,
      overallScore: 70,
    };
  }

  private generateLearningRecommendations(
    profile: UserSkillProfile,
    activities: any[],
    effectiveness: LearningEffectiveness
  ): string[] {
    const recommendations: string[] = [];

    if (profile.gapAreas.some(g => g.gapSeverity === 'critical')) {
      recommendations.push('Prioritize closing critical skill gaps');
    }

    if (effectiveness.skillApplication < 70) {
      recommendations.push('Focus on hands-on projects to apply learned skills');
    }

    if (profile.learningVelocity < 1) {
      recommendations.push('Increase learning frequency - aim for at least 2 hours per week');
    }

    recommendations.push('Set specific learning goals for the next quarter');

    return recommendations;
  }

  private async getAllResources(skillId: string, tenantId: string): Promise<LearningResource[]> {
    // Would fetch from learning resource catalog
    return [
      {
        id: 'course_1',
        type: 'course',
        title: `${skillId} Fundamentals`,
        description: 'Comprehensive introduction course',
        provider: 'Internal',
        duration: 10,
        cost: 0,
        rating: 4.5,
        skillsCovered: [skillId],
        difficulty: 'beginner',
        format: 'self_paced',
      },
      {
        id: 'course_2',
        type: 'course',
        title: `Advanced ${skillId}`,
        description: 'Deep dive into advanced topics',
        provider: 'External',
        duration: 20,
        cost: 200,
        rating: 4.7,
        skillsCovered: [skillId],
        difficulty: 'advanced',
        format: 'instructor_led',
      },
    ];
  }

  private isResourceAppropriate(
    resource: LearningResource,
    currentLevel: SkillLevel,
    targetLevel: SkillLevel
  ): boolean {
    const difficultyMap: Record<string, number> = {
      beginner: 1,
      intermediate: 2,
      advanced: 3,
    };

    const currentScore = this.levelToScore(currentLevel);
    const targetScore = this.levelToScore(targetLevel);
    const resourceScore = difficultyMap[resource.difficulty] || 2;

    // Resource should be at or slightly above current level
    return resourceScore >= Math.floor(currentScore / 25) && resourceScore <= Math.ceil(targetScore / 25);
  }

  private calculateResourceScore(
    resource: LearningResource,
    currentLevel: SkillLevel,
    targetLevel: SkillLevel
  ): number {
    let score = resource.rating * 20; // Base on rating

    // Free resources get a boost
    if (resource.cost === 0) score += 10;

    // Self-paced is more flexible
    if (resource.format === 'self_paced') score += 5;

    // Shorter resources for smaller gaps
    const gap = this.levelToScore(targetLevel) - this.levelToScore(currentLevel);
    if (gap < 25 && resource.duration < 10) score += 10;

    return score;
  }

  private levelToScore(level: SkillLevel): number {
    const scores: Record<SkillLevel, number> = {
      novice: 10,
      beginner: 30,
      intermediate: 50,
      advanced: 75,
      expert: 95,
    };
    return scores[level] || 30;
  }

  private getGapSeverity(current: number, required: number): 'low' | 'medium' | 'high' | 'critical' {
    const gap = required - current;
    if (gap <= 15) return 'low';
    if (gap <= 30) return 'medium';
    if (gap <= 50) return 'high';
    return 'critical';
  }

  private severityToNumber(severity: string): number {
    const map: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    return map[severity] || 0;
  }

  private getGapRecommendations(skillId: string, current: SkillLevel, target: SkillLevel): string[] {
    return [
      `Complete ${skillId} training course`,
      `Practice through hands-on projects`,
      `Seek mentorship from ${skillId} expert`,
    ];
  }

  private estimateHoursForSkillGain(current: SkillLevel, target: SkillLevel): number {
    const gap = this.levelToScore(target) - this.levelToScore(current);
    return Math.max(10, gap * 2);
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const learningGrowthService = new LearningGrowthService(
  new PrismaClient(),
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
);
