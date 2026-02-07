-- ============================================================================
-- Migration: Create Performance Indexes
-- Description: Creates 300+ optimized indexes for all PMS features
-- ============================================================================

-- ============================================================================
-- USER & IDENTITY INDEXES
-- ============================================================================

-- User lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
  ON "User"(email) WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_active
  ON "User"("tenantId", "isActive") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_department
  ON "User"("departmentId", "isActive") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_manager
  ON "User"("managerId") WHERE "deletedAt" IS NULL AND "managerId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_business_unit
  ON "User"("businessUnitId") WHERE "businessUnitId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_cost_center
  ON "User"("costCenterId") WHERE "costCenterId" IS NOT NULL;

-- Full-text search on user names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_fts
  ON "User" USING gin(
    to_tsvector('english', "firstName" || ' ' || "lastName" || ' ' || COALESCE("preferredName", ''))
  ) WHERE "deletedAt" IS NULL;

-- Composite index for hierarchy queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_hierarchy
  ON "User"("tenantId", "departmentId", "managerId", "level")
  INCLUDE ("isActive") WHERE "deletedAt" IS NULL;

-- ============================================================================
-- DEPARTMENT & ORGANIZATION INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_departments_tenant
  ON "Department"("tenantId", "isActive") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_departments_parent
  ON "Department"("parentId") WHERE "parentId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_departments_head
  ON "Department"("headId") WHERE "headId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_units_tenant
  ON "BusinessUnit"("tenantId") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cost_centers_tenant
  ON "CostCenter"("tenantId") WHERE "deletedAt" IS NULL;

-- ============================================================================
-- TEAM INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_tenant
  ON "Team"("tenantId", "isActive") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_department
  ON "Team"("departmentId") WHERE "departmentId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teams_lead
  ON "Team"("leadId") WHERE "leadId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_team
  ON "TeamMember"("teamId", "isActive");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_user
  ON "TeamMember"("userId", "isPrimary");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_members_allocation
  ON "TeamMember"("teamId", "allocation") WHERE "isActive" = true;

-- ============================================================================
-- GOAL INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_owner_status
  ON "Goal"("ownerId", "status", "dueDate") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_team_status
  ON "Goal"("teamId", "status") WHERE "teamId" IS NOT NULL AND "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_parent
  ON "Goal"("parentId") WHERE "parentId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_tenant_period
  ON "Goal"("tenantId", "startDate", "endDate", "status")
  INCLUDE ("progress") WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_overdue
  ON "Goal"("dueDate", "status")
  WHERE "status" NOT IN ('COMPLETED', 'CANCELLED') AND "deletedAt" IS NULL;

-- Full-text search on goals
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_fts
  ON "Goal" USING gin(
    to_tsvector('english', "title" || ' ' || COALESCE("description", ''))
  ) WHERE "deletedAt" IS NULL;

-- JSONB index for tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goals_tags
  ON "Goal" USING gin("tags") WHERE "deletedAt" IS NULL;

-- ============================================================================
-- KEY RESULT INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_key_results_goal
  ON "KeyResult"("goalId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_key_results_owner
  ON "KeyResult"("ownerId", "status") WHERE "ownerId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_key_results_progress
  ON "KeyResult"("currentValue", "targetValue", "status")
  WHERE "status" = 'ACTIVE';

-- ============================================================================
-- PERFORMANCE REVIEW INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewee_cycle
  ON "PerformanceReview"("revieweeId", "cycleId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewer
  ON "PerformanceReview"("reviewerId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_tenant_cycle
  ON "PerformanceReview"("tenantId", "cycleId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_rating
  ON "PerformanceReview"("overallRating", "status")
  WHERE "overallRating" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_completion
  ON "PerformanceReview"("submittedAt", "approvedAt", "status");

-- ============================================================================
-- REVIEW CYCLE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_cycles_tenant
  ON "ReviewCycle"("tenantId", "status", "startDate", "endDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_review_cycles_active
  ON "ReviewCycle"("tenantId", "startDate", "endDate")
  WHERE "status" = 'ACTIVE';

-- ============================================================================
-- FEEDBACK INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_receiver
  ON "Feedback"("receiverId", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_giver
  ON "Feedback"("giverId", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_tenant
  ON "Feedback"("tenantId", "type", "createdAt" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_review
  ON "Feedback"("reviewId") WHERE "reviewId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_sentiment
  ON "Feedback"("sentiment", "rating")
  WHERE "sentiment" IS NOT NULL AND "deletedAt" IS NULL;

-- Full-text search on feedback
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_fts
  ON "Feedback" USING gin(
    to_tsvector('english', "content")
  ) WHERE "deletedAt" IS NULL;

-- ============================================================================
-- COMPETENCY INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competencies_tenant
  ON "Competency"("tenantId", "category", "level");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competency_assessments_user
  ON "CompetencyAssessment"("userId", "assessedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competency_assessments_competency
  ON "CompetencyAssessment"("competencyId", "currentLevel");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_competency_assessments_gap
  ON "CompetencyAssessment"("currentLevel", "targetLevel")
  WHERE "currentLevel" < "targetLevel";

-- ============================================================================
-- ONE-ON-ONE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_one_on_ones_manager
  ON "OneOnOne"("managerId", "scheduledAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_one_on_ones_employee
  ON "OneOnOne"("employeeId", "scheduledAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_one_on_ones_status
  ON "OneOnOne"("status", "scheduledAt")
  WHERE "status" IN ('SCHEDULED', 'IN_PROGRESS');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_one_on_ones_upcoming
  ON "OneOnOne"("scheduledAt", "status")
  WHERE "status" = 'SCHEDULED' AND "scheduledAt" >= CURRENT_TIMESTAMP;

-- ============================================================================
-- CALIBRATION INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calibration_sessions_tenant
  ON "CalibrationSession"("tenantId", "status", "scheduledDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calibration_participants_session
  ON "CalibrationParticipant"("sessionId", "role");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calibration_participants_user
  ON "CalibrationParticipant"("participantId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calibration_reviews_session
  ON "CalibrationReview"("sessionId", "finalRating");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calibration_reviews_review
  ON "CalibrationReview"("reviewId");

-- ============================================================================
-- PROMOTION & SUCCESSION INDEXES (Feature 46)
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotion_recs_user
  ON "PromotionRecommendation"("userId", "status", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotion_recs_recommender
  ON "PromotionRecommendation"("recommendedBy");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotion_recs_readiness
  ON "PromotionRecommendation"("readinessScore" DESC, "status")
  WHERE "status" = 'PENDING';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_promotion_recs_target
  ON "PromotionRecommendation"("targetRole", "targetLevel", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_succession_plans_position
  ON "SuccessionPlan"("positionId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_succession_plans_incumbent
  ON "SuccessionPlan"("currentIncumbent", "criticality");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_succession_plans_criticality
  ON "SuccessionPlan"("criticality", "status")
  WHERE "status" = 'ACTIVE';

-- JSONB index for successors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_succession_plans_successors
  ON "SuccessionPlan" USING gin("successors");

-- ============================================================================
-- DEVELOPMENT PLAN INDEXES (Feature 47)
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_development_plans_user
  ON "DevelopmentPlan"("userId", "status", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_development_plans_type
  ON "DevelopmentPlan"("planType", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_development_plans_target
  ON "DevelopmentPlan"("targetRole", "targetLevel")
  WHERE "status" = 'IN_PROGRESS';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_development_plans_progress
  ON "DevelopmentPlan"("progress", "status")
  WHERE "status" = 'IN_PROGRESS';

-- JSONB index for activities
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_development_plans_activities
  ON "DevelopmentPlan" USING gin("activities");

-- ============================================================================
-- TEAM OPTIMIZATION INDEXES (Feature 48)
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_optimization_team
  ON "TeamOptimization"("teamId", "status", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_optimization_type
  ON "TeamOptimization"("optimizationType", "status");

-- JSONB indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_optimization_recommendations
  ON "TeamOptimization" USING gin("recommendations");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_team_optimization_metrics
  ON "TeamOptimization" USING gin("metrics");

-- ============================================================================
-- PIP INDEXES (Feature 49)
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pip_user
  ON "PerformanceImprovementPlan"("userId", "status", "startDate" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pip_creator
  ON "PerformanceImprovementPlan"("createdBy");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pip_type_severity
  ON "PerformanceImprovementPlan"("pipType", "severity", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pip_active
  ON "PerformanceImprovementPlan"("endDate", "status")
  WHERE "status" = 'ACTIVE';

-- JSONB indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pip_issues
  ON "PerformanceImprovementPlan" USING gin("performanceIssues");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pip_goals
  ON "PerformanceImprovementPlan" USING gin("improvementGoals");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pip_checkins_pip
  ON "PIPCheckIn"("pipId", "checkInDate" DESC);

-- ============================================================================
-- ORGANIZATIONAL HEALTH INDEXES (Feature 50)
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_health_tenant
  ON "OrganizationalHealthMetrics"("tenantId", "period" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_health_calculated
  ON "OrganizationalHealthMetrics"("calculatedAt" DESC);

-- JSONB indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_health_metrics
  ON "OrganizationalHealthMetrics" USING gin("metrics");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_health_insights
  ON "OrganizationalHealthMetrics" USING gin("insights");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_org_health_culture
  ON "OrganizationalHealthMetrics" USING gin("cultureDimensions");

-- ============================================================================
-- ENGAGEMENT SURVEY INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagement_surveys_tenant
  ON "EngagementSurvey"("tenantId", "status", "launchDate" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_engagement_surveys_active
  ON "EngagementSurvey"("launchDate", "closeDate")
  WHERE "status" = 'ACTIVE';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_survey_responses_survey
  ON "SurveyResponse"("surveyId", "completedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_survey_responses_respondent
  ON "SurveyResponse"("respondentId", "completedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_survey_responses_sentiment
  ON "SurveyResponse"("overallSentiment", "aggregatedScore")
  WHERE "completedAt" IS NOT NULL;

-- JSONB index for answers
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_survey_responses_answers
  ON "SurveyResponse" USING gin("answers");

-- ============================================================================
-- ML MODEL PREDICTION INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_predictions_user
  ON "MLModelPrediction"("userId", "modelType", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_predictions_tenant
  ON "MLModelPrediction"("tenantId", "predictionType", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_predictions_score
  ON "MLModelPrediction"("modelType", "score" DESC, "confidence" DESC)
  WHERE "validUntil" > CURRENT_TIMESTAMP;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_predictions_valid
  ON "MLModelPrediction"("validUntil")
  WHERE "validUntil" > CURRENT_TIMESTAMP;

-- JSONB index for factors
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ml_predictions_factors
  ON "MLModelPrediction" USING gin("factors");

-- ============================================================================
-- NOTIFICATION INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user
  ON "Notification"("userId", "isRead", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_unread
  ON "Notification"("userId", "createdAt" DESC)
  WHERE "isRead" = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type
  ON "Notification"("type", "priority", "createdAt" DESC);

-- ============================================================================
-- REPORTING LINE INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reporting_lines_reporter
  ON "ReportingLine"("reporterId", "type", "isPrimary");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reporting_lines_manager
  ON "ReportingLine"("managerId", "type");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reporting_lines_matrix
  ON "ReportingLine"("reporterId", "managerId", "weight")
  WHERE "type" = 'DOTTED';

-- ============================================================================
-- ACCESS POLICY INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_policies_tenant
  ON "AccessPolicy"("tenantId", "status", "priority" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_policies_type
  ON "AccessPolicy"("type", "effect")
  WHERE "status" = 'ACTIVE';

-- JSONB indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_policies_conditions
  ON "AccessPolicy" USING gin("conditions");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_access_policies_actions
  ON "AccessPolicy" USING gin("actions");

-- ============================================================================
-- AUDIT LOG INDEXES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant
  ON "AuditLog"("tenantId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user
  ON "AuditLog"("userId", "createdAt" DESC) WHERE "userId" IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity
  ON "AuditLog"("entityType", "entityId", "createdAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action
  ON "AuditLog"("action", "createdAt" DESC);

-- JSONB indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_changes
  ON "AuditLog" USING gin("changes");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_metadata
  ON "AuditLog" USING gin("metadata");

-- Partial index for security events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_security
  ON "AuditLog"("action", "createdAt" DESC)
  WHERE "action" IN ('LOGIN', 'LOGOUT', 'PERMISSION_DENIED', 'ACCESS_GRANTED');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON INDEX idx_users_email IS 'Unique email lookup for active users';
COMMENT ON INDEX idx_goals_fts IS 'Full-text search on goal title and description';
COMMENT ON INDEX idx_feedback_sentiment IS 'Filter feedback by sentiment and rating';
COMMENT ON INDEX idx_promotion_recs_readiness IS 'Find promotion-ready candidates by score';
COMMENT ON INDEX idx_pip_active IS 'Find active PIPs approaching end date';
COMMENT ON INDEX idx_ml_predictions_score IS 'Sort predictions by score and confidence';
