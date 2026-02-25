// ============================================================================
// API barrel — re-exports every type, interface, function, const, and class
// from the domain-specific modules so existing imports continue to work.
// ============================================================================

// ── Core client & helpers ──
export { ApiClient, api, getAvatarUrl } from './client';

// ── Shared types ──
export type { ApiError, ApiResponse, User, DashboardMetrics } from './types';

// ── Auth & Users ──
export { authApi, usersApi } from './users';
export type { CreateUserInput, UpdateUserInput, Role, Department } from './users';

// ── Goals ──
export { goalsApi } from './goals';
export type { Goal, CreateGoalInput, UpdateGoalInput, ActivityItem } from './goals';

// ── Reviews ──
export { reviewsApi } from './reviews';
export type { ReviewCycle, ReviewCycleStats, CreateReviewCycleInput, Review, SubmitReviewInput } from './reviews';

// ── Feedback ──
export { feedbackApi } from './feedback';
export type { Feedback, CreateFeedbackInput, TimelineEvent } from './feedback';

// ── Calibration ──
export { calibrationApi } from './calibration';
export type {
  CalibrationSession,
  CreateCalibrationSessionInput,
  CalibrationReview,
  AdjustRatingInput,
  CalibrationRating,
} from './calibration';

// ── Analytics, Performance Math & HR Analytics ──
export { analyticsApi, performanceMathApi, hrAnalyticsApi } from './analytics';
export type {
  PerformanceDistribution,
  GoalTrend,
  FeedbackTrend,
  TeamPerformance,
  BiasMetric,
  PerformanceScoreResult,
  GoalRiskResult,
  TeamAnalyticsResult,
  GoalMappingResult,
  CalibrationResult,
} from './analytics';

// ── Notifications ──
export { notificationsApi } from './notifications';
export type { Notification, NotificationPreferences } from './notifications';

// ── Evidence ──
export { evidenceApi } from './evidence';
export type { Evidence, CreateEvidenceInput } from './evidence';

// ── Promotions ──
export { promotionsApi } from './promotions';
export type { PromotionDecision, CreatePromotionInput } from './promotions';

// ── Compensation ──
export { compensationApi } from './compensation';
export type { CompensationDecision, CreateCompensationInput } from './compensation';

// ── Reports ──
export { reportsApi } from './reports';
export type { GeneratedReport, GenerateReportInput } from './reports';

// ── Calendar ──
export { calendarEventsApi } from './calendar';
export type { CalendarEventData, CreateCalendarEventInput, UpdateCalendarEventInput } from './calendar';

// ── One-on-One Meetings ──
export { oneOnOnesApi } from './one-on-ones';
export type { OneOnOne, CreateOneOnOneInput, UpdateOneOnOneInput } from './one-on-ones';

// ── Development Plans & PIP ──
export { developmentApi, pipApi } from './development';
export type {
  DevelopmentPlan,
  DevelopmentActivity,
  DevelopmentCheckpoint,
  CreateDevelopmentPlanInput,
  CreateDevelopmentActivityInput,
  PIP,
  PIPCheckIn,
  PIPMilestone,
  CreatePIPInput,
} from './development';

// ── Compliance, Audit & Skills ──
export { complianceApi, auditApi, skillsApi } from './compliance';
export type {
  AuditEvent,
  SkillCategory,
  SkillAssessment,
  SkillMatrixEntry,
  CompliancePolicy,
  ComplianceAssessment,
  ComplianceViolation,
} from './compliance';

// ── Admin: License, Config, Announcements, Excel, Succession ──
export { licenseApi, adminConfigApi, successionApi, announcementsApi, excelUploadApi } from './admin';
export type {
  LicenseUsageData,
  SubscriptionInfo,
  Announcement,
  CreateAnnouncementInput,
} from './admin';

// ── AI ──
export { aiApi } from './ai';
export type { AIConversation, AIMessage, AIInsightCard, AIChatResponse } from './ai';

// ── Health Metrics ──
export { healthApi } from './health';
export type { OrganizationalHealth, DepartmentHealth, HealthComponentScores, PeopleMetrics } from './health';

// ── Engagement ──
export { engagementApi } from './engagement';
export type { EngagementOverview, EngagementTrendPoint, DepartmentEngagement, AtRiskEmployee } from './engagement';
export type { EngagementEvent as EngagementEventData } from './engagement';

// ── Pulse Survey ──
export { pulseApi } from './pulse';
export type { PulseSubmission, PulseResponse, PulseCanSubmit, PulseAnalyticsOverview, PulseTrendPoint, PulseDepartmentData } from './pulse';

// ── Super Admin ──
export {
  superAdminAuthApi,
  superAdminTenantsApi,
  superAdminUsersApi,
  superAdminSystemApi,
  superAdminAuditApi,
  superAdminBillingApi,
  superAdminSecurityApi,
} from './super-admin';
export type {
  SADashboardStats,
  SATenant,
  SATenantSettings,
  SAUser,
  SAAuditLog,
  SABillingInfo,
  SAInvoice,
  SASystemConfig,
  SAPaginatedResponse,
} from './super-admin';

// ── Delegations ──
export { delegationsApi } from './delegations';
export type { Delegation, DelegationType, DelegationStatus, CreateDelegationInput, DelegationAuditEvent } from './delegations';

// ── Access Policies ──
export { policiesApi } from './policies';
export type { AccessPolicy, PolicyType, PolicyStatus, PolicyEffect, CreatePolicyInput, UpdatePolicyInput, SimulatePolicyInput, SimulatePolicyResult } from './policies';

// ── RBAC Dashboard ──
export { rbacApi } from './rbac';
export type { RBACStats, RoleDistribution, RecentRoleChange } from './rbac';

// ── AI Insights ──
export { aiInsightsApi } from './ai-insights';
export type {
  SentimentResult,
  SentimentTrendPoint,
  AnomalyItem,
  AnomalyStats,
  BenchmarkComparison,
  TeamBenchmarkSummary,
  ProductivityPrediction,
  AtRiskUser,
} from './ai-insights';

// ── Actionable Insights ──
export { actionableInsightsApi } from './actionable-insights';
export type {
  PromotionRecommendation,
  SuccessionPlan,
  TeamOptimizationResult,
  TeamCompositionAnalysis,
  OrgHealthMetrics,
  CultureDiagnostic,
  GeneratedDevPlan,
} from './actionable-insights';

// ── Performance Simulator ──
export { simulatorApi } from './simulator';
export type { SimulationInput, SimulationImpact, SimulationResult } from './simulator';

// ── Mentoring Hub ──
export { mentoringApi } from './mentoring';
export type { MentorMatch, Mentorship, LearningPathItem } from './mentoring';
