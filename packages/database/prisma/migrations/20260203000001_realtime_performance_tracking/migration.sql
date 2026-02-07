-- Real-Time Performance Tracking Schema Migration
-- Features 1-8: Hourly Tracker, Activity Monitor, Goal Dashboard, Deadline Alerts,
-- Workload Analyzer, Anomaly Detector, Sentiment Gauge, Milestone Tracker

-- ============================================================================
-- PERFORMANCE METRICS (Hourly/Daily Aggregations)
-- ============================================================================

-- Hourly Performance Metrics
CREATE TABLE IF NOT EXISTS "hourly_performance_metrics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "metric_hour" TIMESTAMP NOT NULL,

    -- Task metrics
    "tasks_completed" INTEGER DEFAULT 0,
    "tasks_created" INTEGER DEFAULT 0,
    "task_completion_rate" DECIMAL(5,2) DEFAULT 0,

    -- Time metrics
    "active_minutes" INTEGER DEFAULT 0,
    "focus_minutes" INTEGER DEFAULT 0,
    "meeting_minutes" INTEGER DEFAULT 0,

    -- Goal metrics
    "goal_updates" INTEGER DEFAULT 0,
    "goal_progress_delta" DECIMAL(5,2) DEFAULT 0,

    -- Engagement metrics
    "interactions_count" INTEGER DEFAULT 0,
    "feedback_given" INTEGER DEFAULT 0,
    "feedback_received" INTEGER DEFAULT 0,

    -- Communication metrics
    "messages_sent" INTEGER DEFAULT 0,
    "collaboration_score" DECIMAL(5,2) DEFAULT 0,

    -- Quality metrics
    "quality_score" DECIMAL(5,2),
    "error_count" INTEGER DEFAULT 0,

    -- Computed scores
    "productivity_score" DECIMAL(5,2),
    "engagement_score" DECIMAL(5,2),
    "performance_score" DECIMAL(5,2),

    "created_at" TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "hourly_metrics_unique" UNIQUE("tenant_id", "user_id", "metric_hour")
);

CREATE INDEX "idx_hourly_metrics_tenant_user" ON "hourly_performance_metrics"("tenant_id", "user_id");
CREATE INDEX "idx_hourly_metrics_hour" ON "hourly_performance_metrics"("metric_hour");
CREATE INDEX "idx_hourly_metrics_tenant_hour" ON "hourly_performance_metrics"("tenant_id", "metric_hour");

-- Daily Performance Rollups
CREATE TABLE IF NOT EXISTS "daily_performance_metrics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "metric_date" DATE NOT NULL,

    -- Aggregated task metrics
    "total_tasks_completed" INTEGER DEFAULT 0,
    "total_tasks_created" INTEGER DEFAULT 0,
    "avg_task_completion_rate" DECIMAL(5,2) DEFAULT 0,

    -- Aggregated time metrics
    "total_active_minutes" INTEGER DEFAULT 0,
    "total_focus_minutes" INTEGER DEFAULT 0,
    "total_meeting_minutes" INTEGER DEFAULT 0,
    "first_activity_at" TIMESTAMP,
    "last_activity_at" TIMESTAMP,

    -- Aggregated goal metrics
    "total_goal_updates" INTEGER DEFAULT 0,
    "total_goal_progress_delta" DECIMAL(5,2) DEFAULT 0,
    "goals_on_track" INTEGER DEFAULT 0,
    "goals_at_risk" INTEGER DEFAULT 0,
    "goals_off_track" INTEGER DEFAULT 0,

    -- Aggregated engagement metrics
    "total_interactions" INTEGER DEFAULT 0,
    "total_feedback_given" INTEGER DEFAULT 0,
    "total_feedback_received" INTEGER DEFAULT 0,

    -- Aggregated communication metrics
    "total_messages_sent" INTEGER DEFAULT 0,
    "avg_collaboration_score" DECIMAL(5,2) DEFAULT 0,

    -- Daily scores
    "avg_productivity_score" DECIMAL(5,2),
    "avg_engagement_score" DECIMAL(5,2),
    "overall_performance_score" DECIMAL(5,2),

    -- Anomaly flags
    "has_anomaly" BOOLEAN DEFAULT FALSE,
    "anomaly_types" JSONB DEFAULT '[]',

    -- Trend indicators
    "productivity_trend" VARCHAR(20), -- 'improving', 'stable', 'declining'
    "engagement_trend" VARCHAR(20),

    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "daily_metrics_unique" UNIQUE("tenant_id", "user_id", "metric_date")
);

CREATE INDEX "idx_daily_metrics_tenant_user" ON "daily_performance_metrics"("tenant_id", "user_id");
CREATE INDEX "idx_daily_metrics_date" ON "daily_performance_metrics"("metric_date");
CREATE INDEX "idx_daily_metrics_tenant_date" ON "daily_performance_metrics"("tenant_id", "metric_date");
CREATE INDEX "idx_daily_metrics_anomaly" ON "daily_performance_metrics"("has_anomaly") WHERE "has_anomaly" = TRUE;

-- Weekly Performance Summary
CREATE TABLE IF NOT EXISTS "weekly_performance_metrics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "week_start_date" DATE NOT NULL,
    "week_end_date" DATE NOT NULL,
    "week_number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    -- Weekly aggregates
    "total_tasks_completed" INTEGER DEFAULT 0,
    "total_active_hours" DECIMAL(6,2) DEFAULT 0,
    "total_focus_hours" DECIMAL(6,2) DEFAULT 0,
    "total_meeting_hours" DECIMAL(6,2) DEFAULT 0,

    -- Goal progress
    "goals_completed" INTEGER DEFAULT 0,
    "avg_goal_progress" DECIMAL(5,2) DEFAULT 0,

    -- Scores
    "avg_productivity_score" DECIMAL(5,2),
    "avg_engagement_score" DECIMAL(5,2),
    "weekly_performance_score" DECIMAL(5,2),

    -- Week-over-week comparison
    "wow_productivity_change" DECIMAL(6,2),
    "wow_engagement_change" DECIMAL(6,2),

    -- Highlights
    "achievements" JSONB DEFAULT '[]',
    "areas_for_improvement" JSONB DEFAULT '[]',

    "created_at" TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "weekly_metrics_unique" UNIQUE("tenant_id", "user_id", "week_start_date")
);

CREATE INDEX "idx_weekly_metrics_tenant_user" ON "weekly_performance_metrics"("tenant_id", "user_id");
CREATE INDEX "idx_weekly_metrics_week" ON "weekly_performance_metrics"("week_start_date");

-- Monthly Performance Summary
CREATE TABLE IF NOT EXISTS "monthly_performance_metrics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,

    -- Monthly aggregates
    "total_tasks_completed" INTEGER DEFAULT 0,
    "total_active_hours" DECIMAL(8,2) DEFAULT 0,
    "total_focus_hours" DECIMAL(8,2) DEFAULT 0,

    -- Goal metrics
    "goals_completed" INTEGER DEFAULT 0,
    "goals_created" INTEGER DEFAULT 0,
    "avg_goal_completion_time_days" DECIMAL(6,2),

    -- Performance metrics
    "avg_productivity_score" DECIMAL(5,2),
    "avg_engagement_score" DECIMAL(5,2),
    "monthly_performance_score" DECIMAL(5,2),

    -- Comparison
    "mom_productivity_change" DECIMAL(6,2),
    "yoy_productivity_change" DECIMAL(6,2),

    -- Distribution
    "performance_percentile" INTEGER,
    "department_rank" INTEGER,

    "created_at" TIMESTAMP DEFAULT NOW(),

    CONSTRAINT "monthly_metrics_unique" UNIQUE("tenant_id", "user_id", "year", "month")
);

CREATE INDEX "idx_monthly_metrics_tenant_user" ON "monthly_performance_metrics"("tenant_id", "user_id");
CREATE INDEX "idx_monthly_metrics_period" ON "monthly_performance_metrics"("year", "month");

-- ============================================================================
-- ACTIVITY TRACKING
-- ============================================================================

-- Activity Events (for 24/7 monitoring)
CREATE TABLE IF NOT EXISTS "activity_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "event_type" VARCHAR(50) NOT NULL,
    "event_subtype" VARCHAR(50),
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "metadata" JSONB DEFAULT '{}',
    "duration_seconds" INTEGER,
    "is_productive" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_activity_events_tenant_user" ON "activity_events"("tenant_id", "user_id");
CREATE INDEX "idx_activity_events_type" ON "activity_events"("event_type");
CREATE INDEX "idx_activity_events_created" ON "activity_events"("created_at");
CREATE INDEX "idx_activity_events_tenant_created" ON "activity_events"("tenant_id", "created_at");

-- Activity event types partition (for time-series efficiency)
-- Note: In production, consider TimescaleDB or partitioning by date

-- ============================================================================
-- ANOMALY DETECTION
-- ============================================================================

-- Performance Anomalies
CREATE TABLE IF NOT EXISTS "performance_anomalies" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "anomaly_type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
    "detected_at" TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Anomaly details
    "metric_name" VARCHAR(100) NOT NULL,
    "expected_value" DECIMAL(10,2),
    "actual_value" DECIMAL(10,2),
    "deviation_percentage" DECIMAL(6,2),
    "z_score" DECIMAL(6,2),

    -- Context
    "detection_window_start" TIMESTAMP,
    "detection_window_end" TIMESTAMP,
    "baseline_period_days" INTEGER,

    -- Status
    "status" VARCHAR(20) DEFAULT 'detected', -- 'detected', 'acknowledged', 'investigating', 'resolved', 'false_positive'
    "acknowledged_by" UUID REFERENCES "users"("id"),
    "acknowledged_at" TIMESTAMP,
    "resolved_at" TIMESTAMP,
    "resolution_notes" TEXT,

    -- Notifications
    "manager_notified" BOOLEAN DEFAULT FALSE,
    "manager_notified_at" TIMESTAMP,

    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_anomalies_tenant_user" ON "performance_anomalies"("tenant_id", "user_id");
CREATE INDEX "idx_anomalies_type" ON "performance_anomalies"("anomaly_type");
CREATE INDEX "idx_anomalies_severity" ON "performance_anomalies"("severity");
CREATE INDEX "idx_anomalies_status" ON "performance_anomalies"("status");
CREATE INDEX "idx_anomalies_detected" ON "performance_anomalies"("detected_at");

-- ============================================================================
-- DEADLINE TRACKING & ALERTS
-- ============================================================================

-- Deadline Alerts
CREATE TABLE IF NOT EXISTS "deadline_alerts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "entity_type" VARCHAR(50) NOT NULL, -- 'goal', 'task', 'review', 'milestone'
    "entity_id" UUID NOT NULL,
    "entity_title" VARCHAR(255) NOT NULL,

    -- Deadline info
    "deadline" TIMESTAMP NOT NULL,
    "days_until_deadline" INTEGER,
    "hours_until_deadline" INTEGER,

    -- Progress & probability
    "current_progress" DECIMAL(5,2),
    "required_daily_progress" DECIMAL(5,2),
    "completion_probability" DECIMAL(5,2), -- AI-computed

    -- Alert status
    "alert_level" VARCHAR(20) NOT NULL, -- 'info', 'warning', 'urgent', 'overdue'
    "is_acknowledged" BOOLEAN DEFAULT FALSE,
    "acknowledged_at" TIMESTAMP,
    "is_snoozed" BOOLEAN DEFAULT FALSE,
    "snoozed_until" TIMESTAMP,

    -- Notifications
    "last_notified_at" TIMESTAMP,
    "notification_count" INTEGER DEFAULT 0,

    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_deadline_alerts_tenant_user" ON "deadline_alerts"("tenant_id", "user_id");
CREATE INDEX "idx_deadline_alerts_deadline" ON "deadline_alerts"("deadline");
CREATE INDEX "idx_deadline_alerts_level" ON "deadline_alerts"("alert_level");
CREATE INDEX "idx_deadline_alerts_entity" ON "deadline_alerts"("entity_type", "entity_id");

-- ============================================================================
-- WORKLOAD DISTRIBUTION
-- ============================================================================

-- Workload Snapshots
CREATE TABLE IF NOT EXISTS "workload_snapshots" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "snapshot_time" TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Current workload
    "active_goals" INTEGER DEFAULT 0,
    "active_tasks" INTEGER DEFAULT 0,
    "pending_reviews" INTEGER DEFAULT 0,
    "scheduled_meetings_today" INTEGER DEFAULT 0,

    -- Capacity metrics
    "estimated_hours_required" DECIMAL(6,2),
    "available_hours" DECIMAL(6,2),
    "capacity_utilization" DECIMAL(5,2), -- percentage

    -- Workload score
    "workload_score" DECIMAL(5,2), -- 0-100, 100 = overloaded
    "balance_status" VARCHAR(20), -- 'underloaded', 'optimal', 'heavy', 'overloaded'

    -- Recommendations
    "redistribution_recommended" BOOLEAN DEFAULT FALSE,
    "recommended_actions" JSONB DEFAULT '[]',

    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_workload_tenant_user" ON "workload_snapshots"("tenant_id", "user_id");
CREATE INDEX "idx_workload_time" ON "workload_snapshots"("snapshot_time");
CREATE INDEX "idx_workload_status" ON "workload_snapshots"("balance_status");

-- Team Workload Distribution
CREATE TABLE IF NOT EXISTS "team_workload_distribution" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "team_id" UUID REFERENCES "teams"("id") ON DELETE CASCADE,
    "department_id" UUID REFERENCES "departments"("id") ON DELETE CASCADE,
    "snapshot_time" TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Team metrics
    "total_members" INTEGER,
    "avg_workload_score" DECIMAL(5,2),
    "workload_variance" DECIMAL(5,2),
    "gini_coefficient" DECIMAL(5,4), -- 0 = perfect equality, 1 = complete inequality

    -- Member distribution
    "overloaded_count" INTEGER DEFAULT 0,
    "optimal_count" INTEGER DEFAULT 0,
    "underloaded_count" INTEGER DEFAULT 0,

    -- Recommendations
    "redistribution_score" DECIMAL(5,2), -- How much redistribution would help
    "suggested_transfers" JSONB DEFAULT '[]',

    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_team_workload_tenant" ON "team_workload_distribution"("tenant_id");
CREATE INDEX "idx_team_workload_team" ON "team_workload_distribution"("team_id");
CREATE INDEX "idx_team_workload_dept" ON "team_workload_distribution"("department_id");
CREATE INDEX "idx_team_workload_time" ON "team_workload_distribution"("snapshot_time");

-- ============================================================================
-- COMMUNICATION SENTIMENT
-- ============================================================================

-- Communication Sentiment Analysis
CREATE TABLE IF NOT EXISTS "communication_sentiment" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "analysis_period_start" TIMESTAMP NOT NULL,
    "analysis_period_end" TIMESTAMP NOT NULL,

    -- Sentiment scores
    "overall_sentiment_score" DECIMAL(5,2), -- -1 to 1
    "positivity_ratio" DECIMAL(5,2), -- 0 to 1
    "collaboration_sentiment" DECIMAL(5,2),
    "stress_indicators" DECIMAL(5,2),

    -- Communication patterns
    "communication_frequency" VARCHAR(20), -- 'low', 'normal', 'high'
    "response_time_trend" VARCHAR(20), -- 'faster', 'stable', 'slower'
    "engagement_level" VARCHAR(20), -- 'disengaged', 'normal', 'highly_engaged'

    -- Aggregated from sources
    "feedback_sentiment" DECIMAL(5,2),
    "review_text_sentiment" DECIMAL(5,2),
    "goal_comment_sentiment" DECIMAL(5,2),

    -- Alerts
    "morale_alert" BOOLEAN DEFAULT FALSE,
    "morale_alert_reason" TEXT,

    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_sentiment_tenant_user" ON "communication_sentiment"("tenant_id", "user_id");
CREATE INDEX "idx_sentiment_period" ON "communication_sentiment"("analysis_period_start");
CREATE INDEX "idx_sentiment_alert" ON "communication_sentiment"("morale_alert") WHERE "morale_alert" = TRUE;

-- Team Morale Snapshots
CREATE TABLE IF NOT EXISTS "team_morale_snapshots" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "team_id" UUID REFERENCES "teams"("id") ON DELETE CASCADE,
    "department_id" UUID REFERENCES "departments"("id") ON DELETE CASCADE,
    "snapshot_time" TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Team sentiment
    "avg_sentiment_score" DECIMAL(5,2),
    "sentiment_variance" DECIMAL(5,2),
    "morale_index" DECIMAL(5,2), -- 0-100

    -- Trend
    "morale_trend" VARCHAR(20), -- 'improving', 'stable', 'declining'
    "trend_change_percentage" DECIMAL(6,2),

    -- Distribution
    "high_morale_count" INTEGER DEFAULT 0,
    "neutral_morale_count" INTEGER DEFAULT 0,
    "low_morale_count" INTEGER DEFAULT 0,

    -- Alerts
    "team_alert" BOOLEAN DEFAULT FALSE,
    "alert_reason" TEXT,

    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_team_morale_tenant" ON "team_morale_snapshots"("tenant_id");
CREATE INDEX "idx_team_morale_team" ON "team_morale_snapshots"("team_id");
CREATE INDEX "idx_team_morale_time" ON "team_morale_snapshots"("snapshot_time");

-- ============================================================================
-- PROJECT MILESTONES
-- ============================================================================

-- Project Milestones (for live tracking)
CREATE TABLE IF NOT EXISTS "project_milestones" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "goal_id" UUID REFERENCES "goals"("id") ON DELETE CASCADE,
    "team_id" UUID REFERENCES "teams"("id") ON DELETE CASCADE,

    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "milestone_type" VARCHAR(50), -- 'checkpoint', 'deliverable', 'phase_completion', 'review_gate'

    -- Timeline
    "planned_date" TIMESTAMP NOT NULL,
    "actual_date" TIMESTAMP,
    "original_planned_date" TIMESTAMP,

    -- Progress
    "status" VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'delayed', 'at_risk'
    "progress_percentage" DECIMAL(5,2) DEFAULT 0,
    "completion_criteria" JSONB DEFAULT '[]',

    -- Dependencies
    "depends_on" UUID[], -- Other milestone IDs
    "blocked_by" UUID[], -- Blocking milestone IDs

    -- Tracking
    "auto_detected" BOOLEAN DEFAULT FALSE, -- AI detected milestone
    "detection_confidence" DECIMAL(5,2),
    "velocity_based_eta" TIMESTAMP,
    "delay_days" INTEGER DEFAULT 0,

    -- Assignments
    "owner_id" UUID REFERENCES "users"("id"),
    "contributors" UUID[],

    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_milestones_tenant" ON "project_milestones"("tenant_id");
CREATE INDEX "idx_milestones_goal" ON "project_milestones"("goal_id");
CREATE INDEX "idx_milestones_team" ON "project_milestones"("team_id");
CREATE INDEX "idx_milestones_status" ON "project_milestones"("status");
CREATE INDEX "idx_milestones_planned" ON "project_milestones"("planned_date");

-- Milestone Progress Events
CREATE TABLE IF NOT EXISTS "milestone_progress_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "milestone_id" UUID NOT NULL REFERENCES "project_milestones"("id") ON DELETE CASCADE,
    "event_type" VARCHAR(50) NOT NULL, -- 'progress_update', 'status_change', 'date_change', 'blocker_added', 'blocker_resolved'
    "previous_value" JSONB,
    "new_value" JSONB,
    "triggered_by" UUID REFERENCES "users"("id"),
    "trigger_source" VARCHAR(50), -- 'manual', 'auto_detection', 'integration', 'scheduler'
    "notes" TEXT,
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_milestone_events_milestone" ON "milestone_progress_events"("milestone_id");
CREATE INDEX "idx_milestone_events_type" ON "milestone_progress_events"("event_type");
CREATE INDEX "idx_milestone_events_created" ON "milestone_progress_events"("created_at");

-- ============================================================================
-- REAL-TIME PERFORMANCE ALERTS
-- ============================================================================

-- Performance Alerts (unified alert system)
CREATE TABLE IF NOT EXISTS "performance_alerts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "target_user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "target_team_id" UUID REFERENCES "teams"("id") ON DELETE CASCADE,
    "target_department_id" UUID REFERENCES "departments"("id") ON DELETE CASCADE,

    "alert_type" VARCHAR(50) NOT NULL,
    "alert_category" VARCHAR(50) NOT NULL, -- 'deadline', 'anomaly', 'workload', 'sentiment', 'milestone', 'performance'
    "severity" VARCHAR(20) NOT NULL, -- 'info', 'warning', 'critical'
    "priority" INTEGER DEFAULT 0,

    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "action_required" TEXT,
    "action_url" VARCHAR(500),

    -- Status
    "status" VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed', 'expired'
    "acknowledged_by" UUID REFERENCES "users"("id"),
    "acknowledged_at" TIMESTAMP,
    "resolved_at" TIMESTAMP,
    "expires_at" TIMESTAMP,

    -- Notifications
    "notify_user" BOOLEAN DEFAULT TRUE,
    "notify_manager" BOOLEAN DEFAULT FALSE,
    "notify_hr" BOOLEAN DEFAULT FALSE,
    "notification_channels" VARCHAR(50)[] DEFAULT ARRAY['in_app'],
    "last_notification_sent" TIMESTAMP,

    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_perf_alerts_tenant" ON "performance_alerts"("tenant_id");
CREATE INDEX "idx_perf_alerts_user" ON "performance_alerts"("target_user_id");
CREATE INDEX "idx_perf_alerts_team" ON "performance_alerts"("target_team_id");
CREATE INDEX "idx_perf_alerts_category" ON "performance_alerts"("alert_category");
CREATE INDEX "idx_perf_alerts_status" ON "performance_alerts"("status");
CREATE INDEX "idx_perf_alerts_severity" ON "performance_alerts"("severity");
CREATE INDEX "idx_perf_alerts_created" ON "performance_alerts"("created_at");

-- ============================================================================
-- KPI DEFINITIONS & TRACKING
-- ============================================================================

-- KPI Definitions
CREATE TABLE IF NOT EXISTS "kpi_definitions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL, -- 'performance', 'engagement', 'quality', 'productivity', 'custom'
    "unit" VARCHAR(50), -- 'percentage', 'count', 'hours', 'score', 'currency'
    "calculation_formula" TEXT,
    "data_sources" JSONB DEFAULT '[]',

    -- Thresholds
    "target_value" DECIMAL(10,2),
    "min_value" DECIMAL(10,2),
    "max_value" DECIMAL(10,2),
    "green_threshold" DECIMAL(10,2), -- On track if >= this
    "yellow_threshold" DECIMAL(10,2), -- At risk if >= this but < green
    -- Below yellow = off track (red)

    -- Tracking settings
    "tracking_frequency" VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly', 'monthly'
    "aggregation_method" VARCHAR(20) DEFAULT 'avg', -- 'sum', 'avg', 'max', 'min', 'last'
    "is_higher_better" BOOLEAN DEFAULT TRUE,

    "is_active" BOOLEAN DEFAULT TRUE,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX "idx_kpi_defs_tenant" ON "kpi_definitions"("tenant_id");
CREATE INDEX "idx_kpi_defs_category" ON "kpi_definitions"("category");

-- KPI Values (time-series)
CREATE TABLE IF NOT EXISTS "kpi_values" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
    "kpi_definition_id" UUID NOT NULL REFERENCES "kpi_definitions"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "team_id" UUID REFERENCES "teams"("id") ON DELETE CASCADE,
    "department_id" UUID REFERENCES "departments"("id") ON DELETE CASCADE,

    "value" DECIMAL(10,2) NOT NULL,
    "target_value" DECIMAL(10,2),
    "previous_value" DECIMAL(10,2),
    "change_percentage" DECIMAL(6,2),

    "status" VARCHAR(20), -- 'on_track', 'at_risk', 'off_track'
    "recorded_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "period_start" TIMESTAMP,
    "period_end" TIMESTAMP,

    "metadata" JSONB DEFAULT '{}'
);

CREATE INDEX "idx_kpi_values_kpi" ON "kpi_values"("kpi_definition_id");
CREATE INDEX "idx_kpi_values_user" ON "kpi_values"("user_id");
CREATE INDEX "idx_kpi_values_team" ON "kpi_values"("team_id");
CREATE INDEX "idx_kpi_values_recorded" ON "kpi_values"("recorded_at");
CREATE INDEX "idx_kpi_values_tenant_kpi_recorded" ON "kpi_values"("tenant_id", "kpi_definition_id", "recorded_at");

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update daily metrics from hourly
CREATE OR REPLACE FUNCTION update_daily_metrics_from_hourly()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "daily_performance_metrics" (
        "tenant_id",
        "user_id",
        "metric_date",
        "total_tasks_completed",
        "total_tasks_created",
        "avg_task_completion_rate",
        "total_active_minutes",
        "total_focus_minutes",
        "total_meeting_minutes",
        "first_activity_at",
        "last_activity_at",
        "total_goal_updates",
        "total_goal_progress_delta",
        "total_interactions",
        "total_feedback_given",
        "total_feedback_received",
        "total_messages_sent",
        "avg_collaboration_score",
        "avg_productivity_score",
        "avg_engagement_score"
    )
    SELECT
        NEW."tenant_id",
        NEW."user_id",
        DATE(NEW."metric_hour"),
        SUM("tasks_completed"),
        SUM("tasks_created"),
        AVG("task_completion_rate"),
        SUM("active_minutes"),
        SUM("focus_minutes"),
        SUM("meeting_minutes"),
        MIN("metric_hour"),
        MAX("metric_hour"),
        SUM("goal_updates"),
        SUM("goal_progress_delta"),
        SUM("interactions_count"),
        SUM("feedback_given"),
        SUM("feedback_received"),
        SUM("messages_sent"),
        AVG("collaboration_score"),
        AVG("productivity_score"),
        AVG("engagement_score")
    FROM "hourly_performance_metrics"
    WHERE "tenant_id" = NEW."tenant_id"
        AND "user_id" = NEW."user_id"
        AND DATE("metric_hour") = DATE(NEW."metric_hour")
    GROUP BY "tenant_id", "user_id", DATE("metric_hour")
    ON CONFLICT ("tenant_id", "user_id", "metric_date")
    DO UPDATE SET
        "total_tasks_completed" = EXCLUDED."total_tasks_completed",
        "total_tasks_created" = EXCLUDED."total_tasks_created",
        "avg_task_completion_rate" = EXCLUDED."avg_task_completion_rate",
        "total_active_minutes" = EXCLUDED."total_active_minutes",
        "total_focus_minutes" = EXCLUDED."total_focus_minutes",
        "total_meeting_minutes" = EXCLUDED."total_meeting_minutes",
        "first_activity_at" = EXCLUDED."first_activity_at",
        "last_activity_at" = EXCLUDED."last_activity_at",
        "total_goal_updates" = EXCLUDED."total_goal_updates",
        "total_goal_progress_delta" = EXCLUDED."total_goal_progress_delta",
        "total_interactions" = EXCLUDED."total_interactions",
        "total_feedback_given" = EXCLUDED."total_feedback_given",
        "total_feedback_received" = EXCLUDED."total_feedback_received",
        "total_messages_sent" = EXCLUDED."total_messages_sent",
        "avg_collaboration_score" = EXCLUDED."avg_collaboration_score",
        "avg_productivity_score" = EXCLUDED."avg_productivity_score",
        "avg_engagement_score" = EXCLUDED."avg_engagement_score",
        "updated_at" = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update daily metrics
CREATE TRIGGER "trigger_update_daily_metrics"
AFTER INSERT OR UPDATE ON "hourly_performance_metrics"
FOR EACH ROW
EXECUTE FUNCTION update_daily_metrics_from_hourly();
