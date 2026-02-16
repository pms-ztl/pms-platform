/**
 * Silent Contribution Detection
 * USP Feature 6: Identifies high-impact low-visibility work
 *
 * This service:
 * - Detects "invisible work" that often goes unrecognized
 * - Identifies employees who enable others' success
 * - Surfaces behind-the-scenes contributions
 * - Prevents recognition bias toward visible-only performers
 * - Ensures fair evaluation of all contribution types
 */

export interface SilentContribution {
  id: string;
  userId: string;
  userName: string;
  type: ContributionType;
  category: ContributionCategory;
  description: string;
  impact: ContributionImpact;
  beneficiaries: Beneficiary[];
  evidence: ContributionEvidence[];
  detectedAt: Date;
  period: { start: Date; end: Date };
  recognitionStatus: 'UNRECOGNIZED' | 'PARTIALLY_RECOGNIZED' | 'RECOGNIZED';
  visibilityScore: number; // 0-100 (lower = more invisible)
  impactScore: number; // 0-100
}

export type ContributionType =
  | 'KNOWLEDGE_TRANSFER'
  | 'UNBLOCKING_OTHERS'
  | 'CODE_REVIEW'
  | 'DOCUMENTATION'
  | 'PROCESS_IMPROVEMENT'
  | 'MENTORING'
  | 'INCIDENT_PREVENTION'
  | 'TECHNICAL_DEBT_REDUCTION'
  | 'INFRASTRUCTURE_WORK'
  | 'CROSS_TEAM_SUPPORT'
  | 'ONBOARDING_HELP'
  | 'TOOLING_IMPROVEMENT'
  | 'QUALITY_ASSURANCE'
  | 'COMMUNICATION_FACILITATION'
  | 'MEETING_PREPARATION'
  | 'CONFLICT_RESOLUTION';

export type ContributionCategory =
  | 'ENABLING_OTHERS'
  | 'MAINTAINING_SYSTEMS'
  | 'QUALITY_WORK'
  | 'KNOWLEDGE_SHARING'
  | 'TEAM_HEALTH'
  | 'OPERATIONAL_EXCELLENCE';

export interface ContributionImpact {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  scope: 'INDIVIDUAL' | 'TEAM' | 'DEPARTMENT' | 'ORGANIZATION';
  quantifiedValue?: number;
  valueUnit?: string;
  rippleEffect: string[];
}

export interface Beneficiary {
  userId?: string;
  userName?: string;
  type: 'INDIVIDUAL' | 'TEAM' | 'PROJECT' | 'SYSTEM';
  benefitDescription: string;
}

export interface ContributionEvidence {
  source: string;
  type: 'AUTOMATED' | 'DERIVED' | 'INFERRED' | 'REPORTED';
  description: string;
  timestamp: Date;
  confidence: number;
  dataPoints: string[];
}

export interface InvisibleWorkProfile {
  userId: string;
  userName: string;
  role: string;
  department: string;
  period: { start: Date; end: Date };
  silentContributions: SilentContribution[];
  summary: InvisibleWorkSummary;
  comparisonToVisibleWork: VisibilityComparison;
  recognitionGap: RecognitionGap;
  recommendations: string[];
  generatedAt: Date;
}

export interface InvisibleWorkSummary {
  totalContributions: number;
  byCategory: Record<ContributionCategory, number>;
  byType: Record<ContributionType, number>;
  averageImpactScore: number;
  averageVisibilityScore: number;
  totalBeneficiaries: number;
  estimatedValueContributed: number;
}

export interface VisibilityComparison {
  visibleWorkScore: number;
  invisibleWorkScore: number;
  ratio: number; // Visible:Invisible
  interpretation: string;
  isBalanced: boolean;
}

export interface RecognitionGap {
  hasGap: boolean;
  gapSeverity: 'NONE' | 'MINOR' | 'MODERATE' | 'SIGNIFICANT';
  unrecognizedContributions: number;
  potentialImpact: string;
  suggestedActions: string[];
}

export interface TeamInvisibleWorkAnalysis {
  teamId: string;
  teamName: string;
  period: { start: Date; end: Date };
  memberProfiles: InvisibleWorkProfile[];
  teamSummary: TeamInvisibleWorkSummary;
  enablingMembers: EnablingMember[];
  workDistribution: WorkDistribution;
  recommendations: string[];
}

export interface TeamInvisibleWorkSummary {
  totalInvisibleContributions: number;
  avgInvisibleWorkPerMember: number;
  topContributionTypes: { type: ContributionType; count: number }[];
  recognitionGapScore: number;
  enablingVsEnabledRatio: number;
}

export interface EnablingMember {
  userId: string;
  userName: string;
  enablingScore: number;
  topEnablingTypes: ContributionType[];
  peopleEnabled: number;
  isUnderrecognized: boolean;
}

export interface WorkDistribution {
  membersDoingMostInvisibleWork: { userId: string; userName: string; percentage: number }[];
  membersReceivingMostEnabling: { userId: string; userName: string; percentage: number }[];
  imbalance: 'NONE' | 'MINOR' | 'SIGNIFICANT';
  imbalanceDescription: string;
}

// Input data types
interface WorkActivity {
  id: string;
  userId: string;
  type: string;
  description: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface CodeReviewData {
  reviewerId: string;
  authorId: string;
  prId: string;
  commentsCount: number;
  duration: number;
  complexity: string;
  timestamp: Date;
}

interface MentoringData {
  mentorId: string;
  menteeId: string;
  sessionType: string;
  duration: number;
  topic: string;
  timestamp: Date;
}

interface IncidentData {
  id: string;
  reporterId: string;
  resolverId: string;
  preventerId?: string;
  type: string;
  severity: string;
  wasPreventive: boolean;
  timestamp: Date;
}

interface DocumentationData {
  authorId: string;
  type: string;
  title: string;
  views: number;
  helpfulnessScore: number;
  timestamp: Date;
}

interface UnblockingData {
  helperId: string;
  helpedId: string;
  context: string;
  timeUnblocked: number;
  impactLevel: string;
  timestamp: Date;
}

export class SilentContributionDetectionService {
  /**
   * Analyzes all available data to detect silent contributions
   */
  detectSilentContributions(
    userId: string,
    userName: string,
    activities: WorkActivity[],
    codeReviews: CodeReviewData[],
    mentoring: MentoringData[],
    incidents: IncidentData[],
    documentation: DocumentationData[],
    unblocking: UnblockingData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    // Detect code review contributions
    contributions.push(...this.detectCodeReviewContributions(
      userId, userName, codeReviews, period
    ));

    // Detect mentoring contributions
    contributions.push(...this.detectMentoringContributions(
      userId, userName, mentoring, period
    ));

    // Detect incident prevention
    contributions.push(...this.detectIncidentPreventionContributions(
      userId, userName, incidents, period
    ));

    // Detect documentation contributions
    contributions.push(...this.detectDocumentationContributions(
      userId, userName, documentation, period
    ));

    // Detect unblocking contributions
    contributions.push(...this.detectUnblockingContributions(
      userId, userName, unblocking, period
    ));

    // Detect process improvement from activities
    contributions.push(...this.detectProcessImprovements(
      userId, userName, activities, period
    ));

    // Detect knowledge transfer patterns
    contributions.push(...this.detectKnowledgeTransfer(
      userId, userName, activities, codeReviews, mentoring, period
    ));

    // Detect cross-team support
    contributions.push(...this.detectCrossTeamSupport(
      userId, userName, activities, unblocking, period
    ));

    return contributions;
  }

  /**
   * Builds a complete invisible work profile for a user
   */
  buildInvisibleWorkProfile(
    userId: string,
    userName: string,
    role: string,
    department: string,
    contributions: SilentContribution[],
    visibleWorkScore: number,
    feedbackReceived: number,
    recognitionsReceived: number
  ): InvisibleWorkProfile {
    const summary = this.calculateSummary(contributions);
    const comparison = this.calculateVisibilityComparison(
      contributions,
      visibleWorkScore
    );
    const recognitionGap = this.calculateRecognitionGap(
      contributions,
      feedbackReceived,
      recognitionsReceived
    );
    const recommendations = this.generateProfileRecommendations(
      contributions,
      comparison,
      recognitionGap
    );

    return {
      userId,
      userName,
      role,
      department,
      period: this.getContributionsPeriod(contributions),
      silentContributions: contributions,
      summary,
      comparisonToVisibleWork: comparison,
      recognitionGap,
      recommendations,
      generatedAt: new Date(),
    };
  }

  /**
   * Analyzes invisible work patterns across a team
   */
  analyzeTeamInvisibleWork(
    teamId: string,
    teamName: string,
    profiles: InvisibleWorkProfile[]
  ): TeamInvisibleWorkAnalysis {
    const period = this.getTeamPeriod(profiles);
    const teamSummary = this.calculateTeamSummary(profiles);
    const enablingMembers = this.identifyEnablingMembers(profiles);
    const workDistribution = this.analyzeWorkDistribution(profiles);
    const recommendations = this.generateTeamRecommendations(
      teamSummary,
      enablingMembers,
      workDistribution
    );

    return {
      teamId,
      teamName,
      period,
      memberProfiles: profiles,
      teamSummary,
      enablingMembers,
      workDistribution,
      recommendations,
    };
  }

  /**
   * Calculates an "enabling score" for how much someone helps others succeed
   */
  calculateEnablingScore(contributions: SilentContribution[]): {
    score: number;
    components: Record<string, number>;
    interpretation: string;
  } {
    const components: Record<string, number> = {
      mentoring: 0,
      unblocking: 0,
      codeReview: 0,
      knowledgeSharing: 0,
      crossTeamSupport: 0,
    };

    for (const c of contributions) {
      switch (c.type) {
        case 'MENTORING':
          components.mentoring += c.impactScore * 0.2;
          break;
        case 'UNBLOCKING_OTHERS':
          components.unblocking += c.impactScore * 0.25;
          break;
        case 'CODE_REVIEW':
          components.codeReview += c.impactScore * 0.15;
          break;
        case 'KNOWLEDGE_TRANSFER':
        case 'DOCUMENTATION':
          components.knowledgeSharing += c.impactScore * 0.2;
          break;
        case 'CROSS_TEAM_SUPPORT':
          components.crossTeamSupport += c.impactScore * 0.2;
          break;
      }
    }

    // Normalize
    const maxPerComponent = 100;
    for (const key of Object.keys(components)) {
      components[key] = Math.min(maxPerComponent, components[key]);
    }

    const score = Object.values(components).reduce((a, b) => a + b, 0) / 5;

    let interpretation: string;
    if (score >= 80) {
      interpretation = 'Exceptional enabler - critical to team success';
    } else if (score >= 60) {
      interpretation = 'Strong enabler - regularly helps others succeed';
    } else if (score >= 40) {
      interpretation = 'Moderate enabler - occasional support to others';
    } else if (score >= 20) {
      interpretation = 'Developing enabler - primarily focused on own work';
    } else {
      interpretation = 'Focused on individual contributions';
    }

    return { score: Math.round(score), components, interpretation };
  }

  /**
   * Identifies top invisible contributors in an organization
   */
  findTopInvisibleContributors(
    profiles: InvisibleWorkProfile[],
    limit: number = 10
  ): Array<{
    userId: string;
    userName: string;
    department: string;
    totalContributions: number;
    totalImpact: number;
    recognitionGap: string;
    topTypes: ContributionType[];
  }> {
    return profiles
      .map(p => ({
        userId: p.userId,
        userName: p.userName,
        department: p.department,
        totalContributions: p.summary.totalContributions,
        totalImpact: p.summary.averageImpactScore * p.summary.totalContributions,
        recognitionGap: p.recognitionGap.gapSeverity,
        topTypes: this.getTopContributionTypes(p.silentContributions),
      }))
      .sort((a, b) => b.totalImpact - a.totalImpact)
      .slice(0, limit);
  }

  // Private detection methods

  private detectCodeReviewContributions(
    userId: string,
    userName: string,
    reviews: CodeReviewData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    const userReviews = reviews.filter(r =>
      r.reviewerId === userId &&
      r.timestamp >= period.start &&
      r.timestamp <= period.end
    );

    if (userReviews.length === 0) return contributions;

    // Aggregate reviews into contribution
    const totalComments = userReviews.reduce((sum, r) => sum + r.commentsCount, 0);
    const totalDuration = userReviews.reduce((sum, r) => sum + r.duration, 0);
    const complexReviews = userReviews.filter(r => r.complexity === 'HIGH').length;
    const uniqueAuthors = new Set(userReviews.map(r => r.authorId)).size;

    // Calculate impact
    let impactLevel: ContributionImpact['level'] = 'LOW';
    if (userReviews.length >= 20 || totalComments >= 50) {
      impactLevel = 'HIGH';
    } else if (userReviews.length >= 10 || totalComments >= 25) {
      impactLevel = 'MEDIUM';
    }

    const impactScore = Math.min(100,
      userReviews.length * 3 +
      totalComments * 0.5 +
      complexReviews * 5 +
      uniqueAuthors * 2
    );

    contributions.push({
      id: `contrib_cr_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'CODE_REVIEW',
      category: 'QUALITY_WORK',
      description: `Conducted ${userReviews.length} code reviews with ${totalComments} comments, supporting ${uniqueAuthors} team members`,
      impact: {
        level: impactLevel,
        scope: uniqueAuthors > 5 ? 'TEAM' : 'INDIVIDUAL',
        quantifiedValue: totalDuration,
        valueUnit: 'minutes invested',
        rippleEffect: [
          'Improved code quality',
          'Knowledge sharing with authors',
          'Caught potential bugs early',
        ],
      },
      beneficiaries: userReviews.slice(0, 5).map(r => ({
        userId: r.authorId,
        type: 'INDIVIDUAL' as const,
        benefitDescription: 'Code quality feedback',
      })),
      evidence: [{
        source: 'GitHub/GitLab',
        type: 'AUTOMATED',
        description: 'Code review activity data',
        timestamp: new Date(),
        confidence: 95,
        dataPoints: [
          `Reviews: ${userReviews.length}`,
          `Comments: ${totalComments}`,
          `Complex reviews: ${complexReviews}`,
        ],
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 25, // Code reviews are low visibility
      impactScore,
    });

    return contributions;
  }

  private detectMentoringContributions(
    userId: string,
    userName: string,
    mentoring: MentoringData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    const userMentoring = mentoring.filter(m =>
      m.mentorId === userId &&
      m.timestamp >= period.start &&
      m.timestamp <= period.end
    );

    if (userMentoring.length === 0) return contributions;

    const totalDuration = userMentoring.reduce((sum, m) => sum + m.duration, 0);
    const uniqueMentees = new Set(userMentoring.map(m => m.menteeId)).size;
    const topics = [...new Set(userMentoring.map(m => m.topic))];

    let impactLevel: ContributionImpact['level'] = 'LOW';
    if (totalDuration >= 600 || uniqueMentees >= 3) { // 10+ hours
      impactLevel = 'HIGH';
    } else if (totalDuration >= 300 || uniqueMentees >= 2) { // 5+ hours
      impactLevel = 'MEDIUM';
    }

    const impactScore = Math.min(100,
      totalDuration / 10 +
      uniqueMentees * 15 +
      topics.length * 5
    );

    contributions.push({
      id: `contrib_mentor_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'MENTORING',
      category: 'ENABLING_OTHERS',
      description: `Mentored ${uniqueMentees} colleague(s) for ${Math.round(totalDuration / 60)} hours across ${topics.length} topic areas`,
      impact: {
        level: impactLevel,
        scope: uniqueMentees > 2 ? 'TEAM' : 'INDIVIDUAL',
        quantifiedValue: totalDuration,
        valueUnit: 'minutes of mentoring',
        rippleEffect: [
          'Accelerated skill development',
          'Reduced onboarding time',
          'Knowledge preservation',
          'Increased team capability',
        ],
      },
      beneficiaries: [...new Set(userMentoring.map(m => m.menteeId))].map(menteeId => ({
        userId: menteeId,
        type: 'INDIVIDUAL' as const,
        benefitDescription: 'Mentorship and guidance',
      })),
      evidence: [{
        source: 'Mentoring System',
        type: 'AUTOMATED',
        description: 'Recorded mentoring sessions',
        timestamp: new Date(),
        confidence: 90,
        dataPoints: [
          `Sessions: ${userMentoring.length}`,
          `Total time: ${Math.round(totalDuration / 60)} hours`,
          `Mentees: ${uniqueMentees}`,
        ],
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 20, // Mentoring is often invisible
      impactScore,
    });

    return contributions;
  }

  private detectIncidentPreventionContributions(
    userId: string,
    userName: string,
    incidents: IncidentData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    const preventedIncidents = incidents.filter(i =>
      i.preventerId === userId &&
      i.wasPreventive &&
      i.timestamp >= period.start &&
      i.timestamp <= period.end
    );

    if (preventedIncidents.length === 0) return contributions;

    const highSeverity = preventedIncidents.filter(i =>
      i.severity === 'HIGH' || i.severity === 'CRITICAL'
    ).length;

    let impactLevel: ContributionImpact['level'] = 'LOW';
    if (highSeverity >= 1 || preventedIncidents.length >= 5) {
      impactLevel = 'HIGH';
    } else if (preventedIncidents.length >= 2) {
      impactLevel = 'MEDIUM';
    }

    const impactScore = Math.min(100,
      preventedIncidents.length * 15 +
      highSeverity * 25
    );

    contributions.push({
      id: `contrib_prevent_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'INCIDENT_PREVENTION',
      category: 'OPERATIONAL_EXCELLENCE',
      description: `Prevented ${preventedIncidents.length} incident(s) including ${highSeverity} high-severity issues`,
      impact: {
        level: impactLevel,
        scope: highSeverity > 0 ? 'ORGANIZATION' : 'TEAM',
        quantifiedValue: preventedIncidents.length,
        valueUnit: 'incidents prevented',
        rippleEffect: [
          'Avoided downtime and customer impact',
          'Saved incident response time',
          'Maintained system reliability',
          'Protected team from firefighting',
        ],
      },
      beneficiaries: [{
        type: 'SYSTEM' as const,
        benefitDescription: 'System stability maintained',
      }],
      evidence: [{
        source: 'Incident Management System',
        type: 'AUTOMATED',
        description: 'Preventive action records',
        timestamp: new Date(),
        confidence: 85,
        dataPoints: [
          `Prevented: ${preventedIncidents.length}`,
          `High severity: ${highSeverity}`,
        ],
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 10, // Prevented incidents are very invisible
      impactScore,
    });

    return contributions;
  }

  private detectDocumentationContributions(
    userId: string,
    userName: string,
    documentation: DocumentationData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    const userDocs = documentation.filter(d =>
      d.authorId === userId &&
      d.timestamp >= period.start &&
      d.timestamp <= period.end
    );

    if (userDocs.length === 0) return contributions;

    const totalViews = userDocs.reduce((sum, d) => sum + d.views, 0);
    const avgHelpfulness = userDocs.reduce((sum, d) => sum + d.helpfulnessScore, 0) / userDocs.length;

    let impactLevel: ContributionImpact['level'] = 'LOW';
    if (totalViews >= 500 || userDocs.length >= 10) {
      impactLevel = 'HIGH';
    } else if (totalViews >= 100 || userDocs.length >= 5) {
      impactLevel = 'MEDIUM';
    }

    const impactScore = Math.min(100,
      userDocs.length * 8 +
      totalViews * 0.05 +
      avgHelpfulness * 10
    );

    contributions.push({
      id: `contrib_docs_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'DOCUMENTATION',
      category: 'KNOWLEDGE_SHARING',
      description: `Created ${userDocs.length} documentation pieces viewed ${totalViews} times with ${avgHelpfulness.toFixed(1)}/5 helpfulness`,
      impact: {
        level: impactLevel,
        scope: totalViews > 200 ? 'ORGANIZATION' : 'TEAM',
        quantifiedValue: totalViews,
        valueUnit: 'document views',
        rippleEffect: [
          'Reduced knowledge silos',
          'Enabled self-service problem solving',
          'Accelerated onboarding',
          'Preserved institutional knowledge',
        ],
      },
      beneficiaries: [{
        type: 'TEAM' as const,
        benefitDescription: 'Knowledge documentation',
      }],
      evidence: [{
        source: 'Confluence/Notion',
        type: 'AUTOMATED',
        description: 'Documentation activity',
        timestamp: new Date(),
        confidence: 90,
        dataPoints: [
          `Documents: ${userDocs.length}`,
          `Total views: ${totalViews}`,
          `Avg helpfulness: ${avgHelpfulness.toFixed(1)}`,
        ],
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 30, // Documentation is somewhat invisible
      impactScore,
    });

    return contributions;
  }

  private detectUnblockingContributions(
    userId: string,
    userName: string,
    unblocking: UnblockingData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    const userUnblocks = unblocking.filter(u =>
      u.helperId === userId &&
      u.timestamp >= period.start &&
      u.timestamp <= period.end
    );

    if (userUnblocks.length === 0) return contributions;

    const totalTimeUnblocked = userUnblocks.reduce((sum, u) => sum + u.timeUnblocked, 0);
    const uniqueHelped = new Set(userUnblocks.map(u => u.helpedId)).size;
    const highImpact = userUnblocks.filter(u => u.impactLevel === 'HIGH').length;

    let impactLevel: ContributionImpact['level'] = 'LOW';
    if (highImpact >= 3 || totalTimeUnblocked >= 1440) { // 24+ hours unblocked
      impactLevel = 'HIGH';
    } else if (highImpact >= 1 || totalTimeUnblocked >= 480) { // 8+ hours
      impactLevel = 'MEDIUM';
    }

    const impactScore = Math.min(100,
      userUnblocks.length * 10 +
      totalTimeUnblocked / 30 +
      highImpact * 15 +
      uniqueHelped * 5
    );

    contributions.push({
      id: `contrib_unblock_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'UNBLOCKING_OTHERS',
      category: 'ENABLING_OTHERS',
      description: `Unblocked ${uniqueHelped} colleague(s) ${userUnblocks.length} times, saving approximately ${Math.round(totalTimeUnblocked / 60)} hours`,
      impact: {
        level: impactLevel,
        scope: uniqueHelped > 3 ? 'TEAM' : 'INDIVIDUAL',
        quantifiedValue: totalTimeUnblocked,
        valueUnit: 'minutes saved',
        rippleEffect: [
          'Kept projects on schedule',
          'Reduced frustration and context switching',
          'Enabled faster deliveries',
          'Built team resilience',
        ],
      },
      beneficiaries: [...new Set(userUnblocks.map(u => u.helpedId))].slice(0, 5).map(helpedId => ({
        userId: helpedId,
        type: 'INDIVIDUAL' as const,
        benefitDescription: 'Unblocked on work',
      })),
      evidence: [{
        source: 'Inferred from Slack/Teams',
        type: 'DERIVED',
        description: 'Help requests and resolutions',
        timestamp: new Date(),
        confidence: 75,
        dataPoints: [
          `Unblocking instances: ${userUnblocks.length}`,
          `People helped: ${uniqueHelped}`,
          `Time saved: ${Math.round(totalTimeUnblocked / 60)} hours`,
        ],
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 15, // Unblocking is very invisible
      impactScore,
    });

    return contributions;
  }

  private detectProcessImprovements(
    userId: string,
    userName: string,
    activities: WorkActivity[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    const processActivities = activities.filter(a =>
      a.userId === userId &&
      a.timestamp >= period.start &&
      a.timestamp <= period.end &&
      (a.type === 'PROCESS_IMPROVEMENT' ||
       a.type === 'TOOLING' ||
       a.type === 'AUTOMATION')
    );

    if (processActivities.length === 0) return contributions;

    const impactScore = Math.min(100, processActivities.length * 20);

    contributions.push({
      id: `contrib_process_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'PROCESS_IMPROVEMENT',
      category: 'OPERATIONAL_EXCELLENCE',
      description: `Implemented ${processActivities.length} process improvement(s)`,
      impact: {
        level: processActivities.length >= 3 ? 'HIGH' : processActivities.length >= 2 ? 'MEDIUM' : 'LOW',
        scope: 'TEAM',
        rippleEffect: [
          'Reduced manual effort',
          'Improved consistency',
          'Enabled team scalability',
        ],
      },
      beneficiaries: [{
        type: 'TEAM' as const,
        benefitDescription: 'Process improvements',
      }],
      evidence: [{
        source: 'Activity logs',
        type: 'INFERRED',
        description: 'Process improvement activities',
        timestamp: new Date(),
        confidence: 70,
        dataPoints: processActivities.map(a => a.description),
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 35,
      impactScore,
    });

    return contributions;
  }

  private detectKnowledgeTransfer(
    userId: string,
    userName: string,
    activities: WorkActivity[],
    codeReviews: CodeReviewData[],
    mentoring: MentoringData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    // Look for patterns indicating knowledge transfer
    const knowledgeActivities = activities.filter(a =>
      a.userId === userId &&
      a.timestamp >= period.start &&
      a.timestamp <= period.end &&
      (a.type === 'KNOWLEDGE_SHARING' ||
       a.type === 'TRAINING' ||
       a.type === 'PRESENTATION')
    );

    // Also consider extensive code review comments as knowledge transfer
    const detailedReviews = codeReviews.filter(r =>
      r.reviewerId === userId &&
      r.timestamp >= period.start &&
      r.timestamp <= period.end &&
      r.commentsCount >= 5
    );

    const totalKnowledgeEvents = knowledgeActivities.length + Math.floor(detailedReviews.length / 2);

    if (totalKnowledgeEvents === 0) return contributions;

    const uniqueRecipients = new Set([
      ...mentoring.filter(m => m.mentorId === userId).map(m => m.menteeId),
      ...detailedReviews.map(r => r.authorId),
    ]).size;

    const impactScore = Math.min(100, totalKnowledgeEvents * 12 + uniqueRecipients * 8);

    contributions.push({
      id: `contrib_kt_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'KNOWLEDGE_TRANSFER',
      category: 'KNOWLEDGE_SHARING',
      description: `Transferred knowledge through ${totalKnowledgeEvents} activities to ${uniqueRecipients} colleagues`,
      impact: {
        level: uniqueRecipients >= 5 ? 'HIGH' : uniqueRecipients >= 3 ? 'MEDIUM' : 'LOW',
        scope: uniqueRecipients >= 5 ? 'TEAM' : 'INDIVIDUAL',
        quantifiedValue: uniqueRecipients,
        valueUnit: 'people upskilled',
        rippleEffect: [
          'Reduced bus factor',
          'Increased team capability',
          'Preserved institutional knowledge',
        ],
      },
      beneficiaries: Array.from(new Set([
        ...mentoring.filter(m => m.mentorId === userId).map(m => m.menteeId),
      ])).slice(0, 5).map(id => ({
        userId: id,
        type: 'INDIVIDUAL' as const,
        benefitDescription: 'Knowledge transfer recipient',
      })),
      evidence: [{
        source: 'Multiple sources',
        type: 'DERIVED',
        description: 'Knowledge transfer pattern detected',
        timestamp: new Date(),
        confidence: 70,
        dataPoints: [
          `Knowledge events: ${totalKnowledgeEvents}`,
          `Recipients: ${uniqueRecipients}`,
        ],
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 25,
      impactScore,
    });

    return contributions;
  }

  private detectCrossTeamSupport(
    userId: string,
    userName: string,
    activities: WorkActivity[],
    unblocking: UnblockingData[],
    period: { start: Date; end: Date }
  ): SilentContribution[] {
    const contributions: SilentContribution[] = [];

    // Filter for cross-team activities
    const crossTeamActivities = activities.filter(a =>
      a.userId === userId &&
      a.timestamp >= period.start &&
      a.timestamp <= period.end &&
      a.metadata?.crossTeam === true
    );

    // Also check unblocking of people from other teams
    const crossTeamUnblocks = unblocking.filter(u =>
      u.helperId === userId &&
      u.timestamp >= period.start &&
      u.timestamp <= period.end &&
      u.context?.includes('cross-team')
    );

    const totalCrossTeam = crossTeamActivities.length + crossTeamUnblocks.length;

    if (totalCrossTeam === 0) return contributions;

    const impactScore = Math.min(100, totalCrossTeam * 15);

    contributions.push({
      id: `contrib_xteam_${userId}_${period.start.getTime()}`,
      userId,
      userName,
      type: 'CROSS_TEAM_SUPPORT',
      category: 'ENABLING_OTHERS',
      description: `Provided ${totalCrossTeam} cross-team support interactions`,
      impact: {
        level: totalCrossTeam >= 5 ? 'HIGH' : totalCrossTeam >= 3 ? 'MEDIUM' : 'LOW',
        scope: 'DEPARTMENT',
        quantifiedValue: totalCrossTeam,
        valueUnit: 'cross-team interactions',
        rippleEffect: [
          'Improved cross-team collaboration',
          'Broke down silos',
          'Accelerated org-wide initiatives',
        ],
      },
      beneficiaries: [{
        type: 'TEAM' as const,
        benefitDescription: 'Cross-team support',
      }],
      evidence: [{
        source: 'Activity patterns',
        type: 'INFERRED',
        description: 'Cross-team collaboration detected',
        timestamp: new Date(),
        confidence: 65,
        dataPoints: [`Cross-team activities: ${totalCrossTeam}`],
      }],
      detectedAt: new Date(),
      period,
      recognitionStatus: 'UNRECOGNIZED',
      visibilityScore: 20,
      impactScore,
    });

    return contributions;
  }

  // Helper methods

  private calculateSummary(contributions: SilentContribution[]): InvisibleWorkSummary {
    const byCategory: Record<ContributionCategory, number> = {
      'ENABLING_OTHERS': 0,
      'MAINTAINING_SYSTEMS': 0,
      'QUALITY_WORK': 0,
      'KNOWLEDGE_SHARING': 0,
      'TEAM_HEALTH': 0,
      'OPERATIONAL_EXCELLENCE': 0,
    };

    const byType: Record<ContributionType, number> = {} as Record<ContributionType, number>;

    let totalBeneficiaries = 0;
    let totalImpact = 0;
    let totalVisibility = 0;

    for (const c of contributions) {
      byCategory[c.category] = (byCategory[c.category] || 0) + 1;
      byType[c.type] = (byType[c.type] || 0) + 1;
      totalBeneficiaries += c.beneficiaries.length;
      totalImpact += c.impactScore;
      totalVisibility += c.visibilityScore;
    }

    const estimatedValue = contributions.reduce((sum, c) => {
      const hourlyRate = 100; // Assumed average value per hour
      const hours = (c.impact.quantifiedValue || 0) / 60;
      return sum + hours * hourlyRate * (c.impactScore / 50);
    }, 0);

    return {
      totalContributions: contributions.length,
      byCategory,
      byType,
      averageImpactScore: contributions.length > 0 ? totalImpact / contributions.length : 0,
      averageVisibilityScore: contributions.length > 0 ? totalVisibility / contributions.length : 0,
      totalBeneficiaries,
      estimatedValueContributed: Math.round(estimatedValue),
    };
  }

  private calculateVisibilityComparison(
    contributions: SilentContribution[],
    visibleWorkScore: number
  ): VisibilityComparison {
    const invisibleScore = contributions.reduce((sum, c) => sum + c.impactScore, 0);
    const normalizedInvisible = Math.min(100, invisibleScore / 3); // Normalize to similar scale

    const ratio = visibleWorkScore > 0 ? normalizedInvisible / visibleWorkScore : 1;

    let interpretation: string;
    let isBalanced = false;

    if (ratio > 1.5) {
      interpretation = 'Significant invisible work contribution - may be underrecognized';
    } else if (ratio > 0.8) {
      interpretation = 'Balanced visible and invisible contributions';
      isBalanced = true;
    } else if (ratio > 0.3) {
      interpretation = 'Primarily visible work with some invisible contributions';
      isBalanced = true;
    } else {
      interpretation = 'Focused on visible deliverables - limited invisible work detected';
    }

    return {
      visibleWorkScore,
      invisibleWorkScore: Math.round(normalizedInvisible),
      ratio: Math.round(ratio * 100) / 100,
      interpretation,
      isBalanced,
    };
  }

  private calculateRecognitionGap(
    contributions: SilentContribution[],
    feedbackReceived: number,
    recognitionsReceived: number
  ): RecognitionGap {
    const unrecognized = contributions.filter(c =>
      c.recognitionStatus === 'UNRECOGNIZED'
    ).length;

    const totalContributions = contributions.length;
    const totalImpact = contributions.reduce((sum, c) => sum + c.impactScore, 0);

    const expectedRecognition = Math.round(totalImpact / 20); // 1 recognition per 20 impact points
    const actualRecognition = feedbackReceived + recognitionsReceived;

    let gapSeverity: RecognitionGap['gapSeverity'] = 'NONE';
    let hasGap = false;

    if (expectedRecognition - actualRecognition > 5) {
      gapSeverity = 'SIGNIFICANT';
      hasGap = true;
    } else if (expectedRecognition - actualRecognition > 2) {
      gapSeverity = 'MODERATE';
      hasGap = true;
    } else if (expectedRecognition > actualRecognition) {
      gapSeverity = 'MINOR';
      hasGap = true;
    }

    const suggestedActions: string[] = [];
    if (hasGap) {
      suggestedActions.push('Share invisible contributions in 1:1s with manager');
      suggestedActions.push('Include enabling work in self-review');

      if (gapSeverity === 'SIGNIFICANT') {
        suggestedActions.push('Manager should actively recognize invisible contributions');
        suggestedActions.push('Consider highlighting in team meetings');
      }
    }

    return {
      hasGap,
      gapSeverity,
      unrecognizedContributions: unrecognized,
      potentialImpact: hasGap
        ? 'Underrecognition may impact engagement and retention'
        : 'Recognition levels appear appropriate',
      suggestedActions,
    };
  }

  private generateProfileRecommendations(
    contributions: SilentContribution[],
    comparison: VisibilityComparison,
    gap: RecognitionGap
  ): string[] {
    const recommendations: string[] = [];

    if (gap.gapSeverity === 'SIGNIFICANT' || gap.gapSeverity === 'MODERATE') {
      recommendations.push(
        'Manager: Schedule dedicated time to discuss invisible contributions'
      );
      recommendations.push(
        'Include enabling work metrics in performance review'
      );
    }

    if (comparison.ratio > 1.5) {
      recommendations.push(
        'Balance invisible work with visible deliverables for career growth'
      );
      recommendations.push(
        'Document and share impact of invisible contributions'
      );
    }

    if (contributions.length >= 10) {
      recommendations.push(
        'Excellent enabler - consider for formal recognition program'
      );
    }

    if (contributions.some(c => c.type === 'INCIDENT_PREVENTION' && c.impact.level === 'HIGH')) {
      recommendations.push(
        'Incident prevention work should be highlighted in reviews'
      );
    }

    return recommendations;
  }

  private getContributionsPeriod(contributions: SilentContribution[]): { start: Date; end: Date } {
    if (contributions.length === 0) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { start: thirtyDaysAgo, end: now };
    }

    return contributions[0].period;
  }

  private getTeamPeriod(profiles: InvisibleWorkProfile[]): { start: Date; end: Date } {
    if (profiles.length === 0) {
      const now = new Date();
      return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now };
    }
    return profiles[0].period;
  }

  private calculateTeamSummary(profiles: InvisibleWorkProfile[]): TeamInvisibleWorkSummary {
    const totalContributions = profiles.reduce(
      (sum, p) => sum + p.summary.totalContributions, 0
    );

    const avgPerMember = profiles.length > 0
      ? totalContributions / profiles.length
      : 0;

    // Count contribution types
    const typeCounts: Record<ContributionType, number> = {} as Record<ContributionType, number>;
    for (const p of profiles) {
      for (const c of p.silentContributions) {
        typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
      }
    }

    const topTypes = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type: type as ContributionType, count }));

    const gapScores = profiles.map(p => {
      switch (p.recognitionGap.gapSeverity) {
        case 'SIGNIFICANT': return 3;
        case 'MODERATE': return 2;
        case 'MINOR': return 1;
        default: return 0;
      }
    });

    const avgGapScore = gapScores.reduce((a: number, b: number) => a + b, 0) / gapScores.length;

    // Calculate enabling ratio
    const enablingContributions = profiles.reduce((sum, p) =>
      sum + p.silentContributions.filter(c =>
        c.category === 'ENABLING_OTHERS'
      ).length, 0
    );

    const enablingRatio = totalContributions > 0
      ? enablingContributions / totalContributions
      : 0;

    return {
      totalInvisibleContributions: totalContributions,
      avgInvisibleWorkPerMember: Math.round(avgPerMember * 10) / 10,
      topContributionTypes: topTypes,
      recognitionGapScore: Math.round(avgGapScore * 33), // Scale to 0-100
      enablingVsEnabledRatio: Math.round(enablingRatio * 100) / 100,
    };
  }

  private identifyEnablingMembers(profiles: InvisibleWorkProfile[]): EnablingMember[] {
    return profiles.map(p => {
      const enablingContributions = p.silentContributions.filter(c =>
        c.category === 'ENABLING_OTHERS' ||
        c.type === 'MENTORING' ||
        c.type === 'UNBLOCKING_OTHERS' ||
        c.type === 'CODE_REVIEW'
      );

      const enablingScore = enablingContributions.reduce(
        (sum, c) => sum + c.impactScore, 0
      ) / Math.max(enablingContributions.length, 1);

      const typeCounts: Record<ContributionType, number> = {} as Record<ContributionType, number>;
      for (const c of enablingContributions) {
        typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
      }

      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type as ContributionType);

      const peopleEnabled = new Set(
        enablingContributions.flatMap(c =>
          c.beneficiaries.filter(b => b.userId).map(b => b.userId)
        )
      ).size;

      return {
        userId: p.userId,
        userName: p.userName,
        enablingScore: Math.round(enablingScore),
        topEnablingTypes: topTypes,
        peopleEnabled,
        isUnderrecognized: p.recognitionGap.gapSeverity !== 'NONE',
      };
    }).sort((a, b) => b.enablingScore - a.enablingScore);
  }

  private analyzeWorkDistribution(profiles: InvisibleWorkProfile[]): WorkDistribution {
    const totalContributions = profiles.reduce(
      (sum, p) => sum + p.silentContributions.length, 0
    );

    const byContribution = profiles.map(p => ({
      userId: p.userId,
      userName: p.userName,
      percentage: totalContributions > 0
        ? Math.round((p.silentContributions.length / totalContributions) * 100)
        : 0,
    })).sort((a, b) => b.percentage - a.percentage);

    const topContributors = byContribution.slice(0, 3);

    // Calculate receiving end
    const beneficiaryCount: Record<string, number> = {};
    for (const p of profiles) {
      for (const c of p.silentContributions) {
        for (const b of c.beneficiaries) {
          if (b.userId) {
            beneficiaryCount[b.userId] = (beneficiaryCount[b.userId] || 0) + 1;
          }
        }
      }
    }

    const topReceivers = Object.entries(beneficiaryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([userId, count]) => {
        const profile = profiles.find(p => p.userId === userId);
        return {
          userId,
          userName: profile?.userName || 'Unknown',
          percentage: Math.round((count / Math.max(Object.values(beneficiaryCount).reduce((a, b) => a + b, 0), 1)) * 100),
        };
      });

    // Determine imbalance
    let imbalance: WorkDistribution['imbalance'] = 'NONE';
    let imbalanceDescription = 'Invisible work is well-distributed across the team';

    if (topContributors.length > 0 && topContributors[0].percentage > 50) {
      imbalance = 'SIGNIFICANT';
      imbalanceDescription = `${topContributors[0].userName} does over half of the team's invisible work`;
    } else if (topContributors.length >= 2 &&
               topContributors[0].percentage + topContributors[1].percentage > 60) {
      imbalance = 'MINOR';
      imbalanceDescription = 'Top 2 members handle most invisible work';
    }

    return {
      membersDoingMostInvisibleWork: topContributors,
      membersReceivingMostEnabling: topReceivers,
      imbalance,
      imbalanceDescription,
    };
  }

  private generateTeamRecommendations(
    summary: TeamInvisibleWorkSummary,
    enabling: EnablingMember[],
    distribution: WorkDistribution
  ): string[] {
    const recommendations: string[] = [];

    if (summary.recognitionGapScore > 50) {
      recommendations.push(
        'Team has significant underrecognition of invisible work - increase visibility'
      );
    }

    if (distribution.imbalance === 'SIGNIFICANT') {
      recommendations.push(
        `Balance invisible work load - ${distribution.membersDoingMostInvisibleWork[0].userName} is carrying too much`
      );
    }

    const underrecognizedEnablers = enabling.filter(e => e.isUnderrecognized && e.enablingScore > 60);
    if (underrecognizedEnablers.length > 0) {
      recommendations.push(
        `Recognize key enablers: ${underrecognizedEnablers.map(e => e.userName).join(', ')}`
      );
    }

    if (summary.avgInvisibleWorkPerMember < 3) {
      recommendations.push(
        'Team may benefit from more knowledge sharing and mentoring activities'
      );
    }

    if (summary.enablingVsEnabledRatio > 0.6) {
      recommendations.push(
        'Strong enabling culture - maintain and recognize this behavior'
      );
    }

    return recommendations;
  }

  private getTopContributionTypes(contributions: SilentContribution[]): ContributionType[] {
    const counts: Record<ContributionType, number> = {} as Record<ContributionType, number>;
    for (const c of contributions) {
      counts[c.type] = (counts[c.type] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type as ContributionType);
  }
}

export const silentContributionDetection = new SilentContributionDetectionService();
