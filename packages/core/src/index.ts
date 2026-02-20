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
  type ArtifactSource,
  type ArtifactType,
  type WorkArtifact,
  type PerformanceEvidence,
  type RatingValidation,
  type ProofReport,
  type PerformanceCategory,
  type EvidenceSummary,
  type CategoryEvidence,
  type EvidenceGap,
} from './performance-proof-engine';

// Trust Score System (USP Feature 2)
export {
  TrustScoreSystem,
  trustScoreSystem,
  type ReviewerTrustProfile,
  type TrustComponents,
  type TrustFlag,
  type TrustFlagType,
  type FeedbackCredibility,
  type RatingReliability,
  type RelationshipAnalysis,
  type TeamTrustMetrics,
  type ManipulationDetection,
  type ManipulationPattern,
  type MutualRating,
  type HistoricalMetrics,
} from './trust-score-system';

// Performance Timeline (USP Feature 3)
export {
  PerformanceTimelineService,
  performanceTimelineService,
  type PerformanceSignal,
  type SignalType,
  type SignalCategory,
  type PerformanceSnapshot,
  type PerformanceTimeline,
  type TimelineDataPoint,
  type TimelineSummary,
  type RealTimeIndicator,
  type TeamPerformanceHeatmap,
  type TeamMemberPerformance,
  type PerformanceMilestone,
  type PerformanceAnomaly,
  type PerformanceForecast,
  type PerformanceAlert,
} from './performance-timeline';

// AI Performance Copilot (USP Feature 4)
export {
  AIPerformanceCopilot,
  aiPerformanceCopilot,
  type PerformanceExplanation,
  type ExplanationSection,
  type KeyFactor,
  type PeerComparison,
  type ImprovementRecommendation,
  type RecommendationCategory,
  type ActionItem,
  type CoachingInsight,
  type InsightContent,
  type CareerPathSuggestion,
  type CareerPath,
  type ReadinessAssessment,
  type FeedbackDraft,
  type ReviewDraftAssistance,
  type SectionDraft,
  type CompletenessCheck,
} from './ai-performance-copilot';

// Goal Early Warning System (USP Feature 5)
export {
  GoalEarlyWarningSystem,
  goalEarlyWarningSystem,
  type RiskFactor,
  type GoalRiskAssessment,
  type TeamRiskDashboard,
  type TeamRiskSummary,
  type Alert,
  type AlertType,
  type AlertAction,
  type GoalsByRiskLevel,
} from './goal-early-warning';

// Silent Contribution Detection (USP Feature 6)
export {
  SilentContributionDetectionService,
  silentContributionDetection,
  type ContributionType,
  type ContributionCategory,
  type SilentContribution,
  type ContributionImpact,
  type InvisibleWorkProfile,
  type InvisibleWorkSummary,
  type TeamInvisibleWorkAnalysis,
  type TeamInvisibleWorkSummary,
  type EnablingMember,
  type WorkDistribution,
} from './silent-contribution-detection';

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

// Performance Simulator (USP Feature 8)
export {
  PerformanceSimulator,
  performanceSimulator,
  type SimulationScenario,
  type SimulationResult,
} from './performance-simulator';

// Learning & Growth / Mentoring
export {
  LearningGrowthService,
  learningGrowthService,
} from './learning-growth';

// Validation schemas
export * from './validation';

// Constants
export * from './constants';
