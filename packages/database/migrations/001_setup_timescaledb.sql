-- ============================================================================
-- Migration: Setup TimescaleDB Extension and Hypertables
-- Description: Enables TimescaleDB for time-series data tracking
-- ============================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================================
-- PERFORMANCE METRICS TIME-SERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_metrics_ts (
  time                TIMESTAMPTZ NOT NULL,
  tenant_id           UUID NOT NULL,
  user_id             UUID NOT NULL,
  metric_type         VARCHAR(50) NOT NULL,
  metric_value        DECIMAL(15, 4) NOT NULL,
  dimension           VARCHAR(50),
  metadata            JSONB,
  PRIMARY KEY (time, tenant_id, user_id, metric_type)
);

-- Convert to hypertable
SELECT create_hypertable(
  'performance_metrics_ts',
  'time',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '1 month'
);

-- Add retention policy (2 years)
SELECT add_retention_policy(
  'performance_metrics_ts',
  INTERVAL '2 years',
  if_not_exists => TRUE
);

-- Create continuous aggregate for daily metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_metrics_daily
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 day', time) AS day,
  tenant_id,
  user_id,
  metric_type,
  AVG(metric_value) AS avg_value,
  MAX(metric_value) AS max_value,
  MIN(metric_value) AS min_value,
  COUNT(*) AS data_points
FROM performance_metrics_ts
GROUP BY day, tenant_id, user_id, metric_type;

-- Add refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy(
  'performance_metrics_daily',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- Create continuous aggregate for monthly metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_metrics_monthly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 month', time) AS month,
  tenant_id,
  user_id,
  metric_type,
  AVG(metric_value) AS avg_value,
  MAX(metric_value) AS max_value,
  MIN(metric_value) AS min_value,
  COUNT(*) AS data_points
FROM performance_metrics_ts
GROUP BY month, tenant_id, user_id, metric_type;

-- Add refresh policy for monthly aggregate
SELECT add_continuous_aggregate_policy(
  'performance_metrics_monthly',
  start_offset => INTERVAL '30 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ============================================================================
-- ENGAGEMENT METRICS TIME-SERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS engagement_metrics_ts (
  time                TIMESTAMPTZ NOT NULL,
  tenant_id           UUID NOT NULL,
  user_id             UUID NOT NULL,
  engagement_type     VARCHAR(50) NOT NULL,
  score               DECIMAL(5, 2) NOT NULL,
  sentiment           VARCHAR(20),
  metadata            JSONB,
  PRIMARY KEY (time, tenant_id, user_id, engagement_type)
);

-- Convert to hypertable
SELECT create_hypertable(
  'engagement_metrics_ts',
  'time',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '1 month'
);

-- Add retention policy (3 years)
SELECT add_retention_policy(
  'engagement_metrics_ts',
  INTERVAL '3 years',
  if_not_exists => TRUE
);

-- Create continuous aggregate for weekly engagement
CREATE MATERIALIZED VIEW IF NOT EXISTS engagement_metrics_weekly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 week', time) AS week,
  tenant_id,
  user_id,
  engagement_type,
  AVG(score) AS avg_score,
  COUNT(*) AS measurement_count,
  MODE() WITHIN GROUP (ORDER BY sentiment) AS dominant_sentiment
FROM engagement_metrics_ts
GROUP BY week, tenant_id, user_id, engagement_type;

SELECT add_continuous_aggregate_policy(
  'engagement_metrics_weekly',
  start_offset => INTERVAL '2 weeks',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour',
  if_not_exists => TRUE
);

-- ============================================================================
-- GOAL PROGRESS TIME-SERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS goal_progress_ts (
  time                TIMESTAMPTZ NOT NULL,
  tenant_id           UUID NOT NULL,
  goal_id             UUID NOT NULL,
  progress_percentage DECIMAL(5, 2) NOT NULL,
  status              VARCHAR(20),
  updated_by          UUID,
  notes               TEXT,
  PRIMARY KEY (time, tenant_id, goal_id)
);

-- Convert to hypertable
SELECT create_hypertable(
  'goal_progress_ts',
  'time',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '3 months'
);

-- Add retention policy (5 years for compliance)
SELECT add_retention_policy(
  'goal_progress_ts',
  INTERVAL '5 years',
  if_not_exists => TRUE
);

-- ============================================================================
-- FEEDBACK ACTIVITY TIME-SERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS feedback_activity_ts (
  time                TIMESTAMPTZ NOT NULL,
  tenant_id           UUID NOT NULL,
  giver_id            UUID NOT NULL,
  receiver_id         UUID NOT NULL,
  feedback_type       VARCHAR(50) NOT NULL,
  sentiment           VARCHAR(20),
  rating              INTEGER,
  PRIMARY KEY (time, tenant_id, giver_id, receiver_id, feedback_type)
);

-- Convert to hypertable
SELECT create_hypertable(
  'feedback_activity_ts',
  'time',
  if_not_exists => TRUE,
  chunk_time_interval => INTERVAL '3 months'
);

-- Add retention policy (3 years)
SELECT add_retention_policy(
  'feedback_activity_ts',
  INTERVAL '3 years',
  if_not_exists => TRUE
);

-- Create continuous aggregate for monthly feedback trends
CREATE MATERIALIZED VIEW IF NOT EXISTS feedback_trends_monthly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 month', time) AS month,
  tenant_id,
  feedback_type,
  sentiment,
  COUNT(*) AS feedback_count,
  AVG(rating) AS avg_rating
FROM feedback_activity_ts
GROUP BY month, tenant_id, feedback_type, sentiment;

SELECT add_continuous_aggregate_policy(
  'feedback_trends_monthly',
  start_offset => INTERVAL '60 days',
  end_offset => INTERVAL '1 day',
  schedule_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- ============================================================================
-- INDEXES FOR TIME-SERIES TABLES
-- ============================================================================

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_perf_metrics_user_time
  ON performance_metrics_ts (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_perf_metrics_tenant_type
  ON performance_metrics_ts (tenant_id, metric_type, time DESC);

-- Engagement metrics indexes
CREATE INDEX IF NOT EXISTS idx_engagement_user_time
  ON engagement_metrics_ts (user_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_tenant_type
  ON engagement_metrics_ts (tenant_id, engagement_type, time DESC);

-- Goal progress indexes
CREATE INDEX IF NOT EXISTS idx_goal_progress_goal_time
  ON goal_progress_ts (goal_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_goal_progress_tenant_time
  ON goal_progress_ts (tenant_id, time DESC);

-- Feedback activity indexes
CREATE INDEX IF NOT EXISTS idx_feedback_receiver_time
  ON feedback_activity_ts (receiver_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_giver_time
  ON feedback_activity_ts (giver_id, time DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_tenant_time
  ON feedback_activity_ts (tenant_id, time DESC);

-- ============================================================================
-- COMPRESSION POLICIES
-- ============================================================================

-- Enable compression for older data (compress data older than 6 months)
ALTER TABLE performance_metrics_ts SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id, user_id, metric_type'
);

SELECT add_compression_policy(
  'performance_metrics_ts',
  INTERVAL '6 months',
  if_not_exists => TRUE
);

ALTER TABLE engagement_metrics_ts SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id, user_id, engagement_type'
);

SELECT add_compression_policy(
  'engagement_metrics_ts',
  INTERVAL '6 months',
  if_not_exists => TRUE
);

ALTER TABLE goal_progress_ts SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id, goal_id'
);

SELECT add_compression_policy(
  'goal_progress_ts',
  INTERVAL '12 months',
  if_not_exists => TRUE
);

ALTER TABLE feedback_activity_ts SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'tenant_id, feedback_type'
);

SELECT add_compression_policy(
  'feedback_activity_ts',
  INTERVAL '6 months',
  if_not_exists => TRUE
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get recent performance metrics
CREATE OR REPLACE FUNCTION get_recent_performance_metrics(
  p_tenant_id UUID,
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  time TIMESTAMPTZ,
  metric_type VARCHAR,
  metric_value DECIMAL,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.time,
    pm.metric_type,
    pm.metric_value,
    pm.metadata
  FROM performance_metrics_ts pm
  WHERE pm.tenant_id = p_tenant_id
    AND pm.user_id = p_user_id
    AND pm.time >= NOW() - (p_days || ' days')::INTERVAL
  ORDER BY pm.time DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate engagement trend
CREATE OR REPLACE FUNCTION calculate_engagement_trend(
  p_tenant_id UUID,
  p_user_id UUID,
  p_period VARCHAR DEFAULT 'month'
)
RETURNS TABLE (
  period TIMESTAMPTZ,
  avg_score DECIMAL,
  trend VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  WITH engagement_data AS (
    SELECT
      time_bucket(('1 ' || p_period)::INTERVAL, time) AS bucket,
      AVG(score) AS avg_score,
      LAG(AVG(score)) OVER (ORDER BY time_bucket(('1 ' || p_period)::INTERVAL, time)) AS prev_score
    FROM engagement_metrics_ts
    WHERE tenant_id = p_tenant_id
      AND user_id = p_user_id
      AND time >= NOW() - INTERVAL '12 months'
    GROUP BY bucket
  )
  SELECT
    bucket AS period,
    avg_score,
    CASE
      WHEN prev_score IS NULL THEN 'NO_DATA'
      WHEN avg_score > prev_score THEN 'UP'
      WHEN avg_score < prev_score THEN 'DOWN'
      ELSE 'STABLE'
    END AS trend
  FROM engagement_data
  ORDER BY bucket DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON EXTENSION timescaledb IS 'TimescaleDB extension for time-series data';
COMMENT ON TABLE performance_metrics_ts IS 'Time-series table for performance metrics tracking';
COMMENT ON TABLE engagement_metrics_ts IS 'Time-series table for engagement metrics tracking';
COMMENT ON TABLE goal_progress_ts IS 'Time-series table for goal progress tracking';
COMMENT ON TABLE feedback_activity_ts IS 'Time-series table for feedback activity tracking';
