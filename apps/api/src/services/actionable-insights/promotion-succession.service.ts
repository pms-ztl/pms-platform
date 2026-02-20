/**
 * Promotion & Succession Recommendation Service
 * Feature 46: Automated Promotion & Succession Recommendation System
 *
 * Implements collaborative filtering and content-based recommendation algorithms
 * for identifying high-potential employees for promotions and succession planning.
 */

import { prisma, Prisma } from '@pms/database';
import { MS_PER_DAY, DAYS, INACTIVE_USER_THRESHOLD_DAYS } from '../../utils/constants';
import { llmClient } from '../../modules/ai/llm-client';
import { logger } from '../../utils/logger';

export interface PromotionRecommendationInput {
  tenantId: string;
  userId: string;
  targetRole: string;
  targetLevel?: string;
  targetDepartment?: string;
}

export interface SuccessionPlanInput {
  tenantId: string;
  positionId: string;
  positionTitle: string;
  currentIncumbent?: string;
  criticality: string; // CRITICAL, HIGH, MEDIUM, LOW
}

export class PromotionSuccessionService {

  /**
   * Generate promotion recommendation using multi-factor scoring algorithm
   * Combines: performance, potential, skills match, leadership, tenure, engagement
   */
  async generatePromotionRecommendation(input: PromotionRecommendationInput) {
    const { tenantId, userId, targetRole, targetLevel, targetDepartment } = input;

    // Get user data and historical performance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        sentimentAnalyses: {
          orderBy: { analyzedAt: 'desc' },
          take: 30
        },
        engagementScores: {
          orderBy: { scoreDate: 'desc' },
          take: 12
        },
        performanceComparisons: {
          orderBy: { comparisonDate: 'desc' },
          take: 10
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate component scores
    const performanceScore = await this.calculatePerformanceScore(tenantId, userId);
    const potentialScore = await this.calculatePotentialScore(tenantId, userId);
    const skillsMatchScore = await this.calculateSkillsMatchScore(userId, targetRole);
    const leadershipScore = await this.calculateLeadershipScore(tenantId, userId);
    const tenureScore = this.calculateTenureScore(user.hireDate);
    const engagementScore = user.engagementScores[0]?.overallScore.toNumber() || 50;

    // Weighted overall score (customizable weights)
    const weights = {
      performance: 0.30,
      potential: 0.25,
      skillsMatch: 0.20,
      leadership: 0.15,
      tenure: 0.05,
      engagement: 0.05
    };

    const overallScore =
      performanceScore * weights.performance +
      potentialScore * weights.potential +
      skillsMatchScore * weights.skillsMatch +
      leadershipScore * weights.leadership +
      tenureScore * weights.tenure +
      engagementScore * weights.engagement;

    // Determine readiness level
    const readinessLevel = this.determineReadinessLevel(overallScore, performanceScore, skillsMatchScore);

    // Analyze skill gaps
    const skillGaps = await this.analyzeSkillGaps(userId, targetRole);

    // Generate development actions
    const developmentActions = this.generateDevelopmentActions(skillGaps, readinessLevel);

    // Calculate estimated time to ready
    const estimatedTimeToReady = this.calculateTimeToReady(readinessLevel, skillGaps);

    // Identify strengths and development needs
    const strengths = await this.identifyStrengths(userId, performanceScore, leadershipScore);
    const developmentNeeds = await this.identifyDevelopmentNeeds(skillGaps, leadershipScore);

    // Assess risks
    const riskFactors = await this.assessRiskFactors(tenantId, userId, engagementScore);

    // Calculate confidence and success probability
    const confidenceScore = this.calculateConfidence(performanceScore, potentialScore);
    const successProbability = this.calculateSuccessProbability(overallScore, skillsMatchScore);

    // ── LLM enrichment: generate AI-powered narrative insights ──
    try {
      if (llmClient.isAvailable) {
        const aiEnrichment = await this.enrichWithLLM({
          userName: `${user.firstName} ${user.lastName}`,
          targetRole,
          readinessLevel,
          overallScore,
          performanceScore,
          potentialScore,
          skillsMatchScore,
          leadershipScore,
          tenureScore,
          engagementScore,
          skillGaps,
          strengths,
          developmentNeeds,
          riskFactors,
        });
        if (aiEnrichment) {
          if (aiEnrichment.strengths?.length) strengths.push(...aiEnrichment.strengths);
          if (aiEnrichment.developmentNeeds?.length) developmentNeeds.push(...aiEnrichment.developmentNeeds);
          if (aiEnrichment.riskFactors?.length) riskFactors.push(...aiEnrichment.riskFactors);
          if (aiEnrichment.developmentActions?.length) developmentActions.push(...aiEnrichment.developmentActions);
        }
      }
    } catch (err) {
      logger.warn('LLM enrichment for promotion recommendation failed, using algorithmic results', { error: (err as Error).message });
    }

    // Create recommendation record
    const recommendation = await prisma.promotionRecommendation.create({
      data: {
        tenantId,
        userId,
        targetRole,
        targetLevel,
        targetDepartment,
        overallScore,
        readinessLevel,
        confidenceScore,
        performanceScore,
        potentialScore,
        skillsMatchScore,
        leadershipScore,
        tenureScore,
        engagementScore,
        strengths,
        developmentNeeds,
        skillGaps,
        riskFactors,
        developmentActions,
        estimatedTimeToReady,
        successProbability,
        recommendationType: 'PROMOTION',
        modelVersion: 'v1.0',
        expiresAt: new Date(Date.now() + DAYS(90)) // 90 days
      }
    });

    return recommendation;
  }

  /**
   * Calculate performance score based on historical performance data
   */
  private async calculatePerformanceScore(tenantId: string, userId: string): Promise<number> {
    // Get recent performance comparisons
    const comparisons = await prisma.performanceComparison.findMany({
      where: {
        tenantId,
        userId
      },
      orderBy: { comparisonDate: 'desc' },
      take: 5
    });

    if (comparisons.length === 0) return 50; // Default neutral score

    // Average percentile rank
    const avgPercentile = comparisons.reduce((sum, c) => sum + c.percentileRank.toNumber(), 0) / comparisons.length;

    // Convert percentile to 0-100 score
    return avgPercentile;
  }

  /**
   * Calculate potential score based on growth trajectory and learning agility
   */
  private async calculatePotentialScore(tenantId: string, userId: string): Promise<number> {
    let score = 50; // Base score

    // Get development plans and completion rate
    const devPlans = await prisma.developmentPlan.findMany({
      where: { tenantId, userId, status: { in: ['ACTIVE', 'COMPLETED'] } },
      take: 5
    });

    if (devPlans.length > 0) {
      const avgProgress = devPlans.reduce((sum, p) => sum + p.progressPercentage.toNumber(), 0) / devPlans.length;
      score += (avgProgress - 50) * 0.3; // Learning agility factor
    }

    // Get productivity predictions trend
    const predictions = await prisma.productivityPrediction.findMany({
      where: {
        tenantId,
        entityType: 'USER',
        entityId: userId
      },
      orderBy: { predictionDate: 'desc' },
      take: 6
    });

    if (predictions.length >= 2) {
      const recentScore = predictions[0].predictedScore.toNumber();
      const olderScore = predictions[predictions.length - 1].predictedScore.toNumber();
      const growthTrend = ((recentScore - olderScore) / olderScore) * 100;
      score += Math.min(growthTrend * 2, 20); // Cap growth bonus at +20
    }

    // Check for innovation contributions
    const innovations = await prisma.innovationContribution.findMany({
      where: { tenantId, contributorId: userId },
      take: 10
    });

    score += Math.min(innovations.length * 2, 15); // Up to +15 for innovations

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate skills match score using content-based filtering
   */
  private async calculateSkillsMatchScore(userId: string, targetRole: string): Promise<number> {
    // Get user's current skills
    const userSkills = await prisma.technicalSkillAssessment.findMany({
      where: { userId },
      include: { skillCategory: true }
    });

    // In a real implementation, this would compare against role requirements
    // For now, we'll use a simplified scoring based on skill levels
    if (userSkills.length === 0) return 40; // Low score if no skill data

    const avgSkillLevel = userSkills.reduce((sum, s) => sum + (s.proficiencyLevel || 0), 0) / userSkills.length;

    // Normalize to 0-100 scale (assuming skill levels are 1-5)
    const score = ((avgSkillLevel - 1) / 4) * 100;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate leadership score based on leadership competencies
   */
  private async calculateLeadershipScore(tenantId: string, userId: string): Promise<number> {
    const leadershipScores = await prisma.leadershipCompetencyScore.findMany({
      where: { tenantId, userId },
      orderBy: { assessmentDate: 'desc' },
      take: 5
    });

    if (leadershipScores.length === 0) return 50; // Neutral if no data

    const avgScore = leadershipScores.reduce((sum, s) => sum + s.score.toNumber(), 0) / leadershipScores.length;

    return avgScore;
  }

  /**
   * Calculate tenure score (experience factor)
   */
  private calculateTenureScore(hireDate: Date | null): number {
    if (!hireDate) return 50;

    const monthsOfTenure = Math.floor((Date.now() - hireDate.getTime()) / DAYS(30));

    // Scoring curve: optimal at 24-60 months, lower for too short or too long
    if (monthsOfTenure < 12) return 30; // Too new
    if (monthsOfTenure < 24) return 60; // Relatively new
    if (monthsOfTenure < 60) return 85; // Optimal experience
    if (monthsOfTenure < 120) return 70; // Experienced
    return 60; // Very long tenure (may be comfortable in current role)
  }

  /**
   * Determine readiness level based on scores
   */
  private determineReadinessLevel(overallScore: number, performanceScore: number, skillsMatchScore: number): string {
    if (overallScore >= 80 && performanceScore >= 75 && skillsMatchScore >= 70) {
      return 'READY_NOW';
    } else if (overallScore >= 70 && performanceScore >= 65) {
      return 'READY_1_YEAR';
    } else if (overallScore >= 60) {
      return 'READY_2_YEARS';
    } else {
      return 'NEEDS_DEVELOPMENT';
    }
  }

  /**
   * Analyze skill gaps for target role
   */
  private async analyzeSkillGaps(userId: string, targetRole: string) {
    // In real implementation, this would compare user skills against role requirements
    // For now, return a structure showing gap analysis
    const userSkills = await prisma.technicalSkillAssessment.findMany({
      where: { userId },
      include: { skillCategory: true }
    });

    const gaps: Record<string, any> = {};

    // Simulated role requirements (would come from a role requirements database)
    const roleRequirements = this.getRoleRequirements(targetRole);

    for (const req of roleRequirements) {
      const userSkill = userSkills.find(s => s.skillName === req.skillName);
      const userLevel = userSkill?.proficiencyLevel || 0;
      const requiredLevel = req.requiredLevel;

      if (userLevel < requiredLevel) {
        gaps[req.skillName] = {
          current: userLevel,
          required: requiredLevel,
          gap: requiredLevel - userLevel,
          priority: req.priority
        };
      }
    }

    return gaps;
  }

  /**
   * Get role requirements (simplified - would be from database in production)
   */
  private getRoleRequirements(targetRole: string) {
    // This is a simplified example
    const requirements: Record<string, any[]> = {
      'Senior Software Engineer': [
        { skillName: 'System Design', requiredLevel: 4, priority: 'HIGH' },
        { skillName: 'Code Review', requiredLevel: 4, priority: 'HIGH' },
        { skillName: 'Mentoring', requiredLevel: 3, priority: 'MEDIUM' },
        { skillName: 'Technical Leadership', requiredLevel: 3, priority: 'HIGH' }
      ],
      'Engineering Manager': [
        { skillName: 'People Management', requiredLevel: 4, priority: 'HIGH' },
        { skillName: 'Strategic Planning', requiredLevel: 3, priority: 'HIGH' },
        { skillName: 'Stakeholder Management', requiredLevel: 4, priority: 'HIGH' },
        { skillName: 'Budget Management', requiredLevel: 3, priority: 'MEDIUM' }
      ]
    };

    return requirements[targetRole] || [];
  }

  /**
   * Generate development actions based on gaps
   */
  private generateDevelopmentActions(skillGaps: Record<string, any>, readinessLevel: string) {
    const actions: any[] = [];

    // Prioritize high-priority gaps
    const priorityGaps = Object.entries(skillGaps)
      .filter(([_, gap]: [string, any]) => gap.priority === 'HIGH')
      .sort((a, b) => b[1].gap - a[1].gap);

    for (const [skill, gap] of priorityGaps.slice(0, 5)) {
      actions.push({
        skillName: skill,
        currentLevel: gap.current,
        targetLevel: gap.required,
        actions: [
          `Complete advanced ${skill} training course`,
          `Work on project requiring ${skill} application`,
          `Seek mentorship from expert in ${skill}`
        ],
        estimatedDuration: gap.gap * 3, // months
        priority: gap.priority
      });
    }

    // Add general development based on readiness level
    if (readinessLevel === 'NEEDS_DEVELOPMENT') {
      actions.push({
        skillName: 'Foundation Building',
        actions: [
          'Focus on improving current role performance to "Exceeds Expectations"',
          'Demonstrate consistent high performance over 6-12 months',
          'Take on stretch assignments to build capability'
        ],
        estimatedDuration: 12,
        priority: 'HIGH'
      });
    }

    return actions;
  }

  /**
   * Calculate estimated time to ready (in months)
   */
  private calculateTimeToReady(readinessLevel: string, skillGaps: Record<string, any>): number {
    const baseTime = {
      'READY_NOW': 0,
      'READY_1_YEAR': 12,
      'READY_2_YEARS': 24,
      'NEEDS_DEVELOPMENT': 36
    };

    let time = baseTime[readinessLevel] || 36;

    // Adjust based on number and severity of gaps
    const gapCount = Object.keys(skillGaps).length;
    const highPriorityGaps = Object.values(skillGaps).filter((g: any) => g.priority === 'HIGH').length;

    time += highPriorityGaps * 3; // Add 3 months per high-priority gap
    time += (gapCount - highPriorityGaps) * 1; // Add 1 month per other gap

    return Math.min(time, 48); // Cap at 4 years
  }

  /**
   * Identify strengths based on high scores
   */
  private async identifyStrengths(userId: string, performanceScore: number, leadershipScore: number): Promise<string[]> {
    const strengths: string[] = [];

    if (performanceScore >= 80) {
      strengths.push('Consistently high performance with strong track record');
    }

    if (leadershipScore >= 75) {
      strengths.push('Strong leadership competencies demonstrated');
    }

    // Check engagement
    const recentEngagement = await prisma.engagementScore.findFirst({
      where: { userId },
      orderBy: { scoreDate: 'desc' }
    });

    if (recentEngagement && recentEngagement.overallScore.toNumber() >= 75) {
      strengths.push('High engagement and commitment to organization');
    }

    // Check innovation
    const innovations = await prisma.innovationContribution.count({
      where: { contributorId: userId }
    });

    if (innovations >= 3) {
      strengths.push('Track record of innovation and creative problem-solving');
    }

    return strengths;
  }

  /**
   * Identify development needs
   */
  private async identifyDevelopmentNeeds(skillGaps: Record<string, any>, leadershipScore: number): Promise<string[]> {
    const needs: string[] = [];

    const highPriorityGaps = Object.entries(skillGaps)
      .filter(([_, gap]: [string, any]) => gap.priority === 'HIGH');

    for (const [skill, _] of highPriorityGaps) {
      needs.push(`Develop ${skill} capability to required level`);
    }

    if (leadershipScore < 60) {
      needs.push('Build leadership and people management skills');
    }

    return needs;
  }

  /**
   * Assess risk factors for promotion success
   */
  private async assessRiskFactors(tenantId: string, userId: string, engagementScore: number): Promise<string[]> {
    const risks: string[] = [];

    // Low engagement risk
    if (engagementScore < 50) {
      risks.push('Low engagement score may indicate lack of commitment');
    }

    // Flight risk
    const anomalies = await prisma.anomalyDetection.findMany({
      where: {
        tenantId,
        entityType: 'USER',
        entityId: userId,
        anomalyTypes: { hasSome: ['DISENGAGEMENT', 'FLIGHT_RISK'] },
        status: 'ACTIVE'
      }
    });

    if (anomalies.length > 0) {
      risks.push('Disengagement or flight risk indicators detected');
    }

    // Sentiment risk
    const recentSentiment = await prisma.sentimentAnalysis.findFirst({
      where: { tenantId, userId },
      orderBy: { analyzedAt: 'desc' }
    });

    if (recentSentiment && recentSentiment.sentimentScore.toNumber() < -0.3) {
      risks.push('Negative sentiment trend may affect motivation');
    }

    return risks;
  }

  /**
   * Calculate confidence score for recommendation
   */
  private calculateConfidence(performanceScore: number, potentialScore: number): number {
    // Higher confidence when both performance and potential are high and aligned
    const avgScore = (performanceScore + potentialScore) / 2;
    const alignment = 100 - Math.abs(performanceScore - potentialScore);

    const confidence = (avgScore * 0.7 + alignment * 0.3) / 100;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate success probability
   */
  private calculateSuccessProbability(overallScore: number, skillsMatchScore: number): number {
    // Success probability based on overall score and skills match
    const scoreFactor = overallScore / 100;
    const skillsFactor = skillsMatchScore / 100;

    const probability = (scoreFactor * 0.6 + skillsFactor * 0.4);

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Create succession plan for a critical position
   */
  async createSuccessionPlan(input: SuccessionPlanInput) {
    const { tenantId, positionId, positionTitle, currentIncumbent, criticality } = input;

    // Get all potential successors based on role and department
    const candidates = await this.identifySuccessionCandidates(tenantId, positionTitle);

    // Rank candidates by readiness
    const rankedSuccessors = candidates
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10); // Top 10 candidates

    // Format successors with readiness assessment
    const successors = rankedSuccessors.map(c => ({
      userId: c.userId,
      readiness: c.readinessLevel,
      overallScore: c.overallScore,
      probability: c.successProbability,
      strengths: c.strengths,
      developmentNeeds: c.developmentNeeds
    }));

    // Identify emergency backup (highest readiness)
    const emergencyBackup = rankedSuccessors.find(s => s.readinessLevel === 'READY_NOW')?.userId;

    // Calculate bench strength
    const readyNowCount = rankedSuccessors.filter(s => s.readinessLevel === 'READY_NOW').length;

    // Assess turnover risk for current incumbent
    let turnoverRisk = 'LOW';
    if (currentIncumbent) {
      const anomalies = await prisma.anomalyDetection.findMany({
        where: {
          tenantId,
          entityType: 'USER',
          entityId: currentIncumbent,
          anomalyTypes: { hasSome: ['DISENGAGEMENT', 'FLIGHT_RISK'] },
          status: 'ACTIVE'
        }
      });

      if (anomalies.length > 0) {
        turnoverRisk = 'HIGH';
      }
    }

    // Create succession plan
    const plan = await prisma.successionPlan.create({
      data: {
        tenantId,
        positionId,
        positionTitle,
        currentIncumbent,
        criticality,
        turnoverRisk,
        vacancyImpact: this.determineVacancyImpact(criticality),
        successors,
        emergencyBackup,
        benchStrength: readyNowCount,
        nextReviewDate: new Date(Date.now() + DAYS(90)) // 90 days
      }
    });

    return plan;
  }

  /**
   * Identify succession candidates for a position
   */
  private async identifySuccessionCandidates(tenantId: string, positionTitle: string) {
    // Get recent promotion recommendations for this role
    const recommendations = await prisma.promotionRecommendation.findMany({
      where: {
        tenantId,
        targetRole: positionTitle,
        status: { notIn: ['REJECTED'] }
      },
      orderBy: { overallScore: 'desc' },
      take: 20
    });

    return recommendations.map(r => ({
      userId: r.userId,
      readinessLevel: r.readinessLevel,
      overallScore: r.overallScore.toNumber(),
      successProbability: r.successProbability?.toNumber() || 0,
      strengths: r.strengths,
      developmentNeeds: r.developmentNeeds
    }));
  }

  /**
   * Determine vacancy impact based on criticality
   */
  private determineVacancyImpact(criticality: string): string {
    const impactMap: Record<string, string> = {
      'CRITICAL': 'SEVERE',
      'HIGH': 'SIGNIFICANT',
      'MEDIUM': 'MODERATE',
      'LOW': 'MINIMAL'
    };

    return impactMap[criticality] || 'MODERATE';
  }

  /**
   * Get promotion recommendations for a user
   */
  async getUserPromotionRecommendations(tenantId: string, userId: string) {
    return await prisma.promotionRecommendation.findMany({
      where: { tenantId, userId },
      orderBy: { generatedAt: 'desc' }
    });
  }

  /**
   * Get succession plans for organization
   */
  async getSuccessionPlans(tenantId: string, filters?: { criticality?: string }) {
    return await prisma.successionPlan.findMany({
      where: {
        tenantId,
        ...(filters?.criticality && { criticality: filters.criticality })
      },
      orderBy: { criticality: 'desc' }
    });
  }

  /**
   * Approve promotion recommendation
   */
  async approveRecommendation(recommendationId: string, approvedBy: string) {
    return await prisma.promotionRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date()
      }
    });
  }

  /**
   * LLM-powered enrichment for promotion recommendations.
   * Generates personalized narrative insights using AI.
   */
  private async enrichWithLLM(ctx: {
    userName: string; targetRole: string; readinessLevel: string; overallScore: number;
    performanceScore: number; potentialScore: number; skillsMatchScore: number;
    leadershipScore: number; tenureScore: number; engagementScore: number;
    skillGaps: Record<string, any>; strengths: string[]; developmentNeeds: string[]; riskFactors: string[];
  }) {
    const gapSummary = Object.entries(ctx.skillGaps)
      .map(([skill, gap]: [string, any]) => `${skill}: current ${gap.current}/${gap.required} (gap: ${gap.gap})`)
      .join(', ') || 'No significant gaps';

    const prompt = `You are an expert HR talent advisor. Analyze this employee's promotion readiness and provide specific, actionable insights.

Employee: ${ctx.userName}
Target Role: ${ctx.targetRole}
Readiness Level: ${ctx.readinessLevel} (Overall Score: ${ctx.overallScore.toFixed(1)}/100)

Score Breakdown:
- Performance: ${ctx.performanceScore.toFixed(1)}/100
- Potential: ${ctx.potentialScore.toFixed(1)}/100
- Skills Match: ${ctx.skillsMatchScore.toFixed(1)}/100
- Leadership: ${ctx.leadershipScore.toFixed(1)}/100
- Tenure: ${ctx.tenureScore.toFixed(1)}/100
- Engagement: ${ctx.engagementScore.toFixed(1)}/100

Skill Gaps: ${gapSummary}
Current Strengths: ${ctx.strengths.join('; ') || 'None identified'}
Known Risks: ${ctx.riskFactors.join('; ') || 'None'}

Respond in strict JSON (no markdown):
{
  "strengths": ["2-3 specific AI-identified strengths based on the score profile"],
  "developmentNeeds": ["2-3 targeted development areas with specific recommendations"],
  "riskFactors": ["1-2 risks to monitor if any, or empty array"],
  "developmentActions": [{"skillName": "...", "actions": ["specific action 1", "specific action 2"], "estimatedDuration": 3, "priority": "HIGH"}]
}`;

    const response = await llmClient.generateText(prompt, {
      maxTokens: 800,
      temperature: 0.4,
    });

    try {
      const cleaned = response.content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      logger.warn('Failed to parse LLM promotion enrichment response');
      return null;
    }
  }

  /**
   * Reject promotion recommendation
   */
  async rejectRecommendation(recommendationId: string, reviewedBy: string, rejectionReason: string) {
    return await prisma.promotionRecommendation.update({
      where: { id: recommendationId },
      data: {
        status: 'REJECTED',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason
      }
    });
  }
}
