-- ============================================================================
-- Migration: Audit Logging System
-- Description: Creates triggers and functions for comprehensive audit trail
-- ============================================================================

-- ============================================================================
-- AUDIT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  v_old_data JSONB;
  v_new_data JSONB;
  v_changes JSONB;
  v_action VARCHAR(20);
  v_user_id UUID;
BEGIN
  -- Determine action type
  IF (TG_OP = 'DELETE') THEN
    v_action := 'DELETE';
    v_old_data := row_to_json(OLD)::JSONB;
    v_new_data := NULL;
    v_changes := v_old_data;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_action := 'UPDATE';
    v_old_data := row_to_json(OLD)::JSONB;
    v_new_data := row_to_json(NEW)::JSONB;

    -- Calculate actual changes
    SELECT jsonb_object_agg(
      key,
      jsonb_build_object(
        'old', v_old_data->key,
        'new', v_new_data->key
      )
    ) INTO v_changes
    FROM jsonb_each(v_new_data)
    WHERE v_old_data->key IS DISTINCT FROM v_new_data->key
      AND key NOT IN ('updatedAt', 'version'); -- Exclude timestamp fields

  ELSIF (TG_OP = 'INSERT') THEN
    v_action := 'INSERT';
    v_old_data := NULL;
    v_new_data := row_to_json(NEW)::JSONB;
    v_changes := v_new_data;
  END IF;

  -- Try to get current user from session variables
  BEGIN
    v_user_id := current_setting('app.current_user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  -- Insert audit log record
  INSERT INTO "AuditLog" (
    "tenantId",
    "userId",
    "action",
    "entityType",
    "entityId",
    "changes",
    "metadata",
    "ipAddress",
    "userAgent",
    "createdAt"
  ) VALUES (
    COALESCE(
      NEW."tenantId",
      OLD."tenantId"
    ),
    v_user_id,
    v_action,
    TG_TABLE_NAME,
    COALESCE(
      (NEW."id")::TEXT,
      (OLD."id")::TEXT
    ),
    v_changes,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA
    ),
    current_setting('app.client_ip', true),
    current_setting('app.user_agent', true),
    CURRENT_TIMESTAMP
  );

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SENSITIVE DATA ACCESS LOGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION log_sensitive_data_access(
  p_tenant_id UUID,
  p_user_id UUID,
  p_entity_type VARCHAR,
  p_entity_id VARCHAR,
  p_action VARCHAR,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO "AuditLog" (
    "tenantId",
    "userId",
    "action",
    "entityType",
    "entityId",
    "changes",
    "metadata",
    "createdAt"
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_action,
    p_entity_type,
    p_entity_id,
    NULL,
    p_metadata || jsonb_build_object(
      'sensitiveDataAccess', true,
      'timestamp', CURRENT_TIMESTAMP
    ),
    CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- APPLY AUDIT TRIGGERS TO SENSITIVE TABLES
-- ============================================================================

-- User table
DROP TRIGGER IF EXISTS audit_user_changes ON "User";
CREATE TRIGGER audit_user_changes
  AFTER INSERT OR UPDATE OR DELETE ON "User"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Performance Review table
DROP TRIGGER IF EXISTS audit_performance_review_changes ON "PerformanceReview";
CREATE TRIGGER audit_performance_review_changes
  AFTER INSERT OR UPDATE OR DELETE ON "PerformanceReview"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Feedback table
DROP TRIGGER IF EXISTS audit_feedback_changes ON "Feedback";
CREATE TRIGGER audit_feedback_changes
  AFTER INSERT OR UPDATE OR DELETE ON "Feedback"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Goal table
DROP TRIGGER IF EXISTS audit_goal_changes ON "Goal";
CREATE TRIGGER audit_goal_changes
  AFTER INSERT OR UPDATE OR DELETE ON "Goal"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Competency Assessment table
DROP TRIGGER IF EXISTS audit_competency_assessment_changes ON "CompetencyAssessment";
CREATE TRIGGER audit_competency_assessment_changes
  AFTER INSERT OR UPDATE OR DELETE ON "CompetencyAssessment"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Promotion Recommendation table
DROP TRIGGER IF EXISTS audit_promotion_recommendation_changes ON "PromotionRecommendation";
CREATE TRIGGER audit_promotion_recommendation_changes
  AFTER INSERT OR UPDATE OR DELETE ON "PromotionRecommendation"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Succession Plan table
DROP TRIGGER IF EXISTS audit_succession_plan_changes ON "SuccessionPlan";
CREATE TRIGGER audit_succession_plan_changes
  AFTER INSERT OR UPDATE OR DELETE ON "SuccessionPlan"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Development Plan table
DROP TRIGGER IF EXISTS audit_development_plan_changes ON "DevelopmentPlan";
CREATE TRIGGER audit_development_plan_changes
  AFTER INSERT OR UPDATE OR DELETE ON "DevelopmentPlan"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- PIP table
DROP TRIGGER IF EXISTS audit_pip_changes ON "PerformanceImprovementPlan";
CREATE TRIGGER audit_pip_changes
  AFTER INSERT OR UPDATE OR DELETE ON "PerformanceImprovementPlan"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Survey Response table
DROP TRIGGER IF EXISTS audit_survey_response_changes ON "SurveyResponse";
CREATE TRIGGER audit_survey_response_changes
  AFTER INSERT OR UPDATE OR DELETE ON "SurveyResponse"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Access Policy table
DROP TRIGGER IF EXISTS audit_access_policy_changes ON "AccessPolicy";
CREATE TRIGGER audit_access_policy_changes
  AFTER INSERT OR UPDATE OR DELETE ON "AccessPolicy"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- Role table
DROP TRIGGER IF EXISTS audit_role_changes ON "Role";
CREATE TRIGGER audit_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON "Role"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- UserRole table
DROP TRIGGER IF EXISTS audit_user_role_changes ON "UserRole";
CREATE TRIGGER audit_user_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON "UserRole"
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- AUDIT LOG PARTITIONING (for performance with large datasets)
-- ============================================================================

-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_audit_log_partition(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_partition_name TEXT;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_partition_name := 'AuditLog_' || p_year || '_' || LPAD(p_month::TEXT, 2, '0');
  v_start_date := make_date(p_year, p_month, 1);
  v_end_date := v_start_date + INTERVAL '1 month';

  -- Create partition if it doesn't exist
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF "AuditLog"
     FOR VALUES FROM (%L) TO (%L)',
    v_partition_name,
    v_start_date,
    v_end_date
  );

  -- Create indexes on partition
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I ("userId", "createdAt" DESC)',
    v_partition_name || '_user_idx',
    v_partition_name
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I ("entityType", "entityId", "createdAt" DESC)',
    v_partition_name || '_entity_idx',
    v_partition_name
  );

  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS %I ON %I USING gin("changes")',
    v_partition_name || '_changes_idx',
    v_partition_name
  );

EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE 'Partition % already exists', v_partition_name;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create partitions for next 3 months
CREATE OR REPLACE FUNCTION create_future_audit_log_partitions()
RETURNS VOID AS $$
DECLARE
  v_current_date DATE := CURRENT_DATE;
  v_month INTEGER;
  v_year INTEGER;
  i INTEGER;
BEGIN
  FOR i IN 0..2 LOOP
    v_month := EXTRACT(MONTH FROM v_current_date + (i || ' months')::INTERVAL);
    v_year := EXTRACT(YEAR FROM v_current_date + (i || ' months')::INTERVAL);
    PERFORM create_audit_log_partition(v_year, v_month);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUDIT LOG CLEANUP PROCEDURE
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  p_retention_days INTEGER DEFAULT 730 -- 2 years default
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := CURRENT_TIMESTAMP - (p_retention_days || ' days')::INTERVAL;

  -- Archive to cold storage before deleting (in production, this would copy to S3/archive)
  -- For now, we'll just delete

  DELETE FROM "AuditLog"
  WHERE "createdAt" < v_cutoff_date
    AND "action" NOT IN ('DELETE', 'PERMISSION_CHANGE', 'ROLE_CHANGE'); -- Keep critical events longer

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUDIT QUERY HELPERS
-- ============================================================================

-- Get user activity history
CREATE OR REPLACE FUNCTION get_user_audit_history(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  created_at TIMESTAMPTZ,
  action VARCHAR,
  entity_type VARCHAR,
  entity_id VARCHAR,
  changes JSONB,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al."createdAt",
    al."action",
    al."entityType",
    al."entityId",
    al."changes",
    al."metadata"
  FROM "AuditLog" al
  WHERE al."userId" = p_user_id
    AND al."createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
  ORDER BY al."createdAt" DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get entity change history
CREATE OR REPLACE FUNCTION get_entity_audit_history(
  p_entity_type VARCHAR,
  p_entity_id VARCHAR,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  created_at TIMESTAMPTZ,
  action VARCHAR,
  user_id UUID,
  changes JSONB,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al."createdAt",
    al."action",
    al."userId",
    al."changes",
    al."metadata"
  FROM "AuditLog" al
  WHERE al."entityType" = p_entity_type
    AND al."entityId" = p_entity_id
  ORDER BY al."createdAt" DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Get tenant security events
CREATE OR REPLACE FUNCTION get_tenant_security_events(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 7,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  created_at TIMESTAMPTZ,
  action VARCHAR,
  user_id UUID,
  entity_type VARCHAR,
  entity_id VARCHAR,
  ip_address VARCHAR,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al."createdAt",
    al."action",
    al."userId",
    al."entityType",
    al."entityId",
    al."ipAddress",
    al."metadata"
  FROM "AuditLog" al
  WHERE al."tenantId" = p_tenant_id
    AND al."createdAt" >= CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
    AND al."action" IN (
      'LOGIN', 'LOGOUT', 'FAILED_LOGIN',
      'PERMISSION_DENIED', 'ACCESS_GRANTED',
      'ROLE_CHANGE', 'PERMISSION_CHANGE',
      'PASSWORD_CHANGE', 'MFA_ENABLED', 'MFA_DISABLED'
    )
  ORDER BY al."createdAt" DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Detect suspicious activity patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity(
  p_tenant_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  user_id UUID,
  event_type VARCHAR,
  event_count BIGINT,
  severity VARCHAR,
  details JSONB
) AS $$
BEGIN
  -- Multiple failed logins
  RETURN QUERY
  SELECT
    al."userId",
    'MULTIPLE_FAILED_LOGINS'::VARCHAR,
    COUNT(*),
    'HIGH'::VARCHAR,
    jsonb_build_object(
      'count', COUNT(*),
      'timeframe_hours', p_hours,
      'first_attempt', MIN(al."createdAt"),
      'last_attempt', MAX(al."createdAt")
    )
  FROM "AuditLog" al
  WHERE al."tenantId" = p_tenant_id
    AND al."action" = 'FAILED_LOGIN'
    AND al."createdAt" >= CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
  GROUP BY al."userId"
  HAVING COUNT(*) >= 5;

  -- Excessive data access
  RETURN QUERY
  SELECT
    al."userId",
    'EXCESSIVE_DATA_ACCESS'::VARCHAR,
    COUNT(*),
    'MEDIUM'::VARCHAR,
    jsonb_build_object(
      'count', COUNT(*),
      'timeframe_hours', p_hours,
      'entity_types', jsonb_agg(DISTINCT al."entityType")
    )
  FROM "AuditLog" al
  WHERE al."tenantId" = p_tenant_id
    AND al."metadata"->>'sensitiveDataAccess' = 'true'
    AND al."createdAt" >= CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
  GROUP BY al."userId"
  HAVING COUNT(*) >= 100;

  -- Permission escalation attempts
  RETURN QUERY
  SELECT
    al."userId",
    'PERMISSION_ESCALATION'::VARCHAR,
    COUNT(*),
    'CRITICAL'::VARCHAR,
    jsonb_build_object(
      'count', COUNT(*),
      'timeframe_hours', p_hours,
      'attempts', jsonb_agg(
        jsonb_build_object(
          'timestamp', al."createdAt",
          'entity', al."entityType"
        )
      )
    )
  FROM "AuditLog" al
  WHERE al."tenantId" = p_tenant_id
    AND al."action" IN ('PERMISSION_DENIED', 'ROLE_CHANGE')
    AND al."createdAt" >= CURRENT_TIMESTAMP - (p_hours || ' hours')::INTERVAL
  GROUP BY al."userId"
  HAVING COUNT(*) >= 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION audit_trigger_func() IS 'Generic audit trigger function that logs all changes';
COMMENT ON FUNCTION log_sensitive_data_access IS 'Logs access to sensitive data for compliance';
COMMENT ON FUNCTION create_audit_log_partition IS 'Creates monthly partition for audit logs';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Archives and deletes old audit logs based on retention policy';
COMMENT ON FUNCTION get_user_audit_history IS 'Retrieves audit history for a specific user';
COMMENT ON FUNCTION get_entity_audit_history IS 'Retrieves change history for a specific entity';
COMMENT ON FUNCTION get_tenant_security_events IS 'Retrieves security-related events for a tenant';
COMMENT ON FUNCTION detect_suspicious_activity IS 'Detects suspicious activity patterns for security monitoring';

-- ============================================================================
-- INITIALIZE PARTITIONS
-- ============================================================================

-- Create partitions for current and next 2 months
SELECT create_future_audit_log_partitions();
