-- CreateEnum
CREATE TYPE "TeamType" AS ENUM ('FUNCTIONAL', 'CROSS_FUNCTIONAL', 'VIRTUAL', 'MATRIX');

-- CreateEnum
CREATE TYPE "TeamMemberRole" AS ENUM ('LEAD', 'DEPUTY_LEAD', 'MEMBER', 'CONTRIBUTOR', 'OBSERVER');

-- CreateEnum
CREATE TYPE "ReportingLineType" AS ENUM ('SOLID', 'DOTTED', 'MATRIX', 'PROJECT');

-- CreateEnum
CREATE TYPE "DelegationType" AS ENUM ('ACTING_MANAGER', 'PROXY_APPROVER', 'REVIEW_DELEGATE', 'FULL_DELEGATION');

-- CreateEnum
CREATE TYPE "DelegationStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PolicyType" AS ENUM ('VISIBILITY', 'ACCESS', 'APPROVAL', 'NOTIFICATION', 'DATA_RETENTION', 'UNION_CONTRACT');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'COMPANY', 'OKR_OBJECTIVE', 'OKR_KEY_RESULT');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReviewCycleStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SELF_ASSESSMENT', 'MANAGER_REVIEW', 'CALIBRATION', 'FINALIZATION', 'SHARING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReviewCycleType" AS ENUM ('ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'PROBATION', 'PROJECT', 'AD_HOC');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'CALIBRATED', 'FINALIZED', 'ACKNOWLEDGED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('SELF', 'MANAGER', 'PEER', 'UPWARD', 'EXTERNAL', 'THREE_SIXTY');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('PRAISE', 'CONSTRUCTIVE', 'SUGGESTION', 'REQUEST', 'RECOGNITION');

-- CreateEnum
CREATE TYPE "FeedbackVisibility" AS ENUM ('PRIVATE', 'MANAGER_VISIBLE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "CalibrationStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OneOnOneStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING_AUTH');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('TASK', 'TICKET', 'PULL_REQUEST', 'CODE_COMMIT', 'DOCUMENT', 'PRESENTATION', 'DESIGN', 'PROJECT_MILESTONE', 'CUSTOMER_FEEDBACK', 'INCIDENT_RESOLUTION', 'MENTORSHIP_SESSION', 'TRAINING_COMPLETION', 'CERTIFICATION', 'MEETING_FACILITATION', 'PROCESS_IMPROVEMENT', 'RECOGNITION_RECEIVED', 'COLLABORATION_CONTRIBUTION', 'KNOWLEDGE_SHARING', 'PEER_FEEDBACK', 'MANAGER_OBSERVATION', 'SELF_ASSESSMENT', 'METRIC_ACHIEVEMENT');

-- CreateEnum
CREATE TYPE "EvidenceSource" AS ENUM ('JIRA', 'GITHUB', 'GITLAB', 'AZURE_DEVOPS', 'CONFLUENCE', 'NOTION', 'GOOGLE_DOCS', 'SLACK', 'TEAMS', 'SALESFORCE', 'ZENDESK', 'BAMBOO_HR', 'WORKDAY', 'MANUAL', 'API_IMPORT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'DISPUTED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('BASE_SALARY', 'BONUS', 'EQUITY', 'COMMISSION', 'ALLOWANCE', 'BENEFITS', 'ONE_TIME_PAYMENT', 'RETENTION_BONUS', 'SIGN_ON_BONUS');

-- CreateEnum
CREATE TYPE "CompensationDecisionStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionDecisionStatus" AS ENUM ('NOMINATED', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DEFERRED', 'IMPLEMENTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('LEVEL_PROMOTION', 'ROLE_CHANGE', 'TITLE_CHANGE', 'LATERAL_MOVE', 'CAREER_TRACK_CHANGE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo_url" TEXT,
    "primary_color" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "subscription_tier" TEXT NOT NULL DEFAULT 'standard',
    "max_users" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "data_region" TEXT NOT NULL DEFAULT 'us-east-1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "head_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_units" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "head_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "manager_id" UUID,
    "budget" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "type" "TeamType" NOT NULL DEFAULT 'FUNCTIONAL',
    "department_id" UUID,
    "business_unit_id" UUID,
    "cost_center_id" UUID,
    "lead_id" UUID,
    "parent_team_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
    "allocation" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "reporter_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "type" "ReportingLineType" NOT NULL DEFAULT 'SOLID',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reporting_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "delegator_id" UUID NOT NULL,
    "delegate_id" UUID NOT NULL,
    "type" "DelegationType" NOT NULL,
    "status" "DelegationStatus" NOT NULL DEFAULT 'PENDING',
    "scope" JSONB NOT NULL DEFAULT '{}',
    "reason" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "revoked_by_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delegations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_policies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PolicyType" NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB NOT NULL DEFAULT '{}',
    "actions" JSONB NOT NULL DEFAULT '{}',
    "effect" TEXT NOT NULL DEFAULT 'ALLOW',
    "target_roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_departments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_teams" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "target_levels" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "union_code" TEXT,
    "contract_type" TEXT,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "access_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "union_contracts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "rules" JSONB NOT NULL DEFAULT '{}',
    "review_restrictions" JSONB NOT NULL DEFAULT '{}',
    "feedback_rules" JSONB NOT NULL DEFAULT '{}',
    "calibration_rules" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "union_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "union_memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "union_contract_id" UUID NOT NULL,
    "membership_number" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "union_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "external_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "job_title" TEXT,
    "employee_number" TEXT,
    "department_id" UUID,
    "business_unit_id" UUID,
    "cost_center_id" UUID,
    "manager_id" UUID,
    "level" INTEGER NOT NULL DEFAULT 1,
    "hire_date" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "contract_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "granted_by" UUID,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "parent_goal_id" UUID,
    "team_id" UUID,
    "type" "GoalType" NOT NULL DEFAULT 'INDIVIDUAL',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "target_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION,
    "unit" TEXT,
    "start_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_alignments" (
    "id" UUID NOT NULL,
    "from_goal_id" UUID NOT NULL,
    "to_goal_id" UUID NOT NULL,
    "alignment_type" TEXT NOT NULL DEFAULT 'supports',
    "contribution_weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_alignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_progress_updates" (
    "id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "previous_progress" DOUBLE PRECISION NOT NULL,
    "new_progress" DOUBLE PRECISION NOT NULL,
    "previous_value" DOUBLE PRECISION,
    "new_value" DOUBLE PRECISION,
    "note" TEXT,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_comments" (
    "id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "goal_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_cycles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReviewCycleType" NOT NULL DEFAULT 'ANNUAL',
    "status" "ReviewCycleStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "self_assessment_start" TIMESTAMP(3),
    "self_assessment_end" TIMESTAMP(3),
    "manager_review_start" TIMESTAMP(3),
    "manager_review_end" TIMESTAMP(3),
    "calibration_start" TIMESTAMP(3),
    "calibration_end" TIMESTAMP(3),
    "sharing_start" TIMESTAMP(3),
    "include_goals" BOOLEAN NOT NULL DEFAULT true,
    "include_feedback" BOOLEAN NOT NULL DEFAULT true,
    "include_360" BOOLEAN NOT NULL DEFAULT false,
    "require_acknowledgment" BOOLEAN NOT NULL DEFAULT true,
    "template_id" UUID,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "review_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sections" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "review_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "reviewee_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "type" "ReviewType" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "overall_rating" DOUBLE PRECISION,
    "calibrated_rating" DOUBLE PRECISION,
    "content" JSONB NOT NULL DEFAULT '{}',
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "areas_for_growth" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "private_notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "calibrated_at" TIMESTAMP(3),
    "finalized_at" TIMESTAMP(3),
    "acknowledged_at" TIMESTAMP(3),
    "shared_at" TIMESTAMP(3),
    "bias_score" DOUBLE PRECISION,
    "bias_flags" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_goals" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "goal_id" UUID NOT NULL,
    "rating" DOUBLE PRECISION,
    "comment" TEXT,
    "achievement_percentage" DOUBLE PRECISION,

    CONSTRAINT "review_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "requested_by_id" UUID,
    "type" "FeedbackType" NOT NULL,
    "visibility" "FeedbackVisibility" NOT NULL DEFAULT 'PRIVATE',
    "content" TEXT NOT NULL,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "value_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skill_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sentiment" TEXT,
    "sentiment_score" DOUBLE PRECISION,
    "ai_category" TEXT,
    "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_sessions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "facilitator_id" UUID NOT NULL,
    "status" "CalibrationStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_start" TIMESTAMP(3) NOT NULL,
    "scheduled_end" TIMESTAMP(3),
    "actual_start" TIMESTAMP(3),
    "actual_end" TIMESTAMP(3),
    "department_scope" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "level_scope" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "pre_analysis" JSONB NOT NULL DEFAULT '{}',
    "outliers" JSONB NOT NULL DEFAULT '[]',
    "bias_alerts" JSONB NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "calibration_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_participants" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'participant',
    "joined_at" TIMESTAMP(3),
    "left_at" TIMESTAMP(3),

    CONSTRAINT "calibration_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_ratings" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "adjusted_by_id" UUID NOT NULL,
    "original_rating" DOUBLE PRECISION NOT NULL,
    "adjusted_rating" DOUBLE PRECISION NOT NULL,
    "rationale" TEXT NOT NULL,
    "discussion_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "one_on_ones" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "status" "OneOnOneStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "location" TEXT,
    "meeting_link" TEXT,
    "agenda" JSONB NOT NULL DEFAULT '[]',
    "manager_notes" TEXT,
    "employee_notes" TEXT,
    "shared_notes" TEXT,
    "action_items" JSONB NOT NULL DEFAULT '[]',
    "completed_at" TIMESTAMP(3),
    "calendar_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "one_on_ones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_frameworks" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "competency_frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencies" (
    "id" UUID NOT NULL,
    "framework_id" UUID NOT NULL,
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "level_descriptions" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING_AUTH',
    "config" JSONB NOT NULL DEFAULT '{}',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "last_sync_at" TIMESTAMP(3),
    "last_error" TEXT,
    "sync_frequency" TEXT NOT NULL DEFAULT 'daily',
    "field_mappings" JSONB NOT NULL DEFAULT '{}',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_sync_jobs" (
    "id" UUID NOT NULL,
    "integration_id" UUID NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "records_processed" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "error_log" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "body_html" TEXT,
    "body_text" TEXT,
    "channels" TEXT[] DEFAULT ARRAY['email']::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "source" "EvidenceSource" NOT NULL DEFAULT 'MANUAL',
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "external_id" TEXT,
    "external_url" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "impact_score" DOUBLE PRECISION,
    "effort_score" DOUBLE PRECISION,
    "quality_score" DOUBLE PRECISION,
    "complexity_score" DOUBLE PRECISION,
    "collaborators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verified_by_id" UUID,
    "verified_at" TIMESTAMP(3),
    "verification_notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skill_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "value_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_evidence" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "category" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "relevance_score" DOUBLE PRECISION,
    "linked_by_id" UUID NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "review_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_decisions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "review_cycle_id" UUID,
    "type" "CompensationType" NOT NULL,
    "status" "CompensationDecisionStatus" NOT NULL DEFAULT 'DRAFT',
    "previous_amount" DOUBLE PRECISION NOT NULL,
    "new_amount" DOUBLE PRECISION NOT NULL,
    "change_amount" DOUBLE PRECISION NOT NULL,
    "change_percent" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effective_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "justification" TEXT,
    "performance_rating" DOUBLE PRECISION,
    "market_data" JSONB,
    "equity_analysis" JSONB,
    "proposed_by_id" UUID NOT NULL,
    "proposed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "implemented_at" TIMESTAMP(3),
    "implemented_by_id" UUID,
    "payroll_reference" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compensation_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_decisions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "employee_id" UUID NOT NULL,
    "review_cycle_id" UUID,
    "calibration_session_id" UUID,
    "type" "PromotionType" NOT NULL DEFAULT 'LEVEL_PROMOTION',
    "status" "PromotionDecisionStatus" NOT NULL DEFAULT 'NOMINATED',
    "previous_role_id" UUID,
    "new_role_id" UUID,
    "previous_level" INTEGER,
    "new_level" INTEGER,
    "previous_title" TEXT,
    "new_title" TEXT,
    "effective_date" TIMESTAMP(3),
    "readiness_score" DOUBLE PRECISION,
    "criteria_scores" JSONB,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "development_areas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "justification" TEXT,
    "nominated_by_id" UUID NOT NULL,
    "nominated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMP(3),
    "rejected_by_id" UUID,
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "deferred_until" TIMESTAMP(3),
    "deferral_reason" TEXT,
    "implemented_at" TIMESTAMP(3),
    "implemented_by_id" UUID,
    "hris_reference" TEXT,
    "compensation_decision_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_evidence" (
    "id" UUID NOT NULL,
    "evidence_id" UUID NOT NULL,
    "compensation_decision_id" UUID,
    "promotion_decision_id" UUID,
    "relevance_score" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "linked_by_id" UUID NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "decision_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_domain_key" ON "tenants"("domain");

-- CreateIndex
CREATE INDEX "tenants_slug_idx" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "tenants_domain_idx" ON "tenants"("domain");

-- CreateIndex
CREATE INDEX "tenants_is_active_idx" ON "tenants"("is_active");

-- CreateIndex
CREATE INDEX "departments_tenant_id_idx" ON "departments"("tenant_id");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "business_units_tenant_id_idx" ON "business_units"("tenant_id");

-- CreateIndex
CREATE INDEX "business_units_parent_id_idx" ON "business_units"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_tenant_id_code_key" ON "business_units"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "cost_centers_tenant_id_idx" ON "cost_centers"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_tenant_id_code_key" ON "cost_centers"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "teams_tenant_id_idx" ON "teams"("tenant_id");

-- CreateIndex
CREATE INDEX "teams_department_id_idx" ON "teams"("department_id");

-- CreateIndex
CREATE INDEX "teams_business_unit_id_idx" ON "teams"("business_unit_id");

-- CreateIndex
CREATE INDEX "teams_lead_id_idx" ON "teams"("lead_id");

-- CreateIndex
CREATE INDEX "teams_type_idx" ON "teams"("type");

-- CreateIndex
CREATE UNIQUE INDEX "teams_tenant_id_code_key" ON "teams"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");

-- CreateIndex
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");

-- CreateIndex
CREATE INDEX "team_members_role_idx" ON "team_members"("role");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

-- CreateIndex
CREATE INDEX "reporting_lines_tenant_id_idx" ON "reporting_lines"("tenant_id");

-- CreateIndex
CREATE INDEX "reporting_lines_reporter_id_idx" ON "reporting_lines"("reporter_id");

-- CreateIndex
CREATE INDEX "reporting_lines_manager_id_idx" ON "reporting_lines"("manager_id");

-- CreateIndex
CREATE INDEX "reporting_lines_type_idx" ON "reporting_lines"("type");

-- CreateIndex
CREATE UNIQUE INDEX "reporting_lines_reporter_id_manager_id_type_key" ON "reporting_lines"("reporter_id", "manager_id", "type");

-- CreateIndex
CREATE INDEX "delegations_tenant_id_idx" ON "delegations"("tenant_id");

-- CreateIndex
CREATE INDEX "delegations_delegator_id_idx" ON "delegations"("delegator_id");

-- CreateIndex
CREATE INDEX "delegations_delegate_id_idx" ON "delegations"("delegate_id");

-- CreateIndex
CREATE INDEX "delegations_type_idx" ON "delegations"("type");

-- CreateIndex
CREATE INDEX "delegations_status_idx" ON "delegations"("status");

-- CreateIndex
CREATE INDEX "delegations_start_date_end_date_idx" ON "delegations"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "access_policies_tenant_id_idx" ON "access_policies"("tenant_id");

-- CreateIndex
CREATE INDEX "access_policies_type_idx" ON "access_policies"("type");

-- CreateIndex
CREATE INDEX "access_policies_status_idx" ON "access_policies"("status");

-- CreateIndex
CREATE INDEX "access_policies_priority_idx" ON "access_policies"("priority");

-- CreateIndex
CREATE INDEX "access_policies_union_code_idx" ON "access_policies"("union_code");

-- CreateIndex
CREATE INDEX "access_policies_contract_type_idx" ON "access_policies"("contract_type");

-- CreateIndex
CREATE INDEX "union_contracts_tenant_id_idx" ON "union_contracts"("tenant_id");

-- CreateIndex
CREATE INDEX "union_contracts_code_idx" ON "union_contracts"("code");

-- CreateIndex
CREATE INDEX "union_contracts_is_active_idx" ON "union_contracts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "union_contracts_tenant_id_code_key" ON "union_contracts"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "union_memberships_user_id_idx" ON "union_memberships"("user_id");

-- CreateIndex
CREATE INDEX "union_memberships_union_contract_id_idx" ON "union_memberships"("union_contract_id");

-- CreateIndex
CREATE INDEX "union_memberships_is_active_idx" ON "union_memberships"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "union_memberships_user_id_union_contract_id_key" ON "union_memberships"("user_id", "union_contract_id");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE INDEX "users_manager_id_idx" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

-- CreateIndex
CREATE INDEX "users_business_unit_id_idx" ON "users"("business_unit_id");

-- CreateIndex
CREATE INDEX "users_cost_center_id_idx" ON "users"("cost_center_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_employee_number_key" ON "users"("tenant_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_key" ON "sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "roles_tenant_id_idx" ON "roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "user_roles_user_id_idx" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_idx" ON "user_roles"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE INDEX "goals_tenant_id_idx" ON "goals"("tenant_id");

-- CreateIndex
CREATE INDEX "goals_owner_id_idx" ON "goals"("owner_id");

-- CreateIndex
CREATE INDEX "goals_parent_goal_id_idx" ON "goals"("parent_goal_id");

-- CreateIndex
CREATE INDEX "goals_team_id_idx" ON "goals"("team_id");

-- CreateIndex
CREATE INDEX "goals_status_idx" ON "goals"("status");

-- CreateIndex
CREATE INDEX "goals_type_idx" ON "goals"("type");

-- CreateIndex
CREATE INDEX "goals_due_date_idx" ON "goals"("due_date");

-- CreateIndex
CREATE INDEX "goal_alignments_from_goal_id_idx" ON "goal_alignments"("from_goal_id");

-- CreateIndex
CREATE INDEX "goal_alignments_to_goal_id_idx" ON "goal_alignments"("to_goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "goal_alignments_from_goal_id_to_goal_id_key" ON "goal_alignments"("from_goal_id", "to_goal_id");

-- CreateIndex
CREATE INDEX "goal_progress_updates_goal_id_idx" ON "goal_progress_updates"("goal_id");

-- CreateIndex
CREATE INDEX "goal_progress_updates_created_at_idx" ON "goal_progress_updates"("created_at");

-- CreateIndex
CREATE INDEX "goal_comments_goal_id_idx" ON "goal_comments"("goal_id");

-- CreateIndex
CREATE INDEX "review_cycles_tenant_id_idx" ON "review_cycles"("tenant_id");

-- CreateIndex
CREATE INDEX "review_cycles_status_idx" ON "review_cycles"("status");

-- CreateIndex
CREATE INDEX "review_cycles_start_date_end_date_idx" ON "review_cycles"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "review_templates_tenant_id_idx" ON "review_templates"("tenant_id");

-- CreateIndex
CREATE INDEX "reviews_tenant_id_idx" ON "reviews"("tenant_id");

-- CreateIndex
CREATE INDEX "reviews_cycle_id_idx" ON "reviews"("cycle_id");

-- CreateIndex
CREATE INDEX "reviews_reviewee_id_idx" ON "reviews"("reviewee_id");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "reviews_status_idx" ON "reviews"("status");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_cycle_id_reviewee_id_reviewer_id_type_key" ON "reviews"("cycle_id", "reviewee_id", "reviewer_id", "type");

-- CreateIndex
CREATE INDEX "review_goals_review_id_idx" ON "review_goals"("review_id");

-- CreateIndex
CREATE INDEX "review_goals_goal_id_idx" ON "review_goals"("goal_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_goals_review_id_goal_id_key" ON "review_goals"("review_id", "goal_id");

-- CreateIndex
CREATE INDEX "feedback_tenant_id_idx" ON "feedback"("tenant_id");

-- CreateIndex
CREATE INDEX "feedback_from_user_id_idx" ON "feedback"("from_user_id");

-- CreateIndex
CREATE INDEX "feedback_to_user_id_idx" ON "feedback"("to_user_id");

-- CreateIndex
CREATE INDEX "feedback_type_idx" ON "feedback"("type");

-- CreateIndex
CREATE INDEX "feedback_visibility_idx" ON "feedback"("visibility");

-- CreateIndex
CREATE INDEX "feedback_created_at_idx" ON "feedback"("created_at");

-- CreateIndex
CREATE INDEX "calibration_sessions_tenant_id_idx" ON "calibration_sessions"("tenant_id");

-- CreateIndex
CREATE INDEX "calibration_sessions_cycle_id_idx" ON "calibration_sessions"("cycle_id");

-- CreateIndex
CREATE INDEX "calibration_sessions_status_idx" ON "calibration_sessions"("status");

-- CreateIndex
CREATE INDEX "calibration_sessions_scheduled_start_idx" ON "calibration_sessions"("scheduled_start");

-- CreateIndex
CREATE INDEX "calibration_participants_session_id_idx" ON "calibration_participants"("session_id");

-- CreateIndex
CREATE INDEX "calibration_participants_user_id_idx" ON "calibration_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "calibration_participants_session_id_user_id_key" ON "calibration_participants"("session_id", "user_id");

-- CreateIndex
CREATE INDEX "calibration_ratings_session_id_idx" ON "calibration_ratings"("session_id");

-- CreateIndex
CREATE INDEX "calibration_ratings_review_id_idx" ON "calibration_ratings"("review_id");

-- CreateIndex
CREATE INDEX "one_on_ones_tenant_id_idx" ON "one_on_ones"("tenant_id");

-- CreateIndex
CREATE INDEX "one_on_ones_manager_id_idx" ON "one_on_ones"("manager_id");

-- CreateIndex
CREATE INDEX "one_on_ones_employee_id_idx" ON "one_on_ones"("employee_id");

-- CreateIndex
CREATE INDEX "one_on_ones_scheduled_at_idx" ON "one_on_ones"("scheduled_at");

-- CreateIndex
CREATE INDEX "competency_frameworks_tenant_id_idx" ON "competency_frameworks"("tenant_id");

-- CreateIndex
CREATE INDEX "competencies_framework_id_idx" ON "competencies"("framework_id");

-- CreateIndex
CREATE INDEX "competencies_parent_id_idx" ON "competencies"("parent_id");

-- CreateIndex
CREATE INDEX "integrations_tenant_id_idx" ON "integrations"("tenant_id");

-- CreateIndex
CREATE INDEX "integrations_type_idx" ON "integrations"("type");

-- CreateIndex
CREATE INDEX "integrations_status_idx" ON "integrations"("status");

-- CreateIndex
CREATE INDEX "integration_sync_jobs_integration_id_idx" ON "integration_sync_jobs"("integration_id");

-- CreateIndex
CREATE INDEX "integration_sync_jobs_status_idx" ON "integration_sync_jobs"("status");

-- CreateIndex
CREATE INDEX "integration_sync_jobs_created_at_idx" ON "integration_sync_jobs"("created_at");

-- CreateIndex
CREATE INDEX "notification_templates_tenant_id_idx" ON "notification_templates"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_tenant_id_type_key" ON "notification_templates"("tenant_id", "type");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE INDEX "evidence_tenant_id_idx" ON "evidence"("tenant_id");

-- CreateIndex
CREATE INDEX "evidence_employee_id_idx" ON "evidence"("employee_id");

-- CreateIndex
CREATE INDEX "evidence_type_idx" ON "evidence"("type");

-- CreateIndex
CREATE INDEX "evidence_source_idx" ON "evidence"("source");

-- CreateIndex
CREATE INDEX "evidence_status_idx" ON "evidence"("status");

-- CreateIndex
CREATE INDEX "evidence_occurred_at_idx" ON "evidence"("occurred_at");

-- CreateIndex
CREATE INDEX "evidence_tenant_id_employee_id_occurred_at_idx" ON "evidence"("tenant_id", "employee_id", "occurred_at");

-- CreateIndex
CREATE INDEX "review_evidence_review_id_idx" ON "review_evidence"("review_id");

-- CreateIndex
CREATE INDEX "review_evidence_evidence_id_idx" ON "review_evidence"("evidence_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_evidence_review_id_evidence_id_key" ON "review_evidence"("review_id", "evidence_id");

-- CreateIndex
CREATE INDEX "compensation_decisions_tenant_id_idx" ON "compensation_decisions"("tenant_id");

-- CreateIndex
CREATE INDEX "compensation_decisions_employee_id_idx" ON "compensation_decisions"("employee_id");

-- CreateIndex
CREATE INDEX "compensation_decisions_review_cycle_id_idx" ON "compensation_decisions"("review_cycle_id");

-- CreateIndex
CREATE INDEX "compensation_decisions_status_idx" ON "compensation_decisions"("status");

-- CreateIndex
CREATE INDEX "compensation_decisions_effective_date_idx" ON "compensation_decisions"("effective_date");

-- CreateIndex
CREATE INDEX "compensation_decisions_type_idx" ON "compensation_decisions"("type");

-- CreateIndex
CREATE INDEX "promotion_decisions_tenant_id_idx" ON "promotion_decisions"("tenant_id");

-- CreateIndex
CREATE INDEX "promotion_decisions_employee_id_idx" ON "promotion_decisions"("employee_id");

-- CreateIndex
CREATE INDEX "promotion_decisions_review_cycle_id_idx" ON "promotion_decisions"("review_cycle_id");

-- CreateIndex
CREATE INDEX "promotion_decisions_calibration_session_id_idx" ON "promotion_decisions"("calibration_session_id");

-- CreateIndex
CREATE INDEX "promotion_decisions_status_idx" ON "promotion_decisions"("status");

-- CreateIndex
CREATE INDEX "promotion_decisions_effective_date_idx" ON "promotion_decisions"("effective_date");

-- CreateIndex
CREATE INDEX "decision_evidence_evidence_id_idx" ON "decision_evidence"("evidence_id");

-- CreateIndex
CREATE INDEX "decision_evidence_compensation_decision_id_idx" ON "decision_evidence"("compensation_decision_id");

-- CreateIndex
CREATE INDEX "decision_evidence_promotion_decision_id_idx" ON "decision_evidence"("promotion_decision_id");

-- CreateIndex
CREATE INDEX "audit_events_tenant_id_idx" ON "audit_events"("tenant_id");

-- CreateIndex
CREATE INDEX "audit_events_user_id_idx" ON "audit_events"("user_id");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_idx" ON "audit_events"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_created_at_idx" ON "audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_units" ADD CONSTRAINT "business_units_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_parent_team_id_fkey" FOREIGN KEY ("parent_team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_lines" ADD CONSTRAINT "reporting_lines_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegator_id_fkey" FOREIGN KEY ("delegator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_delegate_id_fkey" FOREIGN KEY ("delegate_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegations" ADD CONSTRAINT "delegations_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_policies" ADD CONSTRAINT "access_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_policies" ADD CONSTRAINT "access_policies_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_policies" ADD CONSTRAINT "access_policies_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "union_contracts" ADD CONSTRAINT "union_contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "union_memberships" ADD CONSTRAINT "union_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "union_memberships" ADD CONSTRAINT "union_memberships_union_contract_id_fkey" FOREIGN KEY ("union_contract_id") REFERENCES "union_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "business_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_goal_id_fkey" FOREIGN KEY ("parent_goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_alignments" ADD CONSTRAINT "goal_alignments_from_goal_id_fkey" FOREIGN KEY ("from_goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_alignments" ADD CONSTRAINT "goal_alignments_to_goal_id_fkey" FOREIGN KEY ("to_goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_progress_updates" ADD CONSTRAINT "goal_progress_updates_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_comments" ADD CONSTRAINT "goal_comments_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "review_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "review_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewee_id_fkey" FOREIGN KEY ("reviewee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_goals" ADD CONSTRAINT "review_goals_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_goals" ADD CONSTRAINT "review_goals_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "review_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_sessions" ADD CONSTRAINT "calibration_sessions_facilitator_id_fkey" FOREIGN KEY ("facilitator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_participants" ADD CONSTRAINT "calibration_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "calibration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_participants" ADD CONSTRAINT "calibration_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_ratings" ADD CONSTRAINT "calibration_ratings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "calibration_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_ratings" ADD CONSTRAINT "calibration_ratings_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_ratings" ADD CONSTRAINT "calibration_ratings_adjusted_by_id_fkey" FOREIGN KEY ("adjusted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_ones" ADD CONSTRAINT "one_on_ones_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "one_on_ones" ADD CONSTRAINT "one_on_ones_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_frameworks" ADD CONSTRAINT "competency_frameworks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_framework_id_fkey" FOREIGN KEY ("framework_id") REFERENCES "competency_frameworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencies" ADD CONSTRAINT "competencies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "competencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_sync_jobs" ADD CONSTRAINT "integration_sync_jobs_integration_id_fkey" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_evidence" ADD CONSTRAINT "review_evidence_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_evidence" ADD CONSTRAINT "review_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_evidence" ADD CONSTRAINT "review_evidence_linked_by_id_fkey" FOREIGN KEY ("linked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_decisions" ADD CONSTRAINT "compensation_decisions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_decisions" ADD CONSTRAINT "compensation_decisions_review_cycle_id_fkey" FOREIGN KEY ("review_cycle_id") REFERENCES "review_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_decisions" ADD CONSTRAINT "compensation_decisions_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_decisions" ADD CONSTRAINT "compensation_decisions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_decisions" ADD CONSTRAINT "compensation_decisions_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_decisions" ADD CONSTRAINT "compensation_decisions_implemented_by_id_fkey" FOREIGN KEY ("implemented_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_review_cycle_id_fkey" FOREIGN KEY ("review_cycle_id") REFERENCES "review_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_calibration_session_id_fkey" FOREIGN KEY ("calibration_session_id") REFERENCES "calibration_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_nominated_by_id_fkey" FOREIGN KEY ("nominated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_rejected_by_id_fkey" FOREIGN KEY ("rejected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_implemented_by_id_fkey" FOREIGN KEY ("implemented_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_previous_role_id_fkey" FOREIGN KEY ("previous_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_decisions" ADD CONSTRAINT "promotion_decisions_new_role_id_fkey" FOREIGN KEY ("new_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_evidence" ADD CONSTRAINT "decision_evidence_evidence_id_fkey" FOREIGN KEY ("evidence_id") REFERENCES "evidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_evidence" ADD CONSTRAINT "decision_evidence_compensation_decision_id_fkey" FOREIGN KEY ("compensation_decision_id") REFERENCES "compensation_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_evidence" ADD CONSTRAINT "decision_evidence_promotion_decision_id_fkey" FOREIGN KEY ("promotion_decision_id") REFERENCES "promotion_decisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_evidence" ADD CONSTRAINT "decision_evidence_linked_by_id_fkey" FOREIGN KEY ("linked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
