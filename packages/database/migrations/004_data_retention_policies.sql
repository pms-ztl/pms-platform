-- ============================================================================
-- Migration: Data Retention and Archival Policies
-- Description: Implements hot/warm/cold storage strategy and archival procedures
-- ============================================================================

-- ============================================================================
-- DATA RETENTION CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_config (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           VARCHAR(100) NOT NULL,
  hot_storage_days      INTEGER NOT NULL,
  warm_storage_days     INTEGER,
  cold_storage_days     INTEGER,
  archive_after_days    INTEGER,
  delete_after_days     INTEGER,
  compliance_required   BOOLEAN DEFAULT false,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type)
);

-- Insert default retention policies
INSERT INTO data_retention_config (entity_type, hot_storage_days, warm_storage_days, cold_storage_days, archive_after_days, compliance_required, notes) VALUES
  ('PerformanceReview', 365, 1095, 1825, 2555, true, '1 year hot, 3 years warm, 5 years cold, 7 years archive - Legal compliance'),
  ('Feedback', 180, 730, 1460, 2190, false, '6 months hot, 2 years warm, 4 years cold, 6 years archive'),
  ('Goal', 365, 1095, 1825, 2555, false, '1 year hot, 3 years warm, 5 years cold, 7 years archive'),
  ('CompetencyAssessment', 365, 1095, 1825, 2555, true, '1 year hot, 3 years warm, 5 years cold, 7 years archive - Performance records'),
  ('OneOnOne', 180, 365, 730, 1095, false, '6 months hot, 1 year warm, 2 years cold, 3 years archive'),
  ('PromotionRecommendation', 365, 1095, 1825, 2555, true, '1 year hot, 3 years warm, 5 years cold, 7 years archive - HR compliance'),
  ('SuccessionPlan', 730, 1460, 2190, 2920, true, '2 years hot, 4 years warm, 6 years cold, 8 years archive - Strategic planning'),
  ('DevelopmentPlan', 365, 1095, 1825, 2190, false, '1 year hot, 3 years warm, 5 years cold, 6 years archive'),
  ('PerformanceImprovementPlan', 730, 1825, 2555, 3650, true, '2 years hot, 5 years warm, 7 years cold, 10 years archive - Legal compliance'),
  ('EngagementSurvey', 365, 1095, 1825, 2555, false, '1 year hot, 3 years warm, 5 years cold, 7 years archive'),
  ('SurveyResponse', 365, 1095, 1825, 2555, false, '1 year hot, 3 years warm, 5 years cold, 7 years archive'),
  ('AuditLog', 90, 365, 730, 1095, true, '3 months hot, 1 year warm, 2 years cold, 3 years archive - Security compliance'),
  ('Notification', 30, 90, 180, NULL, false, '1 month hot, 3 months warm, 6 months cold, delete after 6 months'),
  ('MLModelPrediction', 180, 365, 730, NULL, false, '6 months hot, 1 year warm, 2 years cold, delete after 2 years'),
  ('OrganizationalHealthMetrics', 365, 1095, 2190, 3650, false, '1 year hot, 3 years warm, 6 years cold, 10 years archive');

-- ============================================================================
-- ARCHIVE STORAGE TABLES
-- ============================================================================

-- Generic archive table structure
CREATE TABLE IF NOT EXISTS archived_data (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type           VARCHAR(100) NOT NULL,
  entity_id             VARCHAR(255) NOT NULL,
  tenant_id             UUID NOT NULL,
  data                  JSONB NOT NULL,
  original_created_at   TIMESTAMPTZ NOT NULL,
  archived_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  archive_reason        VARCHAR(50) DEFAULT 'RETENTION_POLICY',
  retrieval_count       INTEGER DEFAULT 0,
  last_retrieved_at     TIMESTAMPTZ,
  metadata              JSONB,
  UNIQUE(entity_type, entity_id)
);

-- Partition archived_data by entity_type for better query performance
CREATE INDEX IF NOT EXISTS idx_archived_data_entity
  ON archived_data(entity_type, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_archived_data_tenant
  ON archived_data(tenant_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_archived_data_original_created
  ON archived_data(original_created_at);

-- JSONB index for searching archived data
CREATE INDEX IF NOT EXISTS idx_archived_data_json
  ON archived_data USING gin(data);

-- ============================================================================
-- STORAGE TIER MARKING
-- ============================================================================

-- Add storage tier column to main tables (via migration or ALTER TABLE)
-- This would typically be added to the Prisma schema, but shown here for reference

-- ALTER TABLE "PerformanceReview" ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(20) DEFAULT 'HOT';
-- ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(20) DEFAULT 'HOT';
-- ALTER TABLE "Goal" ADD COLUMN IF NOT EXISTS storage_tier VARCHAR(20) DEFAULT 'HOT';
-- ... etc for other tables

-- ============================================================================
-- DATA ARCHIVAL PROCEDURES
-- ============================================================================

-- Function to archive a specific entity
CREATE OR REPLACE FUNCTION archive_entity(
  p_entity_type VARCHAR,
  p_entity_id VARCHAR,
  p_tenant_id UUID,
  p_data JSONB,
  p_original_created_at TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN := false;
BEGIN
  -- Insert into archive table
  INSERT INTO archived_data (
    entity_type,
    entity_id,
    tenant_id,
    data,
    original_created_at,
    archive_reason,
    archived_at
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_tenant_id,
    p_data,
    p_original_created_at,
    'RETENTION_POLICY',
    CURRENT_TIMESTAMP
  )
  ON CONFLICT (entity_type, entity_id)
  DO UPDATE SET
    data = EXCLUDED.data,
    archived_at = CURRENT_TIMESTAMP,
    retrieval_count = 0;

  v_success := true;

  RETURN v_success;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to archive % with id %: %', p_entity_type, p_entity_id, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function to retrieve archived entity
CREATE OR REPLACE FUNCTION retrieve_archived_entity(
  p_entity_type VARCHAR,
  p_entity_id VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_data JSONB;
BEGIN
  -- Retrieve from archive
  SELECT data INTO v_data
  FROM archived_data
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;

  -- Update retrieval stats
  UPDATE archived_data
  SET retrieval_count = retrieval_count + 1,
      last_retrieved_at = CURRENT_TIMESTAMP
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id;

  RETURN v_data;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED ARCHIVAL PROCEDURES
-- ============================================================================

-- Archive old performance reviews
CREATE OR REPLACE FUNCTION archive_old_performance_reviews()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_retention_config RECORD;
  v_review RECORD;
BEGIN
  -- Get retention configuration
  SELECT * INTO v_retention_config
  FROM data_retention_config
  WHERE entity_type = 'PerformanceReview';

  -- Archive reviews older than archive threshold
  FOR v_review IN
    SELECT *
    FROM "PerformanceReview"
    WHERE "createdAt" < CURRENT_TIMESTAMP - (v_retention_config.archive_after_days || ' days')::INTERVAL
      AND "deletedAt" IS NULL
  LOOP
    -- Archive the review
    IF archive_entity(
      'PerformanceReview',
      v_review.id::TEXT,
      v_review."tenantId",
      row_to_json(v_review)::JSONB,
      v_review."createdAt"
    ) THEN
      -- Soft delete from main table
      UPDATE "PerformanceReview"
      SET "deletedAt" = CURRENT_TIMESTAMP
      WHERE id = v_review.id;

      v_archived_count := v_archived_count + 1;
    END IF;
  END LOOP;

  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Archive old feedback
CREATE OR REPLACE FUNCTION archive_old_feedback()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_retention_config RECORD;
  v_feedback RECORD;
BEGIN
  SELECT * INTO v_retention_config
  FROM data_retention_config
  WHERE entity_type = 'Feedback';

  FOR v_feedback IN
    SELECT *
    FROM "Feedback"
    WHERE "createdAt" < CURRENT_TIMESTAMP - (v_retention_config.archive_after_days || ' days')::INTERVAL
      AND "deletedAt" IS NULL
  LOOP
    IF archive_entity(
      'Feedback',
      v_feedback.id::TEXT,
      v_feedback."tenantId",
      row_to_json(v_feedback)::JSONB,
      v_feedback."createdAt"
    ) THEN
      UPDATE "Feedback"
      SET "deletedAt" = CURRENT_TIMESTAMP
      WHERE id = v_feedback.id;

      v_archived_count := v_archived_count + 1;
    END IF;
  END LOOP;

  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Archive old goals
CREATE OR REPLACE FUNCTION archive_old_goals()
RETURNS INTEGER AS $$
DECLARE
  v_archived_count INTEGER := 0;
  v_retention_config RECORD;
  v_goal RECORD;
BEGIN
  SELECT * INTO v_retention_config
  FROM data_retention_config
  WHERE entity_type = 'Goal';

  FOR v_goal IN
    SELECT *
    FROM "Goal"
    WHERE "createdAt" < CURRENT_TIMESTAMP - (v_retention_config.archive_after_days || ' days')::INTERVAL
      AND "deletedAt" IS NULL
      AND "status" IN ('COMPLETED', 'CANCELLED')
  LOOP
    IF archive_entity(
      'Goal',
      v_goal.id::TEXT,
      v_goal."tenantId",
      row_to_json(v_goal)::JSONB,
      v_goal."createdAt"
    ) THEN
      UPDATE "Goal"
      SET "deletedAt" = CURRENT_TIMESTAMP
      WHERE id = v_goal.id;

      v_archived_count := v_archived_count + 1;
    END IF;
  END LOOP;

  RETURN v_archived_count;
END;
$$ LANGUAGE plpgsql;

-- Master archival procedure
CREATE OR REPLACE FUNCTION run_all_archival_procedures()
RETURNS TABLE (
  entity_type VARCHAR,
  archived_count INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT 'PerformanceReview'::VARCHAR, archive_old_performance_reviews();
  RETURN QUERY SELECT 'Feedback'::VARCHAR, archive_old_feedback();
  RETURN QUERY SELECT 'Goal'::VARCHAR, archive_old_goals();
  -- Add more archival procedures as needed
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STORAGE TIER MANAGEMENT
-- ============================================================================

-- Update storage tier based on age
CREATE OR REPLACE FUNCTION update_storage_tiers()
RETURNS TABLE (
  entity_type VARCHAR,
  moved_to_warm INTEGER,
  moved_to_cold INTEGER
) AS $$
DECLARE
  v_entity_type VARCHAR;
  v_config RECORD;
  v_moved_warm INTEGER;
  v_moved_cold INTEGER;
BEGIN
  FOR v_config IN
    SELECT * FROM data_retention_config
    WHERE warm_storage_days IS NOT NULL OR cold_storage_days IS NOT NULL
  LOOP
    v_entity_type := v_config.entity_type;
    v_moved_warm := 0;
    v_moved_cold := 0;

    -- This is a template - actual implementation would update each table
    -- Example for PerformanceReview:
    IF v_entity_type = 'PerformanceReview' THEN
      -- Move to WARM storage
      UPDATE "PerformanceReview"
      SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"storageTier": "WARM"}'::JSONB
      WHERE "createdAt" < CURRENT_TIMESTAMP - (v_config.hot_storage_days || ' days')::INTERVAL
        AND "createdAt" >= CURRENT_TIMESTAMP - (v_config.warm_storage_days || ' days')::INTERVAL
        AND (metadata->>'storageTier' IS NULL OR metadata->>'storageTier' = 'HOT');

      GET DIAGNOSTICS v_moved_warm = ROW_COUNT;

      -- Move to COLD storage
      IF v_config.cold_storage_days IS NOT NULL THEN
        UPDATE "PerformanceReview"
        SET metadata = COALESCE(metadata, '{}'::JSONB) || '{"storageTier": "COLD"}'::JSONB
        WHERE "createdAt" < CURRENT_TIMESTAMP - (v_config.warm_storage_days || ' days')::INTERVAL
          AND "createdAt" >= CURRENT_TIMESTAMP - (v_config.cold_storage_days || ' days')::INTERVAL
          AND metadata->>'storageTier' = 'WARM';

        GET DIAGNOSTICS v_moved_cold = ROW_COUNT;
      END IF;

      entity_type := v_entity_type;
      moved_to_warm := v_moved_warm;
      moved_to_cold := v_moved_cold;
      RETURN NEXT;
    END IF;

    -- Similar logic would be added for other entity types
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA DELETION PROCEDURES (for non-compliance data)
-- ============================================================================

-- Delete old notifications
CREATE OR REPLACE FUNCTION delete_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_retention_config RECORD;
BEGIN
  SELECT * INTO v_retention_config
  FROM data_retention_config
  WHERE entity_type = 'Notification';

  DELETE FROM "Notification"
  WHERE "createdAt" < CURRENT_TIMESTAMP - (COALESCE(v_retention_config.cold_storage_days, 180) || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Delete old ML predictions
CREATE OR REPLACE FUNCTION delete_old_ml_predictions()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_retention_config RECORD;
BEGIN
  SELECT * INTO v_retention_config
  FROM data_retention_config
  WHERE entity_type = 'MLModelPrediction';

  DELETE FROM "MLModelPrediction"
  WHERE "createdAt" < CURRENT_TIMESTAMP - (COALESCE(v_retention_config.cold_storage_days, 730) || ' days')::INTERVAL
    OR "validUntil" < CURRENT_TIMESTAMP - INTERVAL '90 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REPORTING & MONITORING
-- ============================================================================

-- Get storage statistics
CREATE OR REPLACE FUNCTION get_storage_statistics()
RETURNS TABLE (
  entity_type VARCHAR,
  total_records BIGINT,
  hot_storage_count BIGINT,
  warm_storage_count BIGINT,
  cold_storage_count BIGINT,
  archived_count BIGINT,
  avg_age_days NUMERIC,
  oldest_record_days NUMERIC
) AS $$
BEGIN
  -- This would need to be customized per table
  -- Example for PerformanceReview
  RETURN QUERY
  SELECT
    'PerformanceReview'::VARCHAR,
    COUNT(*),
    COUNT(*) FILTER (WHERE metadata->>'storageTier' = 'HOT' OR metadata->>'storageTier' IS NULL),
    COUNT(*) FILTER (WHERE metadata->>'storageTier' = 'WARM'),
    COUNT(*) FILTER (WHERE metadata->>'storageTier' = 'COLD'),
    (SELECT COUNT(*) FROM archived_data WHERE entity_type = 'PerformanceReview'),
    EXTRACT(EPOCH FROM AVG(CURRENT_TIMESTAMP - "createdAt")) / 86400,
    EXTRACT(EPOCH FROM MAX(CURRENT_TIMESTAMP - "createdAt")) / 86400
  FROM "PerformanceReview"
  WHERE "deletedAt" IS NULL;

  -- Add similar queries for other tables
END;
$$ LANGUAGE plpgsql;

-- Get archival candidates
CREATE OR REPLACE FUNCTION get_archival_candidates()
RETURNS TABLE (
  entity_type VARCHAR,
  candidate_count BIGINT,
  oldest_candidate_days NUMERIC,
  estimated_space_gb NUMERIC
) AS $$
BEGIN
  -- Query each table for records eligible for archival
  RETURN QUERY
  SELECT
    'PerformanceReview'::VARCHAR,
    COUNT(*),
    EXTRACT(EPOCH FROM MAX(CURRENT_TIMESTAMP - pr."createdAt")) / 86400,
    pg_total_relation_size('"PerformanceReview"'::regclass)::NUMERIC / (1024^3)
  FROM "PerformanceReview" pr
  CROSS JOIN data_retention_config drc
  WHERE drc.entity_type = 'PerformanceReview'
    AND pr."createdAt" < CURRENT_TIMESTAMP - (drc.archive_after_days || ' days')::INTERVAL
    AND pr."deletedAt" IS NULL;

  -- Add similar queries for other tables
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SCHEDULED JOB HELPERS
-- ============================================================================

-- Function to be called by cron/scheduler daily
CREATE OR REPLACE FUNCTION daily_data_maintenance()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_archival_results RECORD;
  v_tier_updates RECORD;
  v_notifications_deleted INTEGER;
  v_predictions_deleted INTEGER;
  v_audit_cleaned INTEGER;
BEGIN
  v_result := '{}'::JSONB;

  -- Run archival procedures
  v_result := v_result || jsonb_build_object('archival', jsonb_agg(row_to_json(v_archival_results)))
  FROM run_all_archival_procedures() v_archival_results;

  -- Update storage tiers
  v_result := v_result || jsonb_build_object('tier_updates', jsonb_agg(row_to_json(v_tier_updates)))
  FROM update_storage_tiers() v_tier_updates;

  -- Delete old notifications
  v_notifications_deleted := delete_old_notifications();
  v_result := v_result || jsonb_build_object('notifications_deleted', v_notifications_deleted);

  -- Delete old ML predictions
  v_predictions_deleted := delete_old_ml_predictions();
  v_result := v_result || jsonb_build_object('ml_predictions_deleted', v_predictions_deleted);

  -- Clean old audit logs
  v_audit_cleaned := cleanup_old_audit_logs(730); -- 2 years retention
  v_result := v_result || jsonb_build_object('audit_logs_cleaned', v_audit_cleaned);

  -- Create future audit log partitions
  PERFORM create_future_audit_log_partitions();

  v_result := v_result || jsonb_build_object(
    'executed_at', CURRENT_TIMESTAMP,
    'status', 'SUCCESS'
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'executed_at', CURRENT_TIMESTAMP,
      'status', 'ERROR',
      'error_message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE data_retention_config IS 'Configuration for data retention policies per entity type';
COMMENT ON TABLE archived_data IS 'Archive storage for old data moved from hot storage';
COMMENT ON FUNCTION archive_entity IS 'Archives a single entity to cold storage';
COMMENT ON FUNCTION retrieve_archived_entity IS 'Retrieves archived entity data';
COMMENT ON FUNCTION run_all_archival_procedures IS 'Runs all archival procedures and returns counts';
COMMENT ON FUNCTION daily_data_maintenance IS 'Master procedure for daily data maintenance tasks';
COMMENT ON FUNCTION get_storage_statistics IS 'Returns storage tier statistics for monitoring';
COMMENT ON FUNCTION get_archival_candidates IS 'Returns entities eligible for archival';
