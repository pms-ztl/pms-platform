/**
 * Team Formation & Restructuring Optimizer Service
 * Feature 48: Team Formation & Restructuring Optimizer
 *
 * Implements recommendation engine for optimal team compositions using
 * skill matching algorithms, diversity optimization, and collaboration scoring.
 */

import { prisma, Prisma } from '@pms/database';
import { MS_PER_DAY, DAYS, INACTIVE_USER_THRESHOLD_DAYS } from '../../utils/constants';
import { llmClient } from '../../modules/ai/llm-client';
import { logger } from '../../utils/logger';

export interface TeamOptimizationInput {
  tenantId: string;
  optimizationType: string; // NEW_TEAM, RESTRUCTURE, EXPANSION, REBALANCE
  teamName: string;
  department?: string;
  teamSize: number;
  requiredSkills: any[];
  requiredCompetencies: any[];
  objectives?: any[];
  constraints?: any;
  targetTeamId?: string;
}

export class TeamOptimizationService {

  /**
   * Generate optimal team composition using multi-objective optimization
   */
  async optimizeTeamComposition(input: TeamOptimizationInput) {
    const {
      tenantId,
      optimizationType,
      teamName,
      department,
      teamSize,
      requiredSkills,
      requiredCompetencies,
      objectives = [],
      constraints = {},
      targetTeamId
    } = input;

    // Get candidate pool
    const candidates = await this.getCandidatePool(tenantId, department, constraints);

    // Score each candidate for team fit
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        const scores = await this.scoreCandidate(
          candidate,
          requiredSkills,
          requiredCompetencies,
          tenantId
        );
        return {
          ...candidate,
          scores
        };
      })
    );

    // Generate optimal team combinations
    const teamCombinations = this.generateTeamCombinations(
      scoredCandidates,
      teamSize,
      requiredSkills
    );

    // Score each combination
    const scoredCombinations = await Promise.all(
      teamCombinations.map(async (combination) => {
        return await this.scoreTeamCombination(combination, tenantId, requiredSkills);
      })
    );

    // Select best combination
    const bestTeam = scoredCombinations.sort((a, b) => b.overallScore - a.overallScore)[0];

    // Generate alternative options
    const alternatives = scoredCombinations
      .filter(c => c.id !== bestTeam.id)
      .slice(0, 3)
      .map(c => ({
        members: c.members,
        overallScore: c.overallScore,
        rationale: c.rationale
      }));

    // Analyze team strengths and risks
    const strengthsAnalysis = this.analyzeTeamStrengths(bestTeam.members, requiredSkills);
    const risks = this.identifyTeamRisks(bestTeam.members);
    const skillGaps = this.identifySkillGaps(bestTeam.members, requiredSkills);
    const redundancies = this.identifyRedundancies(bestTeam.members);

    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(
      bestTeam,
      skillGaps,
      risks
    );

    // Create implementation steps
    let implementationSteps = this.createImplementationSteps(
      optimizationType,
      bestTeam.members
    );

    // ── LLM enrichment: generate AI-powered team optimization narratives ──
    try {
      if (llmClient.isAvailable) {
        const aiInsights = await this.enrichTeamOptimizationWithLLM({
          teamName,
          optimizationType,
          teamSize,
          overallScore: bestTeam.overallScore,
          skillCoverageScore: bestTeam.skillCoverageScore,
          diversityScore: bestTeam.diversityScore,
          collaborationScore: bestTeam.collaborationScore,
          strengthsAnalysis,
          risks,
          skillGaps,
          redundancies,
        });
        if (aiInsights) {
          if (aiInsights.strengthsAnalysis?.length) strengthsAnalysis.push(...aiInsights.strengthsAnalysis);
          if (aiInsights.risks?.length) risks.push(...aiInsights.risks);
          if (aiInsights.recommendations?.length) recommendations.push(...aiInsights.recommendations);
          if (aiInsights.implementationSteps?.length) implementationSteps = [...implementationSteps, ...aiInsights.implementationSteps];
        }
      }
    } catch (err) {
      logger.warn('LLM enrichment for team optimization failed, using algorithmic results', { error: (err as Error).message });
    }

    // Save optimization result
    const optimization = await prisma.teamOptimization.create({
      data: {
        tenantId,
        optimizationType,
        targetTeamId,
        teamName,
        department,
        objectives,
        constraints,
        requiredSkills,
        requiredCompetencies,
        teamSize,
        recommendedMembers: bestTeam.members.map(m => ({
          userId: m.userId,
          role: m.recommendedRole,
          score: m.scores.overall,
          rationale: m.scores.rationale,
          skills: m.skills
        })),
        alternativeOptions: alternatives,
        overallScore: bestTeam.overallScore,
        skillCoverageScore: bestTeam.skillCoverageScore,
        diversityScore: bestTeam.diversityScore,
        collaborationScore: bestTeam.collaborationScore,
        performanceScore: bestTeam.performanceScore,
        chemistryScore: bestTeam.chemistryScore,
        strengthsAnalysis,
        risks,
        skillGaps,
        redundancies,
        recommendations,
        implementationSteps,
        algorithmVersion: 'v1.0',
        confidence: this.calculateOptimizationConfidence(bestTeam, candidates.length)
      }
    });

    return optimization;
  }

  /**
   * Get candidate pool for team formation
   */
  private async getCandidatePool(tenantId: string, department?: string, constraints: any = {}) {
    const where: any = {
      tenantId,
      isActive: true
    };

    if (department) {
      where.departmentId = department;
    }

    // Apply constraints
    if (constraints.excludeUsers) {
      where.id = { notIn: constraints.excludeUsers };
    }

    if (constraints.minTenureMonths) {
      const minDate = new Date();
      minDate.setMonth(minDate.getMonth() - constraints.minTenureMonths);
      where.hireDate = { lte: minDate };
    }

    const users = await prisma.user.findMany({
      where,
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

    return users;
  }

  /**
   * Score individual candidate for team fit
   */
  private async scoreCandidate(
    candidate: any,
    requiredSkills: any[],
    requiredCompetencies: any[],
    tenantId: string
  ) {
    // Get candidate's skills
    const skills = await prisma.technicalSkillAssessment.findMany({
      where: { userId: candidate.id }
    });

    // Get candidate's competencies
    const competencies = await prisma.leadershipCompetencyScore.findMany({
      where: { tenantId, userId: candidate.id }
    });

    // Calculate skill match score
    const skillMatchScore = this.calculateSkillMatchScore(skills, requiredSkills);

    // Calculate competency match score
    const competencyMatchScore = this.calculateCompetencyMatchScore(competencies, requiredCompetencies);

    // Performance score
    const performanceScore = candidate.performanceComparisons[0]?.percentileRank.toNumber() || 50;

    // Engagement score
    const engagementScore = candidate.engagementScores[0]?.overallScore.toNumber() || 50;

    // Calculate collaboration potential (based on historical data)
    const collaborationScore = await this.estimateCollaborationScore(candidate.id, tenantId);

    // Overall candidate score
    const overall = (
      skillMatchScore * 0.35 +
      competencyMatchScore * 0.20 +
      performanceScore * 0.25 +
      engagementScore * 0.10 +
      collaborationScore * 0.10
    );

    return {
      overall,
      skillMatch: skillMatchScore,
      competencyMatch: competencyMatchScore,
      performance: performanceScore,
      engagement: engagementScore,
      collaboration: collaborationScore,
      rationale: this.generateCandidateRationale(overall, skillMatchScore, performanceScore),
      skills: skills.map(s => ({ name: s.skillName, level: s.proficiencyLevel }))
    };
  }

  /**
   * Calculate skill match score
   */
  private calculateSkillMatchScore(candidateSkills: any[], requiredSkills: any[]): number {
    if (requiredSkills.length === 0) return 100;

    let totalScore = 0;
    let totalWeight = 0;

    for (const req of requiredSkills) {
      const candidateSkill = candidateSkills.find(s =>
        s.skillName.toLowerCase() === req.skillName.toLowerCase()
      );

      const weight = req.weight || 1;
      totalWeight += weight;

      if (candidateSkill) {
        const level = candidateSkill.proficiencyLevel || 0;
        const required = req.minimumLevel || 3;
        const score = Math.min((level / required) * 100, 100);
        totalScore += score * weight;
      } else {
        // Missing skill - 0 score
        totalScore += 0;
      }
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Calculate competency match score
   */
  private calculateCompetencyMatchScore(candidateCompetencies: any[], requiredCompetencies: any[]): number {
    if (requiredCompetencies.length === 0) return 100;

    let totalScore = 0;
    let count = 0;

    for (const req of requiredCompetencies) {
      const candidateComp = candidateCompetencies.find(c =>
        c.competencyName.toLowerCase() === req.competencyName.toLowerCase()
      );

      if (candidateComp) {
        const score = candidateComp.score.toNumber();
        const required = req.minimumScore || 70;
        totalScore += Math.min((score / required) * 100, 100);
      } else {
        totalScore += 0;
      }
      count++;
    }

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Estimate collaboration score based on historical team interactions
   */
  private async estimateCollaborationScore(userId: string, tenantId: string): Promise<number> {
    // Check behavioral competency scores related to collaboration
    const behavioralScores = await prisma.behavioralCompetencyScore.findMany({
      where: {
        tenantId,
        userId,
        competencyName: { in: ['Collaboration', 'Teamwork', 'Communication'] }
      }
    });

    if (behavioralScores.length === 0) return 70; // Default neutral score

    const avgScore = behavioralScores.reduce((sum, s) => sum + s.score.toNumber(), 0) / behavioralScores.length;

    return avgScore;
  }

  /**
   * Generate rationale for candidate score
   */
  private generateCandidateRationale(overall: number, skillMatch: number, performance: number): string {
    if (overall >= 80) {
      return 'Excellent fit with strong skills and performance';
    } else if (overall >= 70) {
      return 'Good fit with some skill gaps that can be addressed';
    } else if (skillMatch >= 75) {
      return 'Strong technical skills, moderate performance history';
    } else if (performance >= 80) {
      return 'High performer with skill development needed';
    } else {
      return 'Developing candidate requiring support and training';
    }
  }

  /**
   * Generate team combinations using combinatorial optimization
   */
  private generateTeamCombinations(candidates: any[], teamSize: number, requiredSkills: any[]) {
    // For large candidate pools, use heuristic selection instead of brute force
    if (candidates.length > 20) {
      return this.heuristicTeamSelection(candidates, teamSize, requiredSkills);
    }

    // Generate combinations (simplified - would use more sophisticated algorithm in production)
    const combinations: any[] = [];

    // Greedy approach: Select top candidates and create variations
    const sorted = candidates.sort((a, b) => b.scores.overall - a.scores.overall);

    // Best team: Top N candidates
    combinations.push({
      id: 'best',
      members: sorted.slice(0, teamSize)
    });

    // Balanced team: Mix of high performers and diverse skills
    combinations.push({
      id: 'balanced',
      members: this.createBalancedTeam(candidates, teamSize, requiredSkills)
    });

    // Diverse team: Optimize for diversity
    combinations.push({
      id: 'diverse',
      members: this.createDiverseTeam(candidates, teamSize)
    });

    return combinations;
  }

  /**
   * Heuristic team selection for large candidate pools
   */
  private heuristicTeamSelection(candidates: any[], teamSize: number, requiredSkills: any[]) {
    const combinations: any[] = [];

    // Strategy 1: Skill coverage optimization
    const skillOptimized = this.optimizeForSkillCoverage(candidates, teamSize, requiredSkills);
    combinations.push({ id: 'skill-optimized', members: skillOptimized });

    // Strategy 2: Performance optimization
    const perfOptimized = candidates
      .sort((a, b) => b.scores.performance - a.scores.performance)
      .slice(0, teamSize);
    combinations.push({ id: 'performance-optimized', members: perfOptimized });

    // Strategy 3: Balanced approach
    const balanced = this.createBalancedTeam(candidates, teamSize, requiredSkills);
    combinations.push({ id: 'balanced', members: balanced });

    return combinations;
  }

  /**
   * Optimize team for skill coverage
   */
  private optimizeForSkillCoverage(candidates: any[], teamSize: number, requiredSkills: any[]) {
    const selected: any[] = [];
    const coveredSkills = new Set<string>();

    // First pass: Select candidates that cover unique required skills
    for (const candidate of candidates) {
      if (selected.length >= teamSize) break;

      const candidateSkills = candidate.scores.skills.map((s: any) => s.name.toLowerCase());
      const newSkills = candidateSkills.filter((s: string) => {
        return requiredSkills.some(rs => rs.skillName.toLowerCase() === s) && !coveredSkills.has(s);
      });

      if (newSkills.length > 0) {
        selected.push(candidate);
        newSkills.forEach(s => coveredSkills.add(s));
      }
    }

    // Second pass: Fill remaining slots with highest scoring candidates
    const remaining = candidates
      .filter(c => !selected.includes(c))
      .sort((a, b) => b.scores.overall - a.scores.overall);

    while (selected.length < teamSize && remaining.length > 0) {
      selected.push(remaining.shift());
    }

    return selected;
  }

  /**
   * Create balanced team composition
   */
  private createBalancedTeam(candidates: any[], teamSize: number, requiredSkills: any[]) {
    const team: any[] = [];

    // 50% high performers
    const highPerformers = candidates
      .filter(c => c.scores.performance >= 75)
      .sort((a, b) => b.scores.overall - a.scores.overall)
      .slice(0, Math.ceil(teamSize * 0.5));

    team.push(...highPerformers);

    // 30% skill specialists
    const specialists = candidates
      .filter(c => !team.includes(c) && c.scores.skillMatch >= 80)
      .sort((a, b) => b.scores.skillMatch - a.scores.skillMatch)
      .slice(0, Math.ceil(teamSize * 0.3));

    team.push(...specialists);

    // Fill remaining with best available
    const remaining = candidates
      .filter(c => !team.includes(c))
      .sort((a, b) => b.scores.overall - a.scores.overall)
      .slice(0, teamSize - team.length);

    team.push(...remaining);

    return team.slice(0, teamSize);
  }

  /**
   * Create diverse team composition
   */
  private createDiverseTeam(candidates: any[], teamSize: number) {
    // Simplified diversity optimization - would use more sophisticated algorithm in production
    const team: any[] = [];
    const selectedDepartments = new Set<string>();

    // Select from different departments when possible
    for (const candidate of candidates) {
      if (team.length >= teamSize) break;

      if (!selectedDepartments.has(candidate.departmentId || 'none')) {
        team.push(candidate);
        selectedDepartments.add(candidate.departmentId || 'none');
      }
    }

    // Fill remaining with highest scores
    const remaining = candidates
      .filter(c => !team.includes(c))
      .sort((a, b) => b.scores.overall - a.scores.overall);

    while (team.length < teamSize && remaining.length > 0) {
      team.push(remaining.shift());
    }

    return team;
  }

  /**
   * Score team combination on multiple dimensions
   */
  private async scoreTeamCombination(combination: any, tenantId: string, requiredSkills: any[]) {
    const members = combination.members;

    // Overall score: Average of individual scores
    const overallScore = members.reduce((sum: number, m: any) => sum + m.scores.overall, 0) / members.length;

    // Skill coverage score
    const skillCoverageScore = this.calculateSkillCoverage(members, requiredSkills);

    // Diversity score
    const diversityScore = this.calculateDiversityScore(members);

    // Collaboration score (team chemistry)
    const collaborationScore = members.reduce((sum: number, m: any) => sum + m.scores.collaboration, 0) / members.length;

    // Performance score
    const performanceScore = members.reduce((sum: number, m: any) => sum + m.scores.performance, 0) / members.length;

    // Chemistry score (based on past collaboration)
    const chemistryScore = await this.estimateTeamChemistry(members.map((m: any) => m.id), tenantId);

    return {
      ...combination,
      overallScore,
      skillCoverageScore,
      diversityScore,
      collaborationScore,
      performanceScore,
      chemistryScore,
      rationale: this.generateTeamRationale(overallScore, skillCoverageScore, diversityScore)
    };
  }

  /**
   * Calculate skill coverage for team
   */
  private calculateSkillCoverage(members: any[], requiredSkills: any[]): number {
    if (requiredSkills.length === 0) return 100;

    const teamSkills = new Map<string, number>();

    // Aggregate team skills (max level per skill)
    for (const member of members) {
      for (const skill of member.scores.skills) {
        const current = teamSkills.get(skill.name.toLowerCase()) || 0;
        teamSkills.set(skill.name.toLowerCase(), Math.max(current, skill.level));
      }
    }

    // Check coverage of required skills
    let coveredCount = 0;
    let totalRequirement = 0;

    for (const req of requiredSkills) {
      const teamLevel = teamSkills.get(req.skillName.toLowerCase()) || 0;
      const requiredLevel = req.minimumLevel || 3;

      if (teamLevel >= requiredLevel) {
        coveredCount++;
      }

      totalRequirement += requiredLevel;
    }

    const coveragePercentage = requiredSkills.length > 0 ? (coveredCount / requiredSkills.length) * 100 : 100;

    return coveragePercentage;
  }

  /**
   * Calculate diversity score (simplified)
   */
  private calculateDiversityScore(members: any[]): number {
    const departments = new Set(members.map(m => m.departmentId).filter(Boolean));
    const levels = new Set(members.map(m => m.level));

    // Score based on variety
    const deptDiversity = (departments.size / Math.min(members.length, 5)) * 50;
    const levelDiversity = (levels.size / Math.min(members.length, 4)) * 50;

    return Math.min(deptDiversity + levelDiversity, 100);
  }

  /**
   * Estimate team chemistry based on past collaboration
   */
  private async estimateTeamChemistry(userIds: string[], tenantId: string): Promise<number> {
    const [behavioralScores, sentiments] = await Promise.all([
      prisma.behavioralCompetencyScore.findMany({
        where: { tenantId, userId: { in: userIds }, competencyName: { in: ['Collaboration', 'Teamwork', 'Communication'] } },
      }),
      prisma.communicationSentiment.findMany({
        where: { tenantId, userId: { in: userIds } },
        orderBy: { analyzedAt: 'desc' },
        take: userIds.length * 5,
      }),
    ]);

    let total = 0;
    let count = 0;
    if (behavioralScores.length > 0) {
      total += behavioralScores.reduce((s, b) => s + b.score.toNumber(), 0) / behavioralScores.length;
      count++;
    }
    if (sentiments.length > 0) {
      const avgSentiment = sentiments.reduce((s, c) => s + c.sentimentScore.toNumber(), 0) / sentiments.length;
      total += (avgSentiment + 1) * 50; // Normalize -1..1 to 0..100
      count++;
    }
    return count > 0 ? Math.round(total / count) : 0;
  }

  /**
   * Generate team composition rationale
   */
  private generateTeamRationale(overall: number, skillCoverage: number, diversity: number): string {
    if (overall >= 85 && skillCoverage >= 90) {
      return 'Optimal team with excellent skill coverage and performance';
    } else if (skillCoverage >= 85) {
      return 'Strong skill coverage with good overall performance';
    } else if (diversity >= 80) {
      return 'Highly diverse team with varied perspectives';
    } else {
      return 'Balanced team with opportunity for development';
    }
  }

  /**
   * Analyze team strengths
   */
  private analyzeTeamStrengths(members: any[], requiredSkills: any[]): string[] {
    const strengths: string[] = [];

    const avgPerformance = members.reduce((sum, m) => sum + m.scores.performance, 0) / members.length;
    if (avgPerformance >= 80) {
      strengths.push('High-performing team with strong track records');
    }

    const avgEngagement = members.reduce((sum, m) => sum + m.scores.engagement, 0) / members.length;
    if (avgEngagement >= 75) {
      strengths.push('Highly engaged team members');
    }

    // Check skill depth
    const skillCoverage = this.calculateSkillCoverage(members, requiredSkills);
    if (skillCoverage >= 90) {
      strengths.push('Comprehensive skill coverage across all required areas');
    }

    return strengths;
  }

  /**
   * Identify team risks
   */
  private identifyTeamRisks(members: any[]): string[] {
    const risks: string[] = [];

    const lowEngagement = members.filter(m => m.scores.engagement < 50).length;
    if (lowEngagement > members.length * 0.2) {
      risks.push('20%+ of team members show low engagement');
    }

    const lowPerformers = members.filter(m => m.scores.performance < 60).length;
    if (lowPerformers > 0) {
      risks.push(`${lowPerformers} team member(s) with below-average performance`);
    }

    return risks;
  }

  /**
   * Identify skill gaps in team
   */
  private identifySkillGaps(members: any[], requiredSkills: any[]) {
    const gaps: any = {};
    const teamSkills = new Map<string, number>();

    for (const member of members) {
      for (const skill of member.scores.skills) {
        const current = teamSkills.get(skill.name.toLowerCase()) || 0;
        teamSkills.set(skill.name.toLowerCase(), Math.max(current, skill.level));
      }
    }

    for (const req of requiredSkills) {
      const teamLevel = teamSkills.get(req.skillName.toLowerCase()) || 0;
      const requiredLevel = req.minimumLevel || 3;

      if (teamLevel < requiredLevel) {
        gaps[req.skillName] = {
          current: teamLevel,
          required: requiredLevel,
          gap: requiredLevel - teamLevel
        };
      }
    }

    return gaps;
  }

  /**
   * Identify skill redundancies
   */
  private identifyRedundancies(members: any[]): string[] {
    const skillCounts = new Map<string, number>();

    for (const member of members) {
      for (const skill of member.scores.skills) {
        const count = skillCounts.get(skill.name) || 0;
        skillCounts.set(skill.name, count + 1);
      }
    }

    const redundancies: string[] = [];
    for (const [skill, count] of skillCounts.entries()) {
      if (count > members.length * 0.7) {
        redundancies.push(`${skill} (${count}/${members.length} members)`);
      }
    }

    return redundancies;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(team: any, skillGaps: any, risks: string[]) {
    const recommendations: any[] = [];

    // Address skill gaps
    const gaps = Object.entries(skillGaps);
    if (gaps.length > 0) {
      recommendations.push({
        type: 'SKILL_DEVELOPMENT',
        priority: 'HIGH',
        description: 'Address skill gaps through training or additional hiring',
        actions: gaps.map(([skill, _]) => `Provide training in ${skill}`)
      });
    }

    // Address risks
    if (risks.length > 0) {
      recommendations.push({
        type: 'RISK_MITIGATION',
        priority: 'MEDIUM',
        description: 'Mitigate identified team risks',
        actions: [
          'Conduct engagement surveys',
          'Provide coaching for lower performers',
          'Establish team building activities'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Create implementation steps
   */
  private createImplementationSteps(optimizationType: string, members: any[]) {
    const steps: any[] = [];

    if (optimizationType === 'NEW_TEAM') {
      steps.push(
        { step: 1, action: 'Obtain approval for team formation', owner: 'Manager', timeline: 'Week 1' },
        { step: 2, action: 'Notify selected team members', owner: 'HR', timeline: 'Week 2' },
        { step: 3, action: 'Conduct team kickoff meeting', owner: 'Team Lead', timeline: 'Week 3' },
        { step: 4, action: 'Establish team norms and objectives', owner: 'Team', timeline: 'Week 4' }
      );
    } else if (optimizationType === 'RESTRUCTURE') {
      steps.push(
        { step: 1, action: 'Communicate restructuring plan', owner: 'Leadership', timeline: 'Week 1' },
        { step: 2, action: 'Handle transitions and reassignments', owner: 'HR', timeline: 'Week 2-3' },
        { step: 3, action: 'Conduct transition meetings', owner: 'Managers', timeline: 'Week 4' }
      );
    }

    return steps;
  }

  /**
   * Calculate optimization confidence
   */
  private calculateOptimizationConfidence(bestTeam: any, candidatePoolSize: number): number {
    let confidence = 0.5;

    // Higher confidence with larger candidate pool
    if (candidatePoolSize >= 20) confidence += 0.2;
    if (candidatePoolSize >= 50) confidence += 0.1;

    // Higher confidence with strong overall score
    if (bestTeam.overallScore >= 80) confidence += 0.15;
    if (bestTeam.skillCoverageScore >= 90) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  /**
   * Analyze existing team composition
   */
  async analyzeTeamComposition(teamId: string) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
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
            }
          }
        }
      }
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const teamSize = team.members.length;
    const members = team.members.map(m => m.user);

    // Calculate metrics
    const avgTenure = this.calculateAverageTenure(members);
    const avgPerformanceScore = this.calculateAveragePerformance(members);
    const diversityMetrics = this.calculateDiversityMetrics(members);
    const skillDistribution = await this.analyzeSkillDistribution(members.map(m => m.id));
    const seniorityMix = this.analyzeSeniorityMix(members);

    // Performance metrics — computed from real DB data
    const productivityScore = avgPerformanceScore;
    const memberIds = members.map((m: any) => m.id);
    const collaborationScore = await this.estimateTeamChemistry(memberIds, team.tenantId);
    const innovationContributions = await prisma.innovationContribution.count({
      where: { tenantId: team.tenantId, contributorId: { in: memberIds } },
    });
    const innovationScore = Math.min(50 + innovationContributions * 5, 100);

    // Health indicators
    const turnoverRisk = this.assessTurnoverRisk(members);
    const burnoutRisk = this.assessBurnoutRisk(members);
    const engagementLevel = this.assessEngagementLevel(members);

    // Identify gaps and strengths
    const skillGaps = []; // Would analyze against team objectives
    const skillSurplus = [];
    const keyStrengths = this.identifyKeyStrengths(members, avgPerformanceScore);
    const vulnerabilities = this.identifyVulnerabilities(members);

    // Generate recommendations
    const recommendations = this.generateTeamRecommendations(
      turnoverRisk,
      burnoutRisk,
      skillGaps
    );

    const analysis = await prisma.teamCompositionAnalysis.create({
      data: {
        tenantId: team.tenantId,
        teamId,
        analysisDate: new Date(),
        analysisPeriod: 'CURRENT',
        teamSize,
        avgTenure,
        avgPerformanceScore,
        diversityMetrics,
        skillDistribution,
        seniorityMix,
        productivityScore,
        collaborationScore,
        innovationScore,
        turnoverRisk,
        burnoutRisk,
        engagementLevel,
        skillGaps,
        skillSurplus,
        keyStrengths,
        vulnerabilities,
        recommendations,
        priorityActions: recommendations.slice(0, 3).map((r: any) => r.action)
      }
    });

    return analysis;
  }

  // Helper methods for team analysis
  private calculateAverageTenure(members: any[]): number {
    const tenures = members
      .filter(m => m.hireDate)
      .map(m => Math.floor((Date.now() - m.hireDate.getTime()) / DAYS(30)));

    return tenures.length > 0 ? tenures.reduce((a, b) => a + b, 0) / tenures.length : 0;
  }

  private calculateAveragePerformance(members: any[]): number {
    const scores = members
      .filter(m => m.performanceComparisons[0])
      .map(m => m.performanceComparisons[0].percentileRank.toNumber());

    return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  }

  private calculateDiversityMetrics(members: any[]) {
    const departmentCount = new Set(members.map(m => m.departmentId).filter(Boolean)).size;
    const levelCount = new Set(members.map(m => m.level)).size;
    const totalMembers = members.length || 1;
    // Diversity score: weighted combination of department and level diversity relative to team size
    const deptDiversity = Math.min((departmentCount / totalMembers) * 100, 50);
    const levelDiversity = Math.min((levelCount / totalMembers) * 100, 50);
    return { departmentCount, levelCount, diversityScore: Math.round(deptDiversity + levelDiversity) };
  }

  private async analyzeSkillDistribution(userIds: string[]) {
    const skills = await prisma.technicalSkillAssessment.findMany({
      where: { userId: { in: userIds } }
    });

    const distribution: any = {};
    for (const skill of skills) {
      distribution[skill.skillName] = (distribution[skill.skillName] || 0) + 1;
    }

    return distribution;
  }

  private analyzeSeniorityMix(members: any[]) {
    const counts: any = { JUNIOR: 0, MID: 0, SENIOR: 0, PRINCIPAL: 0 };

    for (const member of members) {
      const title = member.jobTitle?.toLowerCase() || '';
      if (title.includes('senior') || title.includes('lead')) counts.SENIOR++;
      else if (title.includes('principal') || title.includes('staff')) counts.PRINCIPAL++;
      else if (title.includes('junior')) counts.JUNIOR++;
      else counts.MID++;
    }

    return counts;
  }

  private assessTurnoverRisk(members: any[]): string {
    const lowEngagement = members.filter(m =>
      m.engagementScores[0]?.overallScore.toNumber() < 50
    ).length;

    const riskPercentage = lowEngagement / members.length;
    if (riskPercentage > 0.3) return 'HIGH';
    if (riskPercentage > 0.15) return 'MEDIUM';
    return 'LOW';
  }

  private assessBurnoutRisk(members: any[]): string {
    // Check engagement scores for burnout indicators
    const atRisk = members.filter(m => {
      const score = m.engagementScores?.[0];
      return score && score.overallScore.toNumber() < 40;
    }).length;
    const riskPct = members.length > 0 ? atRisk / members.length : 0;
    if (riskPct > 0.3) return 'HIGH';
    if (riskPct > 0.15) return 'MEDIUM';
    return 'LOW';
  }

  private assessEngagementLevel(members: any[]): string {
    const avgEngagement = members
      .filter(m => m.engagementScores[0])
      .reduce((sum, m) => sum + m.engagementScores[0].overallScore.toNumber(), 0) / members.length;

    if (avgEngagement >= 75) return 'HIGH';
    if (avgEngagement >= 60) return 'MEDIUM';
    return 'LOW';
  }

  private identifyKeyStrengths(members: any[], avgPerformance: number): string[] {
    const strengths: string[] = [];

    if (avgPerformance >= 75) {
      strengths.push('High-performing team with strong results');
    }

    return strengths;
  }

  private identifyVulnerabilities(members: any[]): string[] {
    const vulnerabilities: string[] = [];

    const newMembers = members.filter(m =>
      m.hireDate && (Date.now() - m.hireDate.getTime()) < DAYS(INACTIVE_USER_THRESHOLD_DAYS)
    ).length;

    if (newMembers > members.length * 0.4) {
      vulnerabilities.push('High percentage of new team members may impact productivity');
    }

    return vulnerabilities;
  }

  private generateTeamRecommendations(turnoverRisk: string, burnoutRisk: string, skillGaps: any[]): any[] {
    const recommendations: any[] = [];

    if (turnoverRisk === 'HIGH') {
      recommendations.push({
        priority: 'HIGH',
        category: 'RETENTION',
        action: 'Conduct retention interviews and address engagement concerns'
      });
    }

    return recommendations;
  }

  /**
   * LLM-powered enrichment for team optimization results.
   * Generates contextual explanations and strategic recommendations.
   */
  private async enrichTeamOptimizationWithLLM(ctx: {
    teamName: string; optimizationType: string; teamSize: number;
    overallScore: number; skillCoverageScore: number; diversityScore: number;
    collaborationScore: number; strengthsAnalysis: string[]; risks: string[];
    skillGaps: Record<string, any>; redundancies: string[];
  }) {
    const prompt = `You are an organizational design expert. Analyze this team optimization result and provide strategic insights.

Team: ${ctx.teamName} (${ctx.optimizationType})
Size: ${ctx.teamSize} members
Scores: Overall ${ctx.overallScore.toFixed(1)}, Skills ${ctx.skillCoverageScore.toFixed(1)}, Diversity ${ctx.diversityScore.toFixed(1)}, Collaboration ${ctx.collaborationScore.toFixed(1)}
Strengths: ${ctx.strengthsAnalysis.join('; ') || 'None'}
Risks: ${ctx.risks.join('; ') || 'None'}
Skill Gaps: ${JSON.stringify(ctx.skillGaps)}
Redundancies: ${ctx.redundancies.join(', ') || 'None'}

Respond in strict JSON (no markdown):
{
  "strengthsAnalysis": ["1-2 AI-identified team strengths"],
  "risks": ["1-2 risks to monitor"],
  "recommendations": [{"priority": "HIGH", "category": "TEAM_DYNAMICS", "action": "specific recommendation"}],
  "implementationSteps": [{"step": 1, "title": "step title", "description": "detailed description", "duration": "2 weeks"}]
}`;

    const response = await llmClient.generateText(prompt, {
      maxTokens: 800,
      temperature: 0.4,
    });

    try {
      const cleaned = response.content.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      logger.warn('Failed to parse LLM team optimization enrichment response');
      return null;
    }
  }
}
