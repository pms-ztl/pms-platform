/**
 * AI Performance Copilot
 * USP Feature 4: Intelligent Performance Assistant
 *
 * This service:
 * - Explains WHY someone is rated a certain way
 * - Suggests improvement actions in real time
 * - Provides personalized development recommendations
 * - Generates coaching insights for managers
 * - Enables transparent, explainable performance decisions
 */

export interface PerformanceExplanation {
  userId: string;
  userName: string;
  overallRating: number;
  ratingLabel: string;
  explanation: ExplanationSection[];
  keyFactors: KeyFactor[];
  comparison: PeerComparison;
  timeline: RatingTimeline;
  confidence: number;
  generatedAt: Date;
}

export interface ExplanationSection {
  title: string;
  content: string;
  sentiment: 'positive' | 'neutral' | 'improvement_needed';
  supportingEvidence: string[];
  weight: number; // Contribution to overall rating
}

export interface KeyFactor {
  factor: string;
  impact: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
  impactScore: number; // -10 to +10
  description: string;
  evidence: string[];
}

export interface PeerComparison {
  percentile: number;
  comparisonGroup: string;
  groupSize: number;
  aboveAverage: boolean;
  differentiators: string[];
}

export interface RatingTimeline {
  periods: Array<{
    period: string;
    rating: number;
    highlights: string[];
  }>;
  trend: 'improving' | 'stable' | 'declining';
  trendDescription: string;
}

export interface ImprovementRecommendation {
  id: string;
  userId: string;
  category: RecommendationCategory;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  currentState: string;
  targetState: string;
  actions: ActionItem[];
  resources: LearningResource[];
  timeline: string;
  expectedImpact: number; // Potential rating improvement
  relatedGoals: string[];
  createdAt: Date;
}

export type RecommendationCategory =
  | 'SKILL_DEVELOPMENT'
  | 'BEHAVIOR_CHANGE'
  | 'OUTPUT_IMPROVEMENT'
  | 'COLLABORATION'
  | 'LEADERSHIP'
  | 'COMMUNICATION'
  | 'TIME_MANAGEMENT'
  | 'QUALITY_FOCUS'
  | 'STRATEGIC_ALIGNMENT';

export interface ActionItem {
  action: string;
  type: 'learn' | 'practice' | 'demonstrate' | 'measure';
  timeframe: string;
  measurableOutcome: string;
  supportNeeded?: string;
}

export interface LearningResource {
  type: 'course' | 'article' | 'video' | 'mentorship' | 'project' | 'certification';
  title: string;
  provider?: string;
  url?: string;
  duration?: string;
  relevance: number; // 0-100
}

export interface CoachingInsight {
  employeeId: string;
  employeeName: string;
  managerId: string;
  insight: InsightContent;
  conversationStarters: string[];
  developmentFocus: string[];
  strengths: StrengthInsight[];
  growthAreas: GrowthAreaInsight[];
  actionableAdvice: string[];
  meetingAgendaSuggestion: string[];
  warningFlags: WarningFlag[];
  generatedAt: Date;
}

export interface InsightContent {
  summary: string;
  keyObservations: string[];
  context: string;
  priority: 'routine' | 'attention' | 'urgent';
}

export interface StrengthInsight {
  strength: string;
  evidence: string[];
  leverageOpportunities: string[];
}

export interface GrowthAreaInsight {
  area: string;
  currentLevel: string;
  targetLevel: string;
  blockers: string[];
  supportNeeded: string[];
}

export interface WarningFlag {
  type: 'burnout_risk' | 'engagement_drop' | 'skill_gap' | 'performance_decline' | 'flight_risk';
  severity: 'low' | 'medium' | 'high';
  description: string;
  indicators: string[];
  suggestedIntervention: string;
}

export interface CareerPathSuggestion {
  userId: string;
  currentRole: string;
  currentLevel: number;
  paths: CareerPath[];
  readinessAssessment: ReadinessAssessment;
  developmentPriorities: string[];
}

export interface CareerPath {
  targetRole: string;
  targetLevel: number;
  probability: number; // 0-100 likelihood of success
  timeframe: string;
  requirements: PathRequirement[];
  gaps: string[];
  strengths: string[];
  nextSteps: string[];
}

export interface PathRequirement {
  requirement: string;
  currentStatus: 'met' | 'partial' | 'not_met';
  evidence?: string;
  developmentNeeded?: string;
}

export interface ReadinessAssessment {
  overallReadiness: number; // 0-100
  byDimension: Record<string, number>;
  blockers: string[];
  accelerators: string[];
}

export interface FeedbackDraft {
  recipientId: string;
  recipientName: string;
  feedbackType: 'praise' | 'constructive' | 'development';
  draftContent: string;
  suggestedPoints: string[];
  toneGuidance: string[];
  evidenceToInclude: string[];
  wordsToAvoid: string[];
  improvementSuggestions: string[];
}

export interface ReviewDraftAssistance {
  revieweeId: string;
  revieweeName: string;
  reviewPeriod: { start: Date; end: Date };
  suggestedRating: number;
  ratingJustification: string;
  strengthsSummary: SectionDraft;
  growthAreasSummary: SectionDraft;
  achievementHighlights: string[];
  developmentRecommendations: string[];
  biasWarnings: string[];
  completenessCheck: CompletenessCheck;
}

export interface SectionDraft {
  suggestedContent: string;
  keyPoints: string[];
  supportingEvidence: string[];
  alternativePhrasings: string[];
}

export interface CompletenessCheck {
  isComplete: boolean;
  missingElements: string[];
  suggestions: string[];
}

// Input types for the service
interface PerformanceData {
  userId: string;
  userName: string;
  role: string;
  level: number;
  department: string;
  managerId: string;
  goals: GoalData[];
  reviews: ReviewData[];
  feedback: FeedbackData[];
  skills: SkillData[];
  activities: ActivityData[];
}

interface GoalData {
  id: string;
  title: string;
  progress: number;
  status: string;
  dueDate: Date;
  weight: number;
}

interface ReviewData {
  id: string;
  cycleId: string;
  period: string;
  rating: number;
  strengths: string[];
  growthAreas: string[];
  comments: string;
}

interface FeedbackData {
  id: string;
  type: string;
  content: string;
  sentiment: string;
  createdAt: Date;
}

interface SkillData {
  name: string;
  level: number;
  trend: string;
}

interface ActivityData {
  type: string;
  description: string;
  value: number;
  timestamp: Date;
}

interface PeerData {
  role: string;
  level: number;
  department: string;
  avgRating: number;
}

export class AIPerformanceCopilot {
  /**
   * Generates a comprehensive explanation for a performance rating
   */
  explainRating(
    data: PerformanceData,
    currentRating: number,
    peers: PeerData[]
  ): PerformanceExplanation {
    const sections = this.generateExplanationSections(data, currentRating);
    const keyFactors = this.identifyKeyFactors(data, currentRating);
    const comparison = this.generatePeerComparison(data, currentRating, peers);
    const timeline = this.buildRatingTimeline(data.reviews);

    const confidence = this.calculateExplanationConfidence(data);
    const ratingLabel = this.getRatingLabel(currentRating);

    return {
      userId: data.userId,
      userName: data.userName,
      overallRating: currentRating,
      ratingLabel,
      explanation: sections,
      keyFactors,
      comparison,
      timeline,
      confidence,
      generatedAt: new Date(),
    };
  }

  /**
   * Generates personalized improvement recommendations
   */
  generateRecommendations(
    data: PerformanceData,
    currentRating: number,
    targetRating?: number
  ): ImprovementRecommendation[] {
    const recommendations: ImprovementRecommendation[] = [];
    const effectiveTarget = targetRating || currentRating + 0.5;

    // Analyze gaps
    const gaps = this.identifyPerformanceGaps(data, effectiveTarget);

    // Generate recommendations for each gap
    for (const gap of gaps) {
      const rec = this.createRecommendation(data, gap, effectiveTarget);
      if (rec) {
        recommendations.push(rec);
      }
    }

    // Prioritize recommendations
    return this.prioritizeRecommendations(recommendations);
  }

  /**
   * Generates coaching insights for managers
   */
  generateCoachingInsights(
    employeeData: PerformanceData,
    managerContext: { managerId: string; teamSize: number; teamAvgRating: number }
  ): CoachingInsight {
    const insight = this.createInsightContent(employeeData, managerContext);
    const conversationStarters = this.generateConversationStarters(employeeData);
    const developmentFocus = this.identifyDevelopmentFocus(employeeData);
    const strengths = this.analyzeStrengths(employeeData);
    const growthAreas = this.analyzeGrowthAreas(employeeData);
    const actionableAdvice = this.generateManagerAdvice(employeeData, managerContext);
    const meetingAgendaSuggestion = this.generateMeetingAgenda(employeeData);
    const warningFlags = this.detectWarningFlags(employeeData);

    return {
      employeeId: employeeData.userId,
      employeeName: employeeData.userName,
      managerId: managerContext.managerId,
      insight,
      conversationStarters,
      developmentFocus,
      strengths,
      growthAreas,
      actionableAdvice,
      meetingAgendaSuggestion,
      warningFlags,
      generatedAt: new Date(),
    };
  }

  /**
   * Suggests career paths based on performance and skills
   */
  suggestCareerPaths(
    data: PerformanceData,
    availableRoles: Array<{ role: string; level: number; requirements: string[] }>
  ): CareerPathSuggestion {
    const paths: CareerPath[] = [];

    for (const targetRole of availableRoles) {
      const path = this.assessCareerPath(data, targetRole);
      if (path.probability >= 30) {
        paths.push(path);
      }
    }

    // Sort by probability
    paths.sort((a, b) => b.probability - a.probability);

    const readiness = this.assessOverallReadiness(data, paths);
    const priorities = this.identifyDevelopmentPriorities(data, paths);

    return {
      userId: data.userId,
      currentRole: data.role,
      currentLevel: data.level,
      paths: paths.slice(0, 3), // Top 3 paths
      readinessAssessment: readiness,
      developmentPriorities: priorities,
    };
  }

  /**
   * Assists with drafting feedback
   */
  assistFeedbackDraft(
    recipientData: PerformanceData,
    feedbackType: 'praise' | 'constructive' | 'development',
    context?: string
  ): FeedbackDraft {
    const suggestedPoints = this.generateFeedbackPoints(recipientData, feedbackType);
    const draftContent = this.generateFeedbackDraft(recipientData, feedbackType, suggestedPoints);
    const toneGuidance = this.getToneGuidance(feedbackType);
    const evidenceToInclude = this.suggestEvidence(recipientData, feedbackType);
    const wordsToAvoid = this.getWordsToAvoid(feedbackType);
    const improvements = this.suggestImprovements(draftContent);

    return {
      recipientId: recipientData.userId,
      recipientName: recipientData.userName,
      feedbackType,
      draftContent,
      suggestedPoints,
      toneGuidance,
      evidenceToInclude,
      wordsToAvoid,
      improvementSuggestions: improvements,
    };
  }

  /**
   * Assists with drafting performance reviews
   */
  assistReviewDraft(
    revieweeData: PerformanceData,
    reviewPeriod: { start: Date; end: Date }
  ): ReviewDraftAssistance {
    const suggestedRating = this.calculateSuggestedRating(revieweeData);
    const justification = this.generateRatingJustification(revieweeData, suggestedRating);
    const strengthsSummary = this.draftStrengthsSection(revieweeData);
    const growthAreasSummary = this.draftGrowthAreasSection(revieweeData);
    const achievements = this.highlightAchievements(revieweeData, reviewPeriod);
    const developmentRecs = this.generateDevelopmentRecommendations(revieweeData);
    const biasWarnings = this.detectPotentialBias(revieweeData);
    const completeness = this.checkCompleteness(revieweeData, suggestedRating);

    return {
      revieweeId: revieweeData.userId,
      revieweeName: revieweeData.userName,
      reviewPeriod,
      suggestedRating,
      ratingJustification: justification,
      strengthsSummary,
      growthAreasSummary,
      achievementHighlights: achievements,
      developmentRecommendations: developmentRecs,
      biasWarnings,
      completenessCheck: completeness,
    };
  }

  /**
   * Answers natural language questions about performance
   */
  answerPerformanceQuestion(
    question: string,
    data: PerformanceData,
    context?: Record<string, any>
  ): {
    answer: string;
    confidence: number;
    supportingData: string[];
    suggestedFollowUps: string[];
  } {
    const normalizedQuestion = question.toLowerCase();

    // Pattern matching for common questions
    if (normalizedQuestion.includes('why') && normalizedQuestion.includes('rating')) {
      return this.explainRatingQuestion(data);
    }

    if (normalizedQuestion.includes('improve') || normalizedQuestion.includes('better')) {
      return this.answerImprovementQuestion(data);
    }

    if (normalizedQuestion.includes('strength') || normalizedQuestion.includes('good at')) {
      return this.answerStrengthsQuestion(data);
    }

    if (normalizedQuestion.includes('goal') || normalizedQuestion.includes('objective')) {
      return this.answerGoalsQuestion(data);
    }

    if (normalizedQuestion.includes('compare') || normalizedQuestion.includes('peer')) {
      return this.answerComparisonQuestion(data, context?.peers || []);
    }

    // Default response
    return {
      answer: this.generateGeneralAnswer(data, question),
      confidence: 60,
      supportingData: this.gatherRelevantData(data),
      suggestedFollowUps: [
        'What specific areas would you like to focus on?',
        'Would you like recommendations for improvement?',
        'Should I explain how this rating was determined?',
      ],
    };
  }

  // Private helper methods

  private generateExplanationSections(
    data: PerformanceData,
    rating: number
  ): ExplanationSection[] {
    const sections: ExplanationSection[] = [];

    // Goal Achievement Section
    const completedGoals = data.goals.filter(g => g.status === 'COMPLETED');
    const activeGoals = data.goals.filter(g => g.status === 'ACTIVE');
    const avgProgress = activeGoals.length > 0
      ? activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoals.length
      : 0;

    sections.push({
      title: 'Goal Achievement',
      content: this.generateGoalExplanation(completedGoals, activeGoals, avgProgress),
      sentiment: avgProgress >= 70 ? 'positive' : avgProgress >= 40 ? 'neutral' : 'improvement_needed',
      supportingEvidence: data.goals.map(g => `${g.title}: ${g.progress}% complete`),
      weight: 0.35,
    });

    // Feedback Received Section
    const positiveFeedback = data.feedback.filter(f => f.sentiment === 'POSITIVE' || f.type === 'PRAISE');
    const constructiveFeedback = data.feedback.filter(f => f.type === 'CONSTRUCTIVE');

    sections.push({
      title: 'Feedback & Recognition',
      content: this.generateFeedbackExplanation(positiveFeedback, constructiveFeedback),
      sentiment: positiveFeedback.length > constructiveFeedback.length ? 'positive' : 'neutral',
      supportingEvidence: data.feedback.slice(0, 5).map(f => f.content.substring(0, 100)),
      weight: 0.25,
    });

    // Skills & Growth Section
    const growingSkills = data.skills.filter(s => s.trend === 'IMPROVING');
    const avgSkillLevel = data.skills.length > 0
      ? data.skills.reduce((sum, s) => sum + s.level, 0) / data.skills.length
      : 0;

    sections.push({
      title: 'Skills & Professional Growth',
      content: this.generateSkillsExplanation(data.skills, growingSkills, avgSkillLevel),
      sentiment: growingSkills.length >= 2 ? 'positive' : 'neutral',
      supportingEvidence: data.skills.map(s => `${s.name}: Level ${s.level} (${s.trend})`),
      weight: 0.20,
    });

    // Collaboration & Team Contribution
    const collaborativeActivities = data.activities.filter(a =>
      ['REVIEW_PARTICIPATION', 'MENTORSHIP', 'COLLABORATION'].includes(a.type)
    );

    sections.push({
      title: 'Collaboration & Team Contribution',
      content: this.generateCollaborationExplanation(collaborativeActivities),
      sentiment: collaborativeActivities.length >= 5 ? 'positive' : 'neutral',
      supportingEvidence: collaborativeActivities.map(a => a.description),
      weight: 0.20,
    });

    return sections;
  }

  private identifyKeyFactors(data: PerformanceData, rating: number): KeyFactor[] {
    const factors: KeyFactor[] = [];

    // Goal completion factor
    const goalCompletionRate = data.goals.filter(g => g.status === 'COMPLETED').length / Math.max(data.goals.length, 1);
    factors.push({
      factor: 'Goal Completion',
      impact: goalCompletionRate >= 0.8 ? 'very_positive' : goalCompletionRate >= 0.5 ? 'positive' : 'neutral',
      impactScore: Math.round((goalCompletionRate - 0.5) * 10),
      description: `${Math.round(goalCompletionRate * 100)}% of goals completed`,
      evidence: data.goals.filter(g => g.status === 'COMPLETED').map(g => g.title),
    });

    // Feedback sentiment factor
    const positiveFeedbackRatio = data.feedback.filter(f =>
      f.sentiment === 'POSITIVE' || f.type === 'PRAISE'
    ).length / Math.max(data.feedback.length, 1);
    factors.push({
      factor: 'Peer & Manager Feedback',
      impact: positiveFeedbackRatio >= 0.7 ? 'very_positive' : positiveFeedbackRatio >= 0.5 ? 'positive' : 'neutral',
      impactScore: Math.round((positiveFeedbackRatio - 0.5) * 8),
      description: `${Math.round(positiveFeedbackRatio * 100)}% positive feedback received`,
      evidence: data.feedback.filter(f => f.type === 'PRAISE').slice(0, 3).map(f => f.content.substring(0, 50)),
    });

    // Skill growth factor
    const growingSkills = data.skills.filter(s => s.trend === 'IMPROVING');
    factors.push({
      factor: 'Professional Development',
      impact: growingSkills.length >= 3 ? 'positive' : growingSkills.length >= 1 ? 'neutral' : 'negative',
      impactScore: growingSkills.length - 2,
      description: `${growingSkills.length} skills showing growth`,
      evidence: growingSkills.map(s => s.name),
    });

    // Historical trend factor
    if (data.reviews.length >= 2) {
      const sortedReviews = [...data.reviews].sort((a, b) =>
        new Date(b.period).getTime() - new Date(a.period).getTime()
      );
      const latestRating = sortedReviews[0].rating;
      const previousRating = sortedReviews[1].rating;
      const trend = latestRating - previousRating;

      factors.push({
        factor: 'Performance Trajectory',
        impact: trend > 0.3 ? 'very_positive' : trend > 0 ? 'positive' : trend > -0.3 ? 'neutral' : 'negative',
        impactScore: Math.round(trend * 5),
        description: trend > 0 ? `Improved by ${trend.toFixed(1)} points` : `Changed by ${trend.toFixed(1)} points`,
        evidence: sortedReviews.slice(0, 3).map(r => `${r.period}: ${r.rating}`),
      });
    }

    return factors.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));
  }

  private generatePeerComparison(
    data: PerformanceData,
    rating: number,
    peers: PeerData[]
  ): PeerComparison {
    // Filter to similar peers
    const similarPeers = peers.filter(p =>
      p.level === data.level && p.department === data.department
    );

    if (similarPeers.length === 0) {
      return {
        percentile: 50,
        comparisonGroup: `${data.role} (Level ${data.level})`,
        groupSize: 0,
        aboveAverage: true,
        differentiators: ['Insufficient peer data for comparison'],
      };
    }

    const peerRatings = similarPeers.map(p => p.avgRating);
    const avgPeerRating = peerRatings.reduce((a, b) => a + b, 0) / peerRatings.length;

    const belowCount = peerRatings.filter(r => r < rating).length;
    const percentile = Math.round((belowCount / peerRatings.length) * 100);

    const differentiators: string[] = [];
    if (rating > avgPeerRating + 0.3) {
      differentiators.push('Consistently exceeds peer performance');
    }
    if (data.goals.filter(g => g.status === 'COMPLETED').length > 5) {
      differentiators.push('Higher goal completion rate than peers');
    }
    if (data.feedback.filter(f => f.type === 'PRAISE').length > 3) {
      differentiators.push('More frequent recognition from colleagues');
    }

    return {
      percentile,
      comparisonGroup: `${data.role} (Level ${data.level}) in ${data.department}`,
      groupSize: similarPeers.length,
      aboveAverage: rating > avgPeerRating,
      differentiators,
    };
  }

  private buildRatingTimeline(reviews: ReviewData[]): RatingTimeline {
    const sorted = [...reviews].sort((a, b) =>
      new Date(a.period).getTime() - new Date(b.period).getTime()
    );

    const periods = sorted.map(r => ({
      period: r.period,
      rating: r.rating,
      highlights: r.strengths.slice(0, 2),
    }));

    let trend: RatingTimeline['trend'] = 'stable';
    let trendDescription = 'Performance has been consistent';

    if (periods.length >= 2) {
      const recentRatings = periods.slice(-3).map(p => p.rating);
      const avgRecent = recentRatings.reduce((a, b) => a + b, 0) / recentRatings.length;
      const firstRating = periods[0].rating;

      if (avgRecent - firstRating > 0.3) {
        trend = 'improving';
        trendDescription = 'Consistent upward trajectory in performance';
      } else if (firstRating - avgRecent > 0.3) {
        trend = 'declining';
        trendDescription = 'Performance has decreased from earlier levels';
      }
    }

    return { periods, trend, trendDescription };
  }

  private calculateExplanationConfidence(data: PerformanceData): number {
    let confidence = 50; // Base confidence

    // More data = higher confidence
    confidence += Math.min(20, data.goals.length * 2);
    confidence += Math.min(15, data.feedback.length);
    confidence += Math.min(10, data.reviews.length * 3);
    confidence += Math.min(5, data.activities.length / 5);

    return Math.min(100, confidence);
  }

  private getRatingLabel(rating: number): string {
    if (rating >= 4.5) return 'Exceptional Performance';
    if (rating >= 4.0) return 'Exceeds Expectations';
    if (rating >= 3.5) return 'Strong Performance';
    if (rating >= 3.0) return 'Meets Expectations';
    if (rating >= 2.5) return 'Approaching Expectations';
    if (rating >= 2.0) return 'Below Expectations';
    return 'Needs Significant Improvement';
  }

  private identifyPerformanceGaps(
    data: PerformanceData,
    targetRating: number
  ): Array<{ area: string; gap: number; priority: number }> {
    const gaps: Array<{ area: string; gap: number; priority: number }> = [];

    // Goal progress gap
    const avgProgress = data.goals.length > 0
      ? data.goals.reduce((sum, g) => sum + g.progress, 0) / data.goals.length
      : 0;

    if (avgProgress < 80) {
      gaps.push({
        area: 'goal_completion',
        gap: 80 - avgProgress,
        priority: 1,
      });
    }

    // Skills gap
    const lowSkills = data.skills.filter(s => s.level < 3);
    if (lowSkills.length > 0) {
      gaps.push({
        area: 'skill_development',
        gap: lowSkills.length * 15,
        priority: 2,
      });
    }

    // Feedback improvement gap
    const constructiveCount = data.feedback.filter(f => f.type === 'CONSTRUCTIVE').length;
    if (constructiveCount > 3) {
      gaps.push({
        area: 'feedback_response',
        gap: constructiveCount * 10,
        priority: 2,
      });
    }

    // Collaboration gap
    const collaborativeActivities = data.activities.filter(a =>
      a.type.includes('COLLABORATION') || a.type.includes('MENTORSHIP')
    );
    if (collaborativeActivities.length < 5) {
      gaps.push({
        area: 'collaboration',
        gap: (5 - collaborativeActivities.length) * 10,
        priority: 3,
      });
    }

    return gaps.sort((a, b) => a.priority - b.priority);
  }

  private createRecommendation(
    data: PerformanceData,
    gap: { area: string; gap: number; priority: number },
    targetRating: number
  ): ImprovementRecommendation | null {
    const recommendations: Record<string, () => ImprovementRecommendation> = {
      goal_completion: () => ({
        id: `rec_${Date.now()}_goals`,
        userId: data.userId,
        category: 'OUTPUT_IMPROVEMENT',
        priority: 'high',
        title: 'Accelerate Goal Progress',
        description: 'Focus on completing in-progress goals to demonstrate consistent delivery',
        rationale: `Current goal progress is ${gap.gap}% below target. Completing goals is a key performance indicator.`,
        currentState: `${Math.round(100 - gap.gap)}% average goal progress`,
        targetState: '80%+ goal completion rate',
        actions: [
          {
            action: 'Review and prioritize top 3 in-progress goals',
            type: 'practice',
            timeframe: 'This week',
            measurableOutcome: 'Priority list created with milestones',
          },
          {
            action: 'Break down large goals into weekly deliverables',
            type: 'practice',
            timeframe: '2 weeks',
            measurableOutcome: 'Weekly progress checkpoints defined',
          },
          {
            action: 'Schedule daily focus time for goal work',
            type: 'practice',
            timeframe: 'Ongoing',
            measurableOutcome: '2+ hours/day dedicated to goal progress',
          },
        ],
        resources: [
          {
            type: 'article',
            title: 'OKR Best Practices for Individual Contributors',
            relevance: 85,
          },
          {
            type: 'course',
            title: 'Time Management for Goal Achievement',
            duration: '2 hours',
            relevance: 80,
          },
        ],
        timeline: '4-6 weeks',
        expectedImpact: 0.3,
        relatedGoals: data.goals.filter(g => g.status === 'ACTIVE').map(g => g.id),
        createdAt: new Date(),
      }),

      skill_development: () => ({
        id: `rec_${Date.now()}_skills`,
        userId: data.userId,
        category: 'SKILL_DEVELOPMENT',
        priority: 'medium',
        title: 'Targeted Skill Development',
        description: 'Focus on improving specific skills that are below expected level',
        rationale: `${data.skills.filter(s => s.level < 3).length} skills need development to meet role expectations`,
        currentState: `Skills with gaps: ${data.skills.filter(s => s.level < 3).map(s => s.name).join(', ')}`,
        targetState: 'All core skills at level 3 or above',
        actions: [
          {
            action: 'Identify top 2 skills with highest impact if improved',
            type: 'learn',
            timeframe: 'This week',
            measurableOutcome: 'Priority skill list defined',
          },
          {
            action: 'Complete one relevant training course',
            type: 'learn',
            timeframe: '4 weeks',
            measurableOutcome: 'Course completion certificate',
          },
          {
            action: 'Apply new skills in current project work',
            type: 'demonstrate',
            timeframe: '6 weeks',
            measurableOutcome: 'Manager feedback on skill application',
          },
        ],
        resources: this.getSkillResources(data.skills.filter(s => s.level < 3)),
        timeline: '8-12 weeks',
        expectedImpact: 0.25,
        relatedGoals: [],
        createdAt: new Date(),
      }),

      collaboration: () => ({
        id: `rec_${Date.now()}_collab`,
        userId: data.userId,
        category: 'COLLABORATION',
        priority: 'medium',
        title: 'Increase Collaborative Contributions',
        description: 'Engage more actively in team activities and cross-functional work',
        rationale: 'Collaboration metrics are below peer average. Team contribution impacts overall rating.',
        currentState: 'Limited collaborative activities recorded',
        targetState: '5+ collaborative contributions per month',
        actions: [
          {
            action: 'Volunteer for a cross-team project or initiative',
            type: 'demonstrate',
            timeframe: '2 weeks',
            measurableOutcome: 'Project participation confirmed',
          },
          {
            action: 'Increase code review participation',
            type: 'practice',
            timeframe: 'Ongoing',
            measurableOutcome: '3+ code reviews per week',
          },
          {
            action: 'Offer to mentor a junior team member',
            type: 'demonstrate',
            timeframe: '4 weeks',
            measurableOutcome: 'Mentorship relationship established',
          },
        ],
        resources: [
          {
            type: 'article',
            title: 'Effective Cross-functional Collaboration',
            relevance: 75,
          },
        ],
        timeline: '6-8 weeks',
        expectedImpact: 0.2,
        relatedGoals: [],
        createdAt: new Date(),
      }),

      feedback_response: () => ({
        id: `rec_${Date.now()}_feedback`,
        userId: data.userId,
        category: 'BEHAVIOR_CHANGE',
        priority: 'high',
        title: 'Address Constructive Feedback Themes',
        description: 'Act on patterns identified in constructive feedback',
        rationale: `Multiple pieces of constructive feedback suggest areas for improvement`,
        currentState: 'Feedback areas not fully addressed',
        targetState: 'Visible improvement in feedback themes',
        actions: [
          {
            action: 'Review and categorize all constructive feedback received',
            type: 'learn',
            timeframe: 'This week',
            measurableOutcome: 'Feedback themes identified',
          },
          {
            action: 'Create action plan for top 2 feedback themes',
            type: 'practice',
            timeframe: '2 weeks',
            measurableOutcome: 'Action plan with milestones',
          },
          {
            action: 'Request follow-up feedback from original sources',
            type: 'measure',
            timeframe: '6 weeks',
            measurableOutcome: 'Improvement acknowledged by feedback givers',
          },
        ],
        resources: [
          {
            type: 'article',
            title: 'Receiving and Acting on Feedback',
            relevance: 90,
          },
        ],
        timeline: '6-8 weeks',
        expectedImpact: 0.25,
        relatedGoals: [],
        createdAt: new Date(),
      }),
    };

    const factory = recommendations[gap.area];
    return factory ? factory() : null;
  }

  private prioritizeRecommendations(
    recs: ImprovementRecommendation[]
  ): ImprovementRecommendation[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return recs.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.expectedImpact - a.expectedImpact;
    });
  }

  private createInsightContent(
    data: PerformanceData,
    context: { teamAvgRating: number }
  ): InsightContent {
    const avgProgress = data.goals.length > 0
      ? data.goals.reduce((sum, g) => sum + g.progress, 0) / data.goals.length
      : 0;

    const recentReviews = data.reviews.slice(-2);
    const latestRating = recentReviews.length > 0 ? recentReviews[0].rating : 3.0;

    const isAboveTeam = latestRating > context.teamAvgRating;
    const hasGrowth = data.skills.filter(s => s.trend === 'IMPROVING').length > 0;

    let priority: InsightContent['priority'] = 'routine';
    if (latestRating < 3.0 || avgProgress < 40) priority = 'urgent';
    else if (latestRating < 3.5 || avgProgress < 60) priority = 'attention';

    const keyObservations = [
      `Goal progress at ${Math.round(avgProgress)}%`,
      isAboveTeam ? 'Performing above team average' : 'Below team average',
      hasGrowth ? 'Showing skill development' : 'Skills may need development focus',
    ];

    return {
      summary: `${data.userName} is ${isAboveTeam ? 'exceeding' : 'meeting'} expectations with ${Math.round(avgProgress)}% goal progress and ${hasGrowth ? 'positive' : 'stable'} skill trajectory.`,
      keyObservations,
      context: `Current rating: ${latestRating.toFixed(1)} | Team average: ${context.teamAvgRating.toFixed(1)}`,
      priority,
    };
  }

  private generateConversationStarters(data: PerformanceData): string[] {
    const starters: string[] = [];

    const completedGoals = data.goals.filter(g => g.status === 'COMPLETED');
    if (completedGoals.length > 0) {
      starters.push(`Congratulate on completing ${completedGoals[0].title}. What made this successful?`);
    }

    const lowProgressGoals = data.goals.filter(g => g.status === 'ACTIVE' && g.progress < 30);
    if (lowProgressGoals.length > 0) {
      starters.push(`How can I help with ${lowProgressGoals[0].title}? What's blocking progress?`);
    }

    const recentPraise = data.feedback.filter(f => f.type === 'PRAISE').slice(-1)[0];
    if (recentPraise) {
      starters.push(`You received great feedback recently. How are you feeling about your contributions?`);
    }

    starters.push('What aspects of your role are most energizing right now?');
    starters.push('What support would be most helpful from me this month?');

    return starters.slice(0, 5);
  }

  private identifyDevelopmentFocus(data: PerformanceData): string[] {
    const focus: string[] = [];

    const lowSkills = data.skills.filter(s => s.level < 3);
    if (lowSkills.length > 0) {
      focus.push(`Skill development: ${lowSkills.map(s => s.name).join(', ')}`);
    }

    const growthAreas = data.reviews.slice(-1)[0]?.growthAreas || [];
    if (growthAreas.length > 0) {
      focus.push(`Review feedback areas: ${growthAreas.slice(0, 2).join(', ')}`);
    }

    const atRiskGoals = data.goals.filter(g =>
      g.status === 'ACTIVE' && g.progress < 50 &&
      new Date(g.dueDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    if (atRiskGoals.length > 0) {
      focus.push(`At-risk goals: ${atRiskGoals.map(g => g.title).join(', ')}`);
    }

    return focus;
  }

  private analyzeStrengths(data: PerformanceData): StrengthInsight[] {
    const strengths: StrengthInsight[] = [];

    // High skills
    const highSkills = data.skills.filter(s => s.level >= 4);
    for (const skill of highSkills.slice(0, 3)) {
      strengths.push({
        strength: skill.name,
        evidence: [`Skill level ${skill.level}/5`, `Trend: ${skill.trend}`],
        leverageOpportunities: [
          'Consider mentoring others in this area',
          'Lead initiatives requiring this skill',
        ],
      });
    }

    // From review strengths
    const lastReview = data.reviews.slice(-1)[0];
    if (lastReview?.strengths) {
      for (const strength of lastReview.strengths.slice(0, 2)) {
        strengths.push({
          strength,
          evidence: [`Noted in ${lastReview.period} review`],
          leverageOpportunities: ['Continue demonstrating this strength'],
        });
      }
    }

    return strengths;
  }

  private analyzeGrowthAreas(data: PerformanceData): GrowthAreaInsight[] {
    const areas: GrowthAreaInsight[] = [];

    // Low skills
    const lowSkills = data.skills.filter(s => s.level < 3);
    for (const skill of lowSkills.slice(0, 2)) {
      areas.push({
        area: skill.name,
        currentLevel: `Level ${skill.level}/5`,
        targetLevel: 'Level 3/5',
        blockers: ['May need structured learning', 'Practice opportunities needed'],
        supportNeeded: ['Training resources', 'Mentorship', 'Project opportunities'],
      });
    }

    // From review growth areas
    const lastReview = data.reviews.slice(-1)[0];
    if (lastReview?.growthAreas) {
      for (const area of lastReview.growthAreas.slice(0, 2)) {
        areas.push({
          area,
          currentLevel: 'Developing',
          targetLevel: 'Proficient',
          blockers: ['Specific development needed'],
          supportNeeded: ['Manager coaching', 'Practice opportunities'],
        });
      }
    }

    return areas;
  }

  private generateManagerAdvice(
    data: PerformanceData,
    context: { teamAvgRating: number }
  ): string[] {
    const advice: string[] = [];

    const latestRating = data.reviews.slice(-1)[0]?.rating || 3.0;

    if (latestRating >= 4.0) {
      advice.push('Consider stretch assignments or leadership opportunities');
      advice.push('Discuss career aspirations and growth path');
      advice.push('Leverage as a role model for the team');
    } else if (latestRating >= 3.0) {
      advice.push('Identify 1-2 specific areas for focused development');
      advice.push('Provide more frequent check-ins to maintain momentum');
      advice.push('Recognize progress to build confidence');
    } else {
      advice.push('Create a structured improvement plan with clear milestones');
      advice.push('Increase coaching frequency to weekly');
      advice.push('Focus on quick wins to build momentum');
    }

    return advice;
  }

  private generateMeetingAgenda(data: PerformanceData): string[] {
    return [
      `Check-in: How are you feeling about your work lately? (5 min)`,
      `Goal Review: Progress on ${data.goals.filter(g => g.status === 'ACTIVE')[0]?.title || 'current goals'} (10 min)`,
      `Development: Discuss skill building opportunities (10 min)`,
      `Blockers: Any obstacles I can help remove? (5 min)`,
      `Feedback: What's working? What could be better? (5 min)`,
      `Next steps: Agree on action items (5 min)`,
    ];
  }

  private detectWarningFlags(data: PerformanceData): WarningFlag[] {
    const flags: WarningFlag[] = [];

    // Check for declining trend
    if (data.reviews.length >= 2) {
      const sorted = [...data.reviews].sort((a, b) =>
        new Date(b.period).getTime() - new Date(a.period).getTime()
      );
      if (sorted.length >= 2 && sorted[0].rating < sorted[1].rating - 0.5) {
        flags.push({
          type: 'performance_decline',
          severity: 'high',
          description: 'Performance rating dropped significantly',
          indicators: [`Rating dropped from ${sorted[1].rating} to ${sorted[0].rating}`],
          suggestedIntervention: 'Schedule immediate check-in to understand causes',
        });
      }
    }

    // Check for stalled goals
    const stalledGoals = data.goals.filter(g =>
      g.status === 'ACTIVE' && g.progress < 20 &&
      new Date(g.dueDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    if (stalledGoals.length >= 2) {
      flags.push({
        type: 'engagement_drop',
        severity: 'medium',
        description: 'Multiple goals showing limited progress',
        indicators: stalledGoals.map(g => `${g.title}: ${g.progress}%`),
        suggestedIntervention: 'Discuss blockers and reprioritize if needed',
      });
    }

    // Check for skill gaps
    const criticalLowSkills = data.skills.filter(s => s.level <= 2);
    if (criticalLowSkills.length >= 3) {
      flags.push({
        type: 'skill_gap',
        severity: 'medium',
        description: 'Multiple skills below expected level',
        indicators: criticalLowSkills.map(s => `${s.name}: Level ${s.level}`),
        suggestedIntervention: 'Create targeted development plan',
      });
    }

    return flags;
  }

  private assessCareerPath(
    data: PerformanceData,
    target: { role: string; level: number; requirements: string[] }
  ): CareerPath {
    const requirements: PathRequirement[] = target.requirements.map(req => {
      // Simple matching - would be more sophisticated in production
      const skillMatch = data.skills.find(s =>
        s.name.toLowerCase().includes(req.toLowerCase())
      );

      let status: 'met' | 'partial' | 'not_met' = 'not_met';
      if (skillMatch) {
        if (skillMatch.level >= 4) status = 'met';
        else if (skillMatch.level >= 2) status = 'partial';
      }

      return {
        requirement: req,
        currentStatus: status,
        evidence: skillMatch ? `${skillMatch.name}: Level ${skillMatch.level}` : undefined,
        developmentNeeded: status !== 'met' ? `Develop ${req} capability` : undefined,
      };
    });

    const metCount = requirements.filter(r => r.currentStatus === 'met').length;
    const partialCount = requirements.filter(r => r.currentStatus === 'partial').length;
    const probability = Math.round(
      (metCount * 100 + partialCount * 50) / Math.max(requirements.length, 1)
    );

    const gaps = requirements
      .filter(r => r.currentStatus === 'not_met')
      .map(r => r.requirement);

    const strengths = requirements
      .filter(r => r.currentStatus === 'met')
      .map(r => r.requirement);

    const nextSteps = gaps.slice(0, 3).map(gap => `Develop ${gap} capability`);

    const levelDiff = target.level - data.level;
    const timeframe = levelDiff <= 1 ? '6-12 months' : levelDiff <= 2 ? '12-24 months' : '24-36 months';

    return {
      targetRole: target.role,
      targetLevel: target.level,
      probability,
      timeframe,
      requirements,
      gaps,
      strengths,
      nextSteps,
    };
  }

  private assessOverallReadiness(
    data: PerformanceData,
    paths: CareerPath[]
  ): ReadinessAssessment {
    const avgProbability = paths.length > 0
      ? paths.reduce((sum, p) => sum + p.probability, 0) / paths.length
      : 0;

    const byDimension: Record<string, number> = {
      skills: Math.round(data.skills.filter(s => s.level >= 3).length / Math.max(data.skills.length, 1) * 100),
      performance: data.reviews.length > 0 ? data.reviews[data.reviews.length - 1].rating * 20 : 60,
      goals: data.goals.filter(g => g.status === 'COMPLETED').length / Math.max(data.goals.length, 1) * 100,
    };

    const blockers: string[] = [];
    if (byDimension.skills < 60) blockers.push('Skill development needed');
    if (byDimension.performance < 60) blockers.push('Performance improvement required');
    if (byDimension.goals < 50) blockers.push('Goal completion rate below expectations');

    const accelerators: string[] = [];
    if (byDimension.skills > 80) accelerators.push('Strong skill foundation');
    if (byDimension.performance > 80) accelerators.push('Excellent performance track record');
    if (data.feedback.filter(f => f.type === 'PRAISE').length > 5) {
      accelerators.push('Strong peer recognition');
    }

    return {
      overallReadiness: Math.round(avgProbability),
      byDimension,
      blockers,
      accelerators,
    };
  }

  private identifyDevelopmentPriorities(
    data: PerformanceData,
    paths: CareerPath[]
  ): string[] {
    const allGaps = paths.flatMap(p => p.gaps);
    const gapCounts: Record<string, number> = {};

    for (const gap of allGaps) {
      gapCounts[gap] = (gapCounts[gap] || 0) + 1;
    }

    return Object.entries(gapCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([gap]) => gap);
  }

  private generateFeedbackPoints(
    data: PerformanceData,
    type: 'praise' | 'constructive' | 'development'
  ): string[] {
    const points: string[] = [];

    if (type === 'praise') {
      const completedGoals = data.goals.filter(g => g.status === 'COMPLETED');
      if (completedGoals.length > 0) {
        points.push(`Successfully completed ${completedGoals[0].title}`);
      }

      const highSkills = data.skills.filter(s => s.level >= 4);
      if (highSkills.length > 0) {
        points.push(`Demonstrates excellent ${highSkills[0].name} skills`);
      }

      points.push('Consistent contribution to team success');
      points.push('Positive attitude and collaborative spirit');
    } else if (type === 'constructive') {
      const lowProgressGoals = data.goals.filter(g => g.status === 'ACTIVE' && g.progress < 50);
      if (lowProgressGoals.length > 0) {
        points.push(`Consider prioritizing ${lowProgressGoals[0].title}`);
      }

      const developingSkills = data.skills.filter(s => s.level < 3);
      if (developingSkills.length > 0) {
        points.push(`Opportunity to strengthen ${developingSkills[0].name}`);
      }

      points.push('Consider more proactive communication');
    } else {
      points.push('Discuss career aspirations and growth areas');
      points.push('Identify skill development opportunities');
      points.push('Set stretch goals for next quarter');
    }

    return points;
  }

  private generateFeedbackDraft(
    data: PerformanceData,
    type: 'praise' | 'constructive' | 'development',
    points: string[]
  ): string {
    const name = data.userName.split(' ')[0];

    if (type === 'praise') {
      return `${name}, I wanted to recognize your excellent work. ${points[0]}. Your contributions have made a real difference to the team. Keep up the great work!`;
    } else if (type === 'constructive') {
      return `${name}, I'd like to share some observations that might help. ${points[0]}. I believe you have the capability to excel in this area, and I'm here to support your development.`;
    } else {
      return `${name}, I'd like to discuss your development journey. ${points[0]}. What are your thoughts on how we can support your growth?`;
    }
  }

  private getToneGuidance(type: 'praise' | 'constructive' | 'development'): string[] {
    if (type === 'praise') {
      return [
        'Be specific about what was done well',
        'Connect to business impact',
        'Express genuine appreciation',
        'Encourage continuation of positive behaviors',
      ];
    } else if (type === 'constructive') {
      return [
        'Focus on behaviors, not personality',
        'Be specific and actionable',
        'Express confidence in improvement',
        'Offer support and resources',
        'Balance with recognition of strengths',
      ];
    } else {
      return [
        'Be collaborative and curious',
        'Ask open-ended questions',
        'Focus on growth opportunities',
        'Align with their career aspirations',
      ];
    }
  }

  private suggestEvidence(
    data: PerformanceData,
    type: 'praise' | 'constructive' | 'development'
  ): string[] {
    if (type === 'praise') {
      return [
        ...data.goals.filter(g => g.status === 'COMPLETED').map(g => g.title),
        ...data.skills.filter(s => s.level >= 4).map(s => `${s.name} expertise`),
      ].slice(0, 3);
    }
    return [];
  }

  private getWordsToAvoid(type: 'praise' | 'constructive' | 'development'): string[] {
    return [
      'always', 'never',
      'but', 'however' + (type === 'praise' ? '' : ''),
      'you should', 'you need to',
      'problem', 'issue' + (type === 'constructive' ? '' : ''),
    ];
  }

  private suggestImprovements(draft: string): string[] {
    const suggestions: string[] = [];

    if (draft.length < 100) {
      suggestions.push('Consider adding more specific details');
    }

    if (!draft.includes('you')) {
      suggestions.push('Address the recipient directly with "you"');
    }

    return suggestions;
  }

  private calculateSuggestedRating(data: PerformanceData): number {
    let score = 3.0; // Base rating

    // Goal completion
    const completionRate = data.goals.filter(g => g.status === 'COMPLETED').length /
      Math.max(data.goals.length, 1);
    score += (completionRate - 0.5) * 1.0;

    // Skills
    const avgSkillLevel = data.skills.length > 0
      ? data.skills.reduce((sum, s) => sum + s.level, 0) / data.skills.length
      : 3;
    score += (avgSkillLevel - 3) * 0.3;

    // Feedback
    const positiveRatio = data.feedback.filter(f =>
      f.sentiment === 'POSITIVE' || f.type === 'PRAISE'
    ).length / Math.max(data.feedback.length, 1);
    score += (positiveRatio - 0.5) * 0.5;

    return Math.max(1, Math.min(5, Math.round(score * 10) / 10));
  }

  private generateRatingJustification(data: PerformanceData, rating: number): string {
    const label = this.getRatingLabel(rating);
    const completedGoals = data.goals.filter(g => g.status === 'COMPLETED').length;
    const totalGoals = data.goals.length;

    return `Rating of ${rating.toFixed(1)} (${label}) is based on ${completedGoals}/${totalGoals} goals completed, demonstrated skill growth, and feedback received during the review period.`;
  }

  private draftStrengthsSection(data: PerformanceData): SectionDraft {
    const strengths = data.reviews.slice(-1)[0]?.strengths || [];
    const highSkills = data.skills.filter(s => s.level >= 4);

    const keyPoints = [
      ...strengths.slice(0, 3),
      ...highSkills.map(s => `Strong ${s.name} capabilities`).slice(0, 2),
    ];

    return {
      suggestedContent: `Key strengths demonstrated this period include: ${keyPoints.join('; ')}. These have contributed positively to team outcomes.`,
      keyPoints,
      supportingEvidence: [
        ...data.goals.filter(g => g.status === 'COMPLETED').map(g => g.title),
        ...data.feedback.filter(f => f.type === 'PRAISE').map(f => f.content.substring(0, 50)),
      ].slice(0, 5),
      alternativePhrasings: [
        'Demonstrated excellence in...',
        'Consistently showed strength in...',
        'Particularly effective at...',
      ],
    };
  }

  private draftGrowthAreasSection(data: PerformanceData): SectionDraft {
    const growthAreas = data.reviews.slice(-1)[0]?.growthAreas || [];
    const lowSkills = data.skills.filter(s => s.level < 3);

    const keyPoints = [
      ...growthAreas.slice(0, 2),
      ...lowSkills.map(s => `Further development in ${s.name}`).slice(0, 2),
    ];

    return {
      suggestedContent: `Development opportunities include: ${keyPoints.join('; ')}. Focusing on these areas will support continued growth.`,
      keyPoints,
      supportingEvidence: data.feedback
        .filter(f => f.type === 'CONSTRUCTIVE')
        .map(f => f.content.substring(0, 50))
        .slice(0, 3),
      alternativePhrasings: [
        'Areas for continued development...',
        'Opportunities for growth include...',
        'Focus areas for the next period...',
      ],
    };
  }

  private highlightAchievements(
    data: PerformanceData,
    period: { start: Date; end: Date }
  ): string[] {
    const achievements: string[] = [];

    const periodGoals = data.goals.filter(g =>
      g.status === 'COMPLETED' &&
      new Date(g.dueDate) >= period.start &&
      new Date(g.dueDate) <= period.end
    );

    for (const goal of periodGoals.slice(0, 5)) {
      achievements.push(`Completed: ${goal.title}`);
    }

    return achievements;
  }

  private generateDevelopmentRecommendations(data: PerformanceData): string[] {
    const recs: string[] = [];

    const lowSkills = data.skills.filter(s => s.level < 3);
    for (const skill of lowSkills.slice(0, 2)) {
      recs.push(`Develop ${skill.name} through targeted training`);
    }

    const growthAreas = data.reviews.slice(-1)[0]?.growthAreas || [];
    for (const area of growthAreas.slice(0, 2)) {
      recs.push(`Focus on improving ${area}`);
    }

    return recs;
  }

  private detectPotentialBias(data: PerformanceData): string[] {
    // This would integrate with BiasDetectionService
    return [];
  }

  private checkCompleteness(
    data: PerformanceData,
    rating: number
  ): CompletenessCheck {
    const missing: string[] = [];
    const suggestions: string[] = [];

    if (data.goals.length === 0) {
      missing.push('No goals linked to review');
      suggestions.push('Add goals to provide performance context');
    }

    if (data.feedback.length === 0) {
      missing.push('No feedback data available');
      suggestions.push('Request peer feedback before finalizing');
    }

    if (rating >= 4.0 && data.goals.filter(g => g.status === 'COMPLETED').length === 0) {
      suggestions.push('High rating should be supported by goal completion');
    }

    return {
      isComplete: missing.length === 0,
      missingElements: missing,
      suggestions,
    };
  }

  private explainRatingQuestion(data: PerformanceData): {
    answer: string;
    confidence: number;
    supportingData: string[];
    suggestedFollowUps: string[];
  } {
    const latestReview = data.reviews.slice(-1)[0];
    const rating = latestReview?.rating || 3.0;
    const label = this.getRatingLabel(rating);

    return {
      answer: `Your rating of ${rating.toFixed(1)} (${label}) reflects your goal completion rate of ${Math.round(data.goals.filter(g => g.status === 'COMPLETED').length / Math.max(data.goals.length, 1) * 100)}%, skills development, and feedback received. ${latestReview?.strengths?.length ? `Key strengths noted: ${latestReview.strengths.slice(0, 2).join(', ')}.` : ''}`,
      confidence: 80,
      supportingData: [
        `Goals completed: ${data.goals.filter(g => g.status === 'COMPLETED').length}/${data.goals.length}`,
        `Positive feedback: ${data.feedback.filter(f => f.type === 'PRAISE').length}`,
        `Skills at level 4+: ${data.skills.filter(s => s.level >= 4).length}`,
      ],
      suggestedFollowUps: [
        'What specific areas would you like to improve?',
        'Would you like recommendations for reaching the next rating level?',
      ],
    };
  }

  private answerImprovementQuestion(data: PerformanceData): {
    answer: string;
    confidence: number;
    supportingData: string[];
    suggestedFollowUps: string[];
  } {
    const lowSkills = data.skills.filter(s => s.level < 3);
    const incompleteGoals = data.goals.filter(g => g.status === 'ACTIVE' && g.progress < 70);

    return {
      answer: `To improve your performance, focus on: ${lowSkills.length > 0 ? `developing ${lowSkills[0].name}` : 'skill enhancement'}, ${incompleteGoals.length > 0 ? `completing ${incompleteGoals[0].title}` : 'goal progress'}, and increasing collaborative contributions. Would you like a detailed development plan?`,
      confidence: 75,
      supportingData: [
        ...lowSkills.map(s => `${s.name}: Level ${s.level}`),
        ...incompleteGoals.map(g => `${g.title}: ${g.progress}%`),
      ],
      suggestedFollowUps: [
        'Would you like specific recommendations for skill development?',
        'Should I suggest resources for improvement?',
      ],
    };
  }

  private answerStrengthsQuestion(data: PerformanceData): {
    answer: string;
    confidence: number;
    supportingData: string[];
    suggestedFollowUps: string[];
  } {
    const highSkills = data.skills.filter(s => s.level >= 4);
    const recentStrengths = data.reviews.slice(-1)[0]?.strengths || [];

    return {
      answer: `Your key strengths include: ${[...highSkills.map(s => s.name), ...recentStrengths].slice(0, 4).join(', ')}. These are areas where you consistently excel and add value to the team.`,
      confidence: 85,
      supportingData: [
        ...highSkills.map(s => `${s.name}: Level ${s.level}/5`),
        ...data.feedback.filter(f => f.type === 'PRAISE').slice(0, 3).map(f => f.content.substring(0, 50)),
      ],
      suggestedFollowUps: [
        'How can you leverage these strengths for career growth?',
        'Would you like to mentor others in your areas of expertise?',
      ],
    };
  }

  private answerGoalsQuestion(data: PerformanceData): {
    answer: string;
    confidence: number;
    supportingData: string[];
    suggestedFollowUps: string[];
  } {
    const active = data.goals.filter(g => g.status === 'ACTIVE');
    const completed = data.goals.filter(g => g.status === 'COMPLETED');
    const avgProgress = active.length > 0
      ? active.reduce((sum, g) => sum + g.progress, 0) / active.length
      : 0;

    return {
      answer: `You have ${completed.length} completed goals and ${active.length} in progress. Average progress on active goals is ${Math.round(avgProgress)}%. ${avgProgress < 50 ? 'Consider prioritizing goal completion.' : 'Good progress!'}`,
      confidence: 90,
      supportingData: [
        ...active.map(g => `${g.title}: ${g.progress}%`),
        `Completed: ${completed.length}`,
      ],
      suggestedFollowUps: [
        'Which goal would you like to focus on next?',
        'Do you need support with any blocked goals?',
      ],
    };
  }

  private answerComparisonQuestion(data: PerformanceData, peers: PeerData[]): {
    answer: string;
    confidence: number;
    supportingData: string[];
    suggestedFollowUps: string[];
  } {
    const similarPeers = peers.filter(p => p.level === data.level);
    const avgPeerRating = similarPeers.length > 0
      ? similarPeers.reduce((sum, p) => sum + p.avgRating, 0) / similarPeers.length
      : 3.0;
    const latestRating = data.reviews.slice(-1)[0]?.rating || 3.0;

    const comparison = latestRating > avgPeerRating
      ? 'above peer average'
      : latestRating < avgPeerRating
        ? 'below peer average'
        : 'at peer average';

    return {
      answer: `Your performance is ${comparison}. Your rating of ${latestRating.toFixed(1)} compares to the peer average of ${avgPeerRating.toFixed(1)} for Level ${data.level} in your department.`,
      confidence: 70,
      supportingData: [
        `Your rating: ${latestRating}`,
        `Peer average: ${avgPeerRating.toFixed(1)}`,
        `Comparison group size: ${similarPeers.length}`,
      ],
      suggestedFollowUps: [
        'What differentiates top performers at your level?',
        'Would you like suggestions to move above peer average?',
      ],
    };
  }

  private generateGeneralAnswer(data: PerformanceData, question: string): string {
    return `Based on your performance data, you have ${data.goals.filter(g => g.status === 'COMPLETED').length} completed goals, ${data.skills.filter(s => s.level >= 4).length} strong skills, and have received ${data.feedback.length} feedback items. Is there a specific aspect you'd like to explore further?`;
  }

  private gatherRelevantData(data: PerformanceData): string[] {
    return [
      `Goals: ${data.goals.length} total, ${data.goals.filter(g => g.status === 'COMPLETED').length} completed`,
      `Skills: ${data.skills.length} tracked, ${data.skills.filter(s => s.level >= 4).length} at advanced level`,
      `Feedback: ${data.feedback.length} items received`,
      `Reviews: ${data.reviews.length} historical reviews`,
    ];
  }

  // Helper methods for content generation

  private generateGoalExplanation(
    completed: GoalData[],
    active: GoalData[],
    avgProgress: number
  ): string {
    if (completed.length === 0 && active.length === 0) {
      return 'No goals were set for this review period. Setting clear goals helps measure performance accurately.';
    }

    if (avgProgress >= 80) {
      return `Excellent goal achievement with ${completed.length} goals completed and ${Math.round(avgProgress)}% average progress on active goals.`;
    } else if (avgProgress >= 50) {
      return `Solid goal progress with ${completed.length} completed and ${Math.round(avgProgress)}% progress on remaining ${active.length} active goals.`;
    } else {
      return `Goal progress needs attention: ${completed.length} completed, but active goals show ${Math.round(avgProgress)}% average progress.`;
    }
  }

  private generateFeedbackExplanation(
    positive: FeedbackData[],
    constructive: FeedbackData[]
  ): string {
    const total = positive.length + constructive.length;

    if (total === 0) {
      return 'Limited feedback was available for this period. Seeking feedback helps provide a complete picture.';
    }

    const ratio = positive.length / total;
    if (ratio >= 0.7) {
      return `Strong positive feedback from peers and managers (${positive.length} positive items). Recognition for contributions is notable.`;
    } else if (ratio >= 0.5) {
      return `Balanced feedback received with both recognition (${positive.length}) and development suggestions (${constructive.length}).`;
    } else {
      return `Feedback indicates areas for growth (${constructive.length} development items). Addressing this feedback can improve future performance.`;
    }
  }

  private generateSkillsExplanation(
    skills: SkillData[],
    growing: SkillData[],
    avgLevel: number
  ): string {
    if (skills.length === 0) {
      return 'No skills have been assessed. Skills tracking helps identify development areas.';
    }

    if (growing.length >= 2 && avgLevel >= 3.5) {
      return `Strong skill profile with ${growing.length} skills showing growth. Overall skill level is above expectations.`;
    } else if (avgLevel >= 3) {
      return `Skills meet role expectations with ${growing.length} areas of active development.`;
    } else {
      return `Skills development is a focus area. Current average level is ${avgLevel.toFixed(1)}/5 with opportunity for growth.`;
    }
  }

  private generateCollaborationExplanation(activities: ActivityData[]): string {
    if (activities.length === 0) {
      return 'Limited collaborative activities recorded. Increasing team contributions can improve this dimension.';
    }

    if (activities.length >= 10) {
      return `Highly collaborative with ${activities.length} team contributions including code reviews, mentoring, and cross-functional work.`;
    } else if (activities.length >= 5) {
      return `Good collaboration with ${activities.length} recorded contributions to team activities.`;
    } else {
      return `Some collaborative activities (${activities.length}) recorded. Increasing participation can strengthen team impact.`;
    }
  }

  private getSkillResources(skills: SkillData[]): LearningResource[] {
    return skills.slice(0, 2).map(skill => ({
      type: 'course' as const,
      title: `${skill.name} Development Course`,
      duration: '4-8 hours',
      relevance: 80,
    }));
  }
}

export const aiPerformanceCopilot = new AIPerformanceCopilot();
