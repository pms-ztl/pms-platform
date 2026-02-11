// Bias Detection (Feature 1)
export {
  BiasDetectionService,
  biasDetectionService,
  type BiasIndicator,
  type BiasType,
  type BiasAnalysisResult,
} from './bias-detection';

// Calibration Assistant (Feature 2)
export {
  CalibrationAssistantService,
  calibrationAssistantService,
  type ReviewData,
  type OutlierResult,
  type BiasAlert,
  type DistributionAnalysis,
  type ReviewerAnalysis,
  type DiscussionTopic,
  type CalibrationPreAnalysis,
} from './calibration-assistant';

// Goal Alignment (Feature 8)
export {
  GoalAlignmentService,
  goalAlignmentService,
  type GoalNode,
  type GoalEdge,
  type GoalGraph,
  type AlignmentSuggestion,
  type ProgressRollup,
} from './goal-alignment';

// Review Cycle Automation (Feature 11)
export {
  ReviewCycleAutomationService,
  reviewCycleAutomationService,
  type CycleConfig,
  type ReminderSchedule,
  type CompletionPrediction,
  type AutomatedWorkflow,
} from './review-cycle-automation';

// Performance Proof Engine (USP Feature 1)
export {
  PerformanceProofEngine,
  performanceProofEngine,
  type EvidenceSource,
  type CollectedEvidence,
  type EvidenceItem,
  type ValidationResult,
  type ProofReport,
  type ArtifactLink,
  type EvidenceAnomaly,
} from './performance-proof-engine';

// Trust Score System (USP Feature 2)
export {
  TrustScoreSystem,
  trustScoreSystem,
  type TrustFactor,
  type TrustProfile,
  type FeedbackCredibility,
  type RatingReliability,
  type RelationshipDynamics,
  type TeamTrustMetrics,
  type ManipulationIndicator,
  type TrustWeightedRating,
} from './trust-score-system';

// Performance Timeline (USP Feature 3)
export {
  PerformanceTimelineService,
  performanceTimelineService,
  type PerformanceSignal,
  type TimelineSnapshot,
  type PerformanceTimeline,
  type RealTimeIndicator,
  type TeamHeatmapCell,
  type TeamHeatmap,
  type ChartDataPoint,
  type TimelineChartData,
} from './performance-timeline';

// AI Performance Copilot (USP Feature 4)
export {
  AIPerformanceCopilot,
  aiPerformanceCopilot,
  type ExplanationContext,
  type RatingExplanation,
  type Recommendation,
  type RecommendationSet,
  type CoachingInsight,
  type CareerPathSuggestion,
  type DraftAssistance,
  type QuestionAnswer,
} from './ai-performance-copilot';

// Goal Early Warning System (USP Feature 5)
export {
  GoalEarlyWarningSystem,
  goalEarlyWarningSystem,
  type RiskFactor,
  type GoalRiskAssessment,
  type TeamRiskDashboard,
  type InterventionAction,
  type InterventionPlan,
  type MonitoringResult,
} from './goal-early-warning';

// Silent Contribution Detection (USP Feature 6)
export {
  SilentContributionDetectionService,
  silentContributionDetection,
  type ContributionType,
  type SilentContribution,
  type InvisibleWorkProfile,
  type TeamInvisibleWorkAnalysis,
  type EnablingScore,
  type TopContributor,
} from './silent-contribution-detection';

// Bias & Favoritism Firewall (USP Feature 7)
export {
  BiasFavoritismFirewall,
  biasFavoritismFirewall,
  type BiasCategory,
  type DecisionType,
  type RiskLevel,
  type FirewallAction,
  type DecisionContext,
  type BiasSignal,
  type FavoritismIndicator,
  type FirewallDecision,
  type JustificationRequirement,
  type AlternativeRecommendation,
  type AuditEntry,
  type FavoritismNetwork,
  type OrganizationalBiasHealth,
  type BiasHotspot,
  type FirewallConfig,
} from './bias-favoritism-firewall';

// Performance Simulator (USP Feature 8)
export {
  PerformanceSimulator,
  performanceSimulator,
  type SimulationType,
  type SimulationScenario,
  type SimulationChange,
  type SimulationConstraint,
  type OrganizationalSnapshot,
  type SimulationResult,
  type SimulationImpact,
  type CascadingEffect,
  type ConstraintViolation,
  type SimulationRecommendation,
  type TeamDynamicsProjection,
  type CareerPathSimulation,
  type BudgetSimulation,
} from './performance-simulator';

// Explainable Promotion Engine (USP Feature 9)
export {
  ExplainablePromotionEngine,
  explainablePromotionEngine,
  type PromotionCriteria,
  type ReadinessLevel,
  type PromotionCriteriaDefinition,
  type CriteriaScore,
  type PromotionReadinessReport,
  type GapArea,
  type DevelopmentAction,
  type TimelineEstimate,
  type PeerBenchmark,
  type PromotionRecommendation,
  type BiasCheckResult,
  type PromotionDecision,
  type PromotionHistory,
  type PromotionPipeline,
  type LevelDefinition,
} from './explainable-promotion-engine';

// Organizational Friction Index (USP Feature 10)
export {
  OrganizationalFrictionIndexService,
  organizationalFrictionIndex,
  type FrictionCategory,
  type FrictionSeverity,
  type FrictionTrend,
  type FrictionPoint,
  type FrictionIndex,
  type CollaborationAnalysis,
  type TeamCollaboration,
  type ProcessEfficiency,
  type DecisionVelocity,
  type SkillGapAnalysis,
  type ResourceUtilization,
  type PrioritizedAction,
} from './organizational-friction-index';

// Compensation & Rewards Module
export {
  CompensationRewardsService,
  compensationRewardsService,
  type CompensationType,
  type MeritBasis,
  type CompensationBand,
  type EmployeeCompensation,
  type EquityGrant,
  type MeritIncreaseRecommendation,
  type PayEquityAnalysis,
  type EquityGapDimension,
  type PayEquityCase,
  type BonusCalculation,
  type CompensationBudget,
  type TotalRewardsStatement,
  type MarketBenchmark,
} from './compensation-rewards';

// Learning & Growth Module
export {
  LearningGrowthService,
  learningGrowthService,
  type SkillLevel,
  type LearningResourceType,
  type Skill,
  type UserSkillProfile,
  type UserSkill,
  type SkillGapArea,
  type LearningPath,
  type LearningMilestone,
  type LearningResource,
  type DevelopmentPlan,
  type DevelopmentGoal,
  type Competency,
  type CompetencyAssessment,
  type MentorMatch,
  type CareerPath,
  type LearningAnalytics,
} from './learning-growth';

// Employee Engagement & Wellbeing Module
export {
  EngagementWellbeingService,
  engagementWellbeingService,
  type EngagementDimension,
  type WellbeingIndicator,
  type SurveyType,
  type EngagementSurvey,
  type SurveyQuestion,
  type SurveyResponse,
  type EngagementScore,
  type WellbeingIndex,
  type BurnoutRisk,
  type WellbeingRecommendation,
  type WellbeingAlert,
  type RecognitionEvent,
  type RecognitionMetrics,
  type TeamHealthDiagnostic,
  type PulseCheck,
  type SentimentAnalysis,
} from './engagement-wellbeing';

// Real-time WebSocket Layer
export {
  RealtimeWebSocketService,
  realtimeWebSocketService,
  type EventType,
  type PresenceStatus,
  type WebSocketEvent,
  type UserPresence,
  type SubscriptionFilter,
  type CollaborationSession,
  type CollaborationParticipant,
  type CollaborationUpdate,
  type NotificationPreferences,
  type LiveActivityFeed,
  type ActivityItem,
  type CalibrationLiveSession,
  type GoalProgressStream,
  type ConnectionInfo,
} from './realtime-websocket';

// Advanced Analytics Engine
export {
  AdvancedAnalyticsEngine,
  advancedAnalyticsEngine,
  type AnalyticsTimeframe,
  type MetricType,
  type AggregationType,
  type VisualizationType,
  type AnalyticsQuery,
  type AnalyticsResult,
  type Dashboard,
  type DashboardWidget,
  type PerformanceTrendAnalysis,
  type AttritionAnalytics,
  type DiversityAnalytics,
  type ReportDefinition,
  type GeneratedReport,
} from './advanced-analytics';

// Mathematical Performance Engine
export {
  mathEngine,
  mean,
  weightedMean,
  weightedHarmonicMean,
  variance,
  standardDeviation,
  sampleStdDev,
  zScore,
  sigmoid,
  boundedSigmoid,
  pearsonCorrelation,
  linearRegression,
  ewma,
  shannonEntropy,
  percentileRank,
  bayesianEstimate,
  giniCoefficient,
  calculateGoalFromTasks,
  calculatePerformanceScore,
  calculateTeamAnalytics,
  assessGoalRisk,
  calibrateRatings,
  type TaskCompletion,
  type GoalMathResult,
  type PerformanceInputs,
  type PerformanceResult,
  type TeamMathResult,
  type GoalRiskInput,
  type GoalRiskResult,
  calculateCPIS,
  type CPISInput,
  type CPISDimension,
  type CPISResult,
  type FairnessAnalysis,
} from './math-engine';

// Validation schemas
export * from './validation';

// Constants
export * from './constants';

// Architecture (DDD, CQRS, Events, Errors, API, Observability)
export * from './architecture';
