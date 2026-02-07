/**
 * Database Schema Architecture
 *
 * Normalized schemas with audit tables, history tracking,
 * soft deletes, and time-series performance tracking.
 *
 * Migration-safe design with backward compatibility.
 */

// ============================================================================
// SCHEMA TYPES
// ============================================================================

export interface ColumnDefinition {
  name: string;
  type: DataType;
  nullable: boolean;
  defaultValue?: unknown;
  primaryKey?: boolean;
  unique?: boolean;
  references?: ForeignKeyReference;
  index?: boolean;
  comment?: string;
}

export interface ForeignKeyReference {
  table: string;
  column: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export enum DataType {
  UUID = 'UUID',
  STRING = 'VARCHAR(255)',
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BIGINT = 'BIGINT',
  DECIMAL = 'DECIMAL(10,2)',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  TIMESTAMP = 'TIMESTAMP WITH TIME ZONE',
  JSONB = 'JSONB',
  ARRAY_STRING = 'VARCHAR(255)[]',
  ARRAY_UUID = 'UUID[]',
}

export interface TableDefinition {
  name: string;
  schema: string;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  comment?: string;
  partitionBy?: PartitionDefinition;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  where?: string; // Partial index condition
  using?: 'BTREE' | 'GIN' | 'GIST' | 'HASH';
}

export interface ConstraintDefinition {
  name: string;
  type: 'CHECK' | 'UNIQUE' | 'EXCLUDE';
  expression: string;
}

export interface PartitionDefinition {
  type: 'RANGE' | 'LIST' | 'HASH';
  columns: string[];
}

// ============================================================================
// BASE COLUMNS - Common to all tables
// ============================================================================

export const baseColumns: ColumnDefinition[] = [
  {
    name: 'id',
    type: DataType.UUID,
    nullable: false,
    primaryKey: true,
    defaultValue: 'gen_random_uuid()',
    comment: 'Primary key',
  },
  {
    name: 'tenant_id',
    type: DataType.UUID,
    nullable: false,
    index: true,
    comment: 'Tenant isolation key',
  },
  {
    name: 'created_at',
    type: DataType.TIMESTAMP,
    nullable: false,
    defaultValue: 'CURRENT_TIMESTAMP',
    comment: 'Record creation timestamp',
  },
  {
    name: 'updated_at',
    type: DataType.TIMESTAMP,
    nullable: false,
    defaultValue: 'CURRENT_TIMESTAMP',
    comment: 'Last modification timestamp',
  },
  {
    name: 'created_by',
    type: DataType.UUID,
    nullable: true,
    comment: 'User who created the record',
  },
  {
    name: 'updated_by',
    type: DataType.UUID,
    nullable: true,
    comment: 'User who last modified the record',
  },
];

// Soft delete columns
export const softDeleteColumns: ColumnDefinition[] = [
  {
    name: 'deleted_at',
    type: DataType.TIMESTAMP,
    nullable: true,
    comment: 'Soft delete timestamp',
  },
  {
    name: 'deleted_by',
    type: DataType.UUID,
    nullable: true,
    comment: 'User who deleted the record',
  },
  {
    name: 'is_deleted',
    type: DataType.BOOLEAN,
    nullable: false,
    defaultValue: false,
    index: true,
    comment: 'Soft delete flag',
  },
];

// Version columns for optimistic locking
export const versionColumns: ColumnDefinition[] = [
  {
    name: 'version',
    type: DataType.INTEGER,
    nullable: false,
    defaultValue: 1,
    comment: 'Optimistic lock version',
  },
];

// ============================================================================
// CORE TABLES
// ============================================================================

export const tenantsTable: TableDefinition = {
  name: 'tenants',
  schema: 'pms',
  columns: [
    {
      name: 'id',
      type: DataType.UUID,
      nullable: false,
      primaryKey: true,
      defaultValue: 'gen_random_uuid()',
    },
    { name: 'name', type: DataType.STRING, nullable: false },
    { name: 'slug', type: DataType.STRING, nullable: false, unique: true },
    { name: 'domain', type: DataType.STRING, nullable: true },
    { name: 'status', type: DataType.STRING, nullable: false, defaultValue: "'ACTIVE'" },
    { name: 'settings', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
    { name: 'subscription_tier', type: DataType.STRING, nullable: false, defaultValue: "'STANDARD'" },
    { name: 'created_at', type: DataType.TIMESTAMP, nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
    { name: 'updated_at', type: DataType.TIMESTAMP, nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_tenants_slug', columns: ['slug'], unique: true },
    { name: 'idx_tenants_domain', columns: ['domain'], unique: false },
    { name: 'idx_tenants_status', columns: ['status'], unique: false },
  ],
  constraints: [
    {
      name: 'chk_tenant_status',
      type: 'CHECK',
      expression: "status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')",
    },
  ],
  comment: 'Multi-tenant organization records',
};

export const employeesTable: TableDefinition = {
  name: 'employees',
  schema: 'pms',
  columns: [
    ...baseColumns,
    ...softDeleteColumns,
    ...versionColumns,
    { name: 'external_id', type: DataType.STRING, nullable: true, comment: 'HRIS system ID' },
    { name: 'email', type: DataType.STRING, nullable: false },
    { name: 'first_name', type: DataType.STRING, nullable: false },
    { name: 'last_name', type: DataType.STRING, nullable: false },
    { name: 'preferred_name', type: DataType.STRING, nullable: true },
    { name: 'job_title', type: DataType.STRING, nullable: true },
    { name: 'level', type: DataType.INTEGER, nullable: true, comment: 'Job level (1-10)' },
    { name: 'department_id', type: DataType.UUID, nullable: true },
    { name: 'manager_id', type: DataType.UUID, nullable: true },
    { name: 'hire_date', type: DataType.DATE, nullable: true },
    { name: 'termination_date', type: DataType.DATE, nullable: true },
    { name: 'status', type: DataType.STRING, nullable: false, defaultValue: "'ACTIVE'" },
    { name: 'timezone', type: DataType.STRING, nullable: true, defaultValue: "'UTC'" },
    { name: 'locale', type: DataType.STRING, nullable: true, defaultValue: "'en-US'" },
    { name: 'avatar_url', type: DataType.TEXT, nullable: true },
    { name: 'metadata', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
  ],
  indexes: [
    { name: 'idx_employees_tenant_email', columns: ['tenant_id', 'email'], unique: true },
    { name: 'idx_employees_external_id', columns: ['tenant_id', 'external_id'], unique: true },
    { name: 'idx_employees_manager', columns: ['manager_id'], unique: false },
    { name: 'idx_employees_department', columns: ['department_id'], unique: false },
    { name: 'idx_employees_status', columns: ['tenant_id', 'status', 'is_deleted'], unique: false },
    { name: 'idx_employees_search', columns: ['tenant_id', 'first_name', 'last_name', 'email'], unique: false },
  ],
  constraints: [
    {
      name: 'chk_employee_status',
      type: 'CHECK',
      expression: "status IN ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE')",
    },
    {
      name: 'chk_employee_level',
      type: 'CHECK',
      expression: 'level IS NULL OR (level >= 1 AND level <= 10)',
    },
  ],
  comment: 'Employee records with organizational structure',
};

export const goalsTable: TableDefinition = {
  name: 'goals',
  schema: 'pms',
  columns: [
    ...baseColumns,
    ...softDeleteColumns,
    ...versionColumns,
    { name: 'owner_id', type: DataType.UUID, nullable: false, references: { table: 'employees', column: 'id', onDelete: 'RESTRICT', onUpdate: 'CASCADE' } },
    { name: 'parent_goal_id', type: DataType.UUID, nullable: true, references: { table: 'goals', column: 'id', onDelete: 'SET NULL', onUpdate: 'CASCADE' } },
    { name: 'title', type: DataType.STRING, nullable: false },
    { name: 'description', type: DataType.TEXT, nullable: true },
    { name: 'type', type: DataType.STRING, nullable: false, defaultValue: "'SMART'" },
    { name: 'status', type: DataType.STRING, nullable: false, defaultValue: "'ACTIVE'" },
    { name: 'progress', type: DataType.DECIMAL, nullable: false, defaultValue: 0 },
    { name: 'weight', type: DataType.DECIMAL, nullable: false, defaultValue: 1.0 },
    { name: 'start_date', type: DataType.DATE, nullable: true },
    { name: 'target_date', type: DataType.DATE, nullable: true },
    { name: 'completed_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'outcome', type: DataType.STRING, nullable: true },
    { name: 'visibility', type: DataType.STRING, nullable: false, defaultValue: "'TEAM'" },
    { name: 'tags', type: DataType.ARRAY_STRING, nullable: false, defaultValue: "'{}'" },
    { name: 'metadata', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
  ],
  indexes: [
    { name: 'idx_goals_owner', columns: ['tenant_id', 'owner_id', 'is_deleted'], unique: false },
    { name: 'idx_goals_parent', columns: ['parent_goal_id'], unique: false },
    { name: 'idx_goals_status', columns: ['tenant_id', 'status', 'is_deleted'], unique: false },
    { name: 'idx_goals_type', columns: ['tenant_id', 'type', 'is_deleted'], unique: false },
    { name: 'idx_goals_target_date', columns: ['tenant_id', 'target_date', 'status'], unique: false },
    { name: 'idx_goals_tags', columns: ['tags'], unique: false, using: 'GIN' },
  ],
  constraints: [
    {
      name: 'chk_goal_type',
      type: 'CHECK',
      expression: "type IN ('OKR', 'SMART', 'KPI', 'PROJECT', 'PERSONAL')",
    },
    {
      name: 'chk_goal_status',
      type: 'CHECK',
      expression: "status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ON_HOLD')",
    },
    {
      name: 'chk_goal_progress',
      type: 'CHECK',
      expression: 'progress >= 0 AND progress <= 100',
    },
    {
      name: 'chk_goal_outcome',
      type: 'CHECK',
      expression: "outcome IS NULL OR outcome IN ('ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED', 'CANCELLED')",
    },
  ],
  comment: 'Goals and objectives tracking',
};

export const reviewCyclesTable: TableDefinition = {
  name: 'review_cycles',
  schema: 'pms',
  columns: [
    ...baseColumns,
    ...softDeleteColumns,
    ...versionColumns,
    { name: 'name', type: DataType.STRING, nullable: false },
    { name: 'description', type: DataType.TEXT, nullable: true },
    { name: 'type', type: DataType.STRING, nullable: false },
    { name: 'status', type: DataType.STRING, nullable: false, defaultValue: "'DRAFT'" },
    { name: 'start_date', type: DataType.DATE, nullable: false },
    { name: 'end_date', type: DataType.DATE, nullable: false },
    { name: 'self_review_deadline', type: DataType.TIMESTAMP, nullable: true },
    { name: 'manager_review_deadline', type: DataType.TIMESTAMP, nullable: true },
    { name: 'calibration_deadline', type: DataType.TIMESTAMP, nullable: true },
    { name: 'sharing_deadline', type: DataType.TIMESTAMP, nullable: true },
    { name: 'template_id', type: DataType.UUID, nullable: true },
    { name: 'config', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
    { name: 'participant_criteria', type: DataType.JSONB, nullable: true },
    { name: 'launched_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'completed_at', type: DataType.TIMESTAMP, nullable: true },
  ],
  indexes: [
    { name: 'idx_review_cycles_tenant_status', columns: ['tenant_id', 'status', 'is_deleted'], unique: false },
    { name: 'idx_review_cycles_dates', columns: ['tenant_id', 'start_date', 'end_date'], unique: false },
    { name: 'idx_review_cycles_type', columns: ['tenant_id', 'type'], unique: false },
  ],
  constraints: [
    {
      name: 'chk_cycle_type',
      type: 'CHECK',
      expression: "type IN ('ANNUAL', 'QUARTERLY', 'MID_YEAR', 'PROJECT', 'PROBATION', 'AD_HOC')",
    },
    {
      name: 'chk_cycle_status',
      type: 'CHECK',
      expression: "status IN ('DRAFT', 'ACTIVE', 'CALIBRATION', 'SHARING', 'COMPLETED', 'CANCELLED')",
    },
    {
      name: 'chk_cycle_dates',
      type: 'CHECK',
      expression: 'end_date > start_date',
    },
  ],
  comment: 'Performance review cycles configuration',
};

export const reviewsTable: TableDefinition = {
  name: 'reviews',
  schema: 'pms',
  columns: [
    ...baseColumns,
    ...softDeleteColumns,
    ...versionColumns,
    { name: 'cycle_id', type: DataType.UUID, nullable: false, references: { table: 'review_cycles', column: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' } },
    { name: 'reviewee_id', type: DataType.UUID, nullable: false, references: { table: 'employees', column: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' } },
    { name: 'reviewer_id', type: DataType.UUID, nullable: false, references: { table: 'employees', column: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' } },
    { name: 'type', type: DataType.STRING, nullable: false },
    { name: 'status', type: DataType.STRING, nullable: false, defaultValue: "'PENDING'" },
    { name: 'rating', type: DataType.DECIMAL, nullable: true },
    { name: 'calibrated_rating', type: DataType.DECIMAL, nullable: true },
    { name: 'content', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
    { name: 'strengths', type: DataType.TEXT, nullable: true },
    { name: 'growth_areas', type: DataType.TEXT, nullable: true },
    { name: 'comments', type: DataType.TEXT, nullable: true },
    { name: 'submitted_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'calibrated_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'shared_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'acknowledged_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'signature', type: DataType.TEXT, nullable: true, comment: 'E-signature hash' },
  ],
  indexes: [
    { name: 'idx_reviews_cycle', columns: ['cycle_id'], unique: false },
    { name: 'idx_reviews_reviewee', columns: ['tenant_id', 'reviewee_id', 'is_deleted'], unique: false },
    { name: 'idx_reviews_reviewer', columns: ['tenant_id', 'reviewer_id', 'is_deleted'], unique: false },
    { name: 'idx_reviews_status', columns: ['tenant_id', 'cycle_id', 'status'], unique: false },
    { name: 'idx_reviews_unique', columns: ['cycle_id', 'reviewee_id', 'reviewer_id', 'type'], unique: true },
  ],
  constraints: [
    {
      name: 'chk_review_type',
      type: 'CHECK',
      expression: "type IN ('SELF', 'MANAGER', 'PEER', 'UPWARD', 'EXTERNAL')",
    },
    {
      name: 'chk_review_status',
      type: 'CHECK',
      expression: "status IN ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'CALIBRATED', 'SHARED', 'ACKNOWLEDGED')",
    },
    {
      name: 'chk_review_rating',
      type: 'CHECK',
      expression: 'rating IS NULL OR (rating >= 1 AND rating <= 5)',
    },
  ],
  comment: 'Individual performance reviews',
};

export const feedbackTable: TableDefinition = {
  name: 'feedback',
  schema: 'pms',
  columns: [
    ...baseColumns,
    ...softDeleteColumns,
    { name: 'from_employee_id', type: DataType.UUID, nullable: true, references: { table: 'employees', column: 'id', onDelete: 'SET NULL', onUpdate: 'CASCADE' } },
    { name: 'to_employee_id', type: DataType.UUID, nullable: false, references: { table: 'employees', column: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' } },
    { name: 'type', type: DataType.STRING, nullable: false },
    { name: 'content', type: DataType.TEXT, nullable: false },
    { name: 'visibility', type: DataType.STRING, nullable: false, defaultValue: "'PRIVATE'" },
    { name: 'is_anonymous', type: DataType.BOOLEAN, nullable: false, defaultValue: false },
    { name: 'skill_tags', type: DataType.ARRAY_STRING, nullable: false, defaultValue: "'{}'" },
    { name: 'value_tags', type: DataType.ARRAY_STRING, nullable: false, defaultValue: "'{}'" },
    { name: 'linked_goal_id', type: DataType.UUID, nullable: true },
    { name: 'linked_review_id', type: DataType.UUID, nullable: true },
    { name: 'sentiment_score', type: DataType.DECIMAL, nullable: true },
    { name: 'metadata', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
  ],
  indexes: [
    { name: 'idx_feedback_to', columns: ['tenant_id', 'to_employee_id', 'is_deleted'], unique: false },
    { name: 'idx_feedback_from', columns: ['tenant_id', 'from_employee_id', 'is_deleted'], unique: false },
    { name: 'idx_feedback_type', columns: ['tenant_id', 'type', 'is_deleted'], unique: false },
    { name: 'idx_feedback_created', columns: ['tenant_id', 'created_at'], unique: false },
    { name: 'idx_feedback_skill_tags', columns: ['skill_tags'], unique: false, using: 'GIN' },
    { name: 'idx_feedback_value_tags', columns: ['value_tags'], unique: false, using: 'GIN' },
  ],
  constraints: [
    {
      name: 'chk_feedback_type',
      type: 'CHECK',
      expression: "type IN ('PRAISE', 'CONSTRUCTIVE', 'REQUEST', 'RECOGNITION', 'COACHING')",
    },
    {
      name: 'chk_feedback_visibility',
      type: 'CHECK',
      expression: "visibility IN ('PRIVATE', 'MANAGER_VISIBLE', 'PUBLIC', 'REVIEW_ONLY')",
    },
  ],
  comment: 'Continuous feedback records',
};

export const calibrationSessionsTable: TableDefinition = {
  name: 'calibration_sessions',
  schema: 'pms',
  columns: [
    ...baseColumns,
    ...softDeleteColumns,
    { name: 'cycle_id', type: DataType.UUID, nullable: false, references: { table: 'review_cycles', column: 'id', onDelete: 'CASCADE', onUpdate: 'CASCADE' } },
    { name: 'name', type: DataType.STRING, nullable: false },
    { name: 'facilitator_id', type: DataType.UUID, nullable: false },
    { name: 'status', type: DataType.STRING, nullable: false, defaultValue: "'SCHEDULED'" },
    { name: 'scheduled_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'started_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'completed_at', type: DataType.TIMESTAMP, nullable: true },
    { name: 'participant_ids', type: DataType.ARRAY_UUID, nullable: false, defaultValue: "'{}'" },
    { name: 'review_scope', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
    { name: 'summary', type: DataType.TEXT, nullable: true },
    { name: 'statistics', type: DataType.JSONB, nullable: true },
  ],
  indexes: [
    { name: 'idx_calibration_cycle', columns: ['cycle_id'], unique: false },
    { name: 'idx_calibration_status', columns: ['tenant_id', 'status'], unique: false },
    { name: 'idx_calibration_scheduled', columns: ['tenant_id', 'scheduled_at'], unique: false },
  ],
  constraints: [
    {
      name: 'chk_calibration_status',
      type: 'CHECK',
      expression: "status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')",
    },
  ],
  comment: 'Calibration session management',
};

// ============================================================================
// AUDIT TABLES
// ============================================================================

export const auditEventsTable: TableDefinition = {
  name: 'audit_events',
  schema: 'pms_audit',
  columns: [
    {
      name: 'id',
      type: DataType.UUID,
      nullable: false,
      primaryKey: true,
      defaultValue: 'gen_random_uuid()',
    },
    { name: 'tenant_id', type: DataType.UUID, nullable: false, index: true },
    { name: 'event_type', type: DataType.STRING, nullable: false },
    { name: 'aggregate_type', type: DataType.STRING, nullable: false },
    { name: 'aggregate_id', type: DataType.UUID, nullable: false },
    { name: 'actor_id', type: DataType.UUID, nullable: true },
    { name: 'actor_type', type: DataType.STRING, nullable: false, defaultValue: "'USER'" },
    { name: 'action', type: DataType.STRING, nullable: false },
    { name: 'old_values', type: DataType.JSONB, nullable: true },
    { name: 'new_values', type: DataType.JSONB, nullable: true },
    { name: 'changes', type: DataType.JSONB, nullable: true },
    { name: 'ip_address', type: DataType.STRING, nullable: true },
    { name: 'user_agent', type: DataType.TEXT, nullable: true },
    { name: 'correlation_id', type: DataType.STRING, nullable: true },
    { name: 'request_id', type: DataType.STRING, nullable: true },
    { name: 'metadata', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
    { name: 'occurred_at', type: DataType.TIMESTAMP, nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_audit_tenant_aggregate', columns: ['tenant_id', 'aggregate_type', 'aggregate_id'], unique: false },
    { name: 'idx_audit_actor', columns: ['tenant_id', 'actor_id', 'occurred_at'], unique: false },
    { name: 'idx_audit_event_type', columns: ['tenant_id', 'event_type', 'occurred_at'], unique: false },
    { name: 'idx_audit_correlation', columns: ['correlation_id'], unique: false },
    { name: 'idx_audit_occurred_at', columns: ['tenant_id', 'occurred_at'], unique: false },
  ],
  constraints: [],
  partitionBy: {
    type: 'RANGE',
    columns: ['occurred_at'],
  },
  comment: 'Immutable audit trail for compliance',
};

// ============================================================================
// HISTORY TABLES - Temporal data
// ============================================================================

export const goalsHistoryTable: TableDefinition = {
  name: 'goals_history',
  schema: 'pms_history',
  columns: [
    { name: 'history_id', type: DataType.UUID, nullable: false, primaryKey: true, defaultValue: 'gen_random_uuid()' },
    { name: 'goal_id', type: DataType.UUID, nullable: false },
    { name: 'tenant_id', type: DataType.UUID, nullable: false },
    { name: 'owner_id', type: DataType.UUID, nullable: false },
    { name: 'title', type: DataType.STRING, nullable: false },
    { name: 'description', type: DataType.TEXT, nullable: true },
    { name: 'type', type: DataType.STRING, nullable: false },
    { name: 'status', type: DataType.STRING, nullable: false },
    { name: 'progress', type: DataType.DECIMAL, nullable: false },
    { name: 'weight', type: DataType.DECIMAL, nullable: false },
    { name: 'target_date', type: DataType.DATE, nullable: true },
    { name: 'metadata', type: DataType.JSONB, nullable: false },
    { name: 'valid_from', type: DataType.TIMESTAMP, nullable: false },
    { name: 'valid_to', type: DataType.TIMESTAMP, nullable: true },
    { name: 'change_type', type: DataType.STRING, nullable: false },
    { name: 'changed_by', type: DataType.UUID, nullable: true },
    { name: 'version', type: DataType.INTEGER, nullable: false },
  ],
  indexes: [
    { name: 'idx_goals_history_goal', columns: ['goal_id', 'valid_from'], unique: false },
    { name: 'idx_goals_history_tenant', columns: ['tenant_id', 'valid_from'], unique: false },
    { name: 'idx_goals_history_valid', columns: ['goal_id', 'valid_from', 'valid_to'], unique: false },
  ],
  constraints: [
    {
      name: 'chk_history_change_type',
      type: 'CHECK',
      expression: "change_type IN ('INSERT', 'UPDATE', 'DELETE')",
    },
  ],
  partitionBy: {
    type: 'RANGE',
    columns: ['valid_from'],
  },
  comment: 'Point-in-time history for goals',
};

export const reviewsHistoryTable: TableDefinition = {
  name: 'reviews_history',
  schema: 'pms_history',
  columns: [
    { name: 'history_id', type: DataType.UUID, nullable: false, primaryKey: true, defaultValue: 'gen_random_uuid()' },
    { name: 'review_id', type: DataType.UUID, nullable: false },
    { name: 'tenant_id', type: DataType.UUID, nullable: false },
    { name: 'cycle_id', type: DataType.UUID, nullable: false },
    { name: 'reviewee_id', type: DataType.UUID, nullable: false },
    { name: 'reviewer_id', type: DataType.UUID, nullable: false },
    { name: 'type', type: DataType.STRING, nullable: false },
    { name: 'status', type: DataType.STRING, nullable: false },
    { name: 'rating', type: DataType.DECIMAL, nullable: true },
    { name: 'calibrated_rating', type: DataType.DECIMAL, nullable: true },
    { name: 'content', type: DataType.JSONB, nullable: false },
    { name: 'valid_from', type: DataType.TIMESTAMP, nullable: false },
    { name: 'valid_to', type: DataType.TIMESTAMP, nullable: true },
    { name: 'change_type', type: DataType.STRING, nullable: false },
    { name: 'changed_by', type: DataType.UUID, nullable: true },
    { name: 'change_reason', type: DataType.TEXT, nullable: true },
    { name: 'version', type: DataType.INTEGER, nullable: false },
  ],
  indexes: [
    { name: 'idx_reviews_history_review', columns: ['review_id', 'valid_from'], unique: false },
    { name: 'idx_reviews_history_cycle', columns: ['cycle_id', 'valid_from'], unique: false },
  ],
  constraints: [],
  partitionBy: {
    type: 'RANGE',
    columns: ['valid_from'],
  },
  comment: 'Point-in-time history for reviews with calibration tracking',
};

// ============================================================================
// TIME-SERIES PERFORMANCE TRACKING
// ============================================================================

export const performanceMetricsTable: TableDefinition = {
  name: 'performance_metrics',
  schema: 'pms_timeseries',
  columns: [
    { name: 'id', type: DataType.UUID, nullable: false, primaryKey: true, defaultValue: 'gen_random_uuid()' },
    { name: 'tenant_id', type: DataType.UUID, nullable: false },
    { name: 'employee_id', type: DataType.UUID, nullable: false },
    { name: 'metric_type', type: DataType.STRING, nullable: false },
    { name: 'metric_name', type: DataType.STRING, nullable: false },
    { name: 'value', type: DataType.DECIMAL, nullable: false },
    { name: 'unit', type: DataType.STRING, nullable: true },
    { name: 'period_start', type: DataType.DATE, nullable: false },
    { name: 'period_end', type: DataType.DATE, nullable: false },
    { name: 'granularity', type: DataType.STRING, nullable: false },
    { name: 'source', type: DataType.STRING, nullable: false },
    { name: 'dimensions', type: DataType.JSONB, nullable: false, defaultValue: "'{}'" },
    { name: 'recorded_at', type: DataType.TIMESTAMP, nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_metrics_employee_period', columns: ['tenant_id', 'employee_id', 'period_start', 'metric_type'], unique: false },
    { name: 'idx_metrics_type', columns: ['tenant_id', 'metric_type', 'period_start'], unique: false },
    { name: 'idx_metrics_recorded', columns: ['tenant_id', 'recorded_at'], unique: false },
  ],
  constraints: [
    {
      name: 'chk_metric_type',
      type: 'CHECK',
      expression: "metric_type IN ('GOAL_PROGRESS', 'REVIEW_SCORE', 'FEEDBACK_COUNT', 'ENGAGEMENT', 'SKILL_LEVEL', 'CALIBRATION', 'BIAS_SCORE')",
    },
    {
      name: 'chk_metric_granularity',
      type: 'CHECK',
      expression: "granularity IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL')",
    },
  ],
  partitionBy: {
    type: 'RANGE',
    columns: ['period_start'],
  },
  comment: 'Time-series performance metrics for trend analysis',
};

export const goalProgressSnapshotsTable: TableDefinition = {
  name: 'goal_progress_snapshots',
  schema: 'pms_timeseries',
  columns: [
    { name: 'id', type: DataType.UUID, nullable: false, primaryKey: true, defaultValue: 'gen_random_uuid()' },
    { name: 'tenant_id', type: DataType.UUID, nullable: false },
    { name: 'goal_id', type: DataType.UUID, nullable: false },
    { name: 'progress', type: DataType.DECIMAL, nullable: false },
    { name: 'status', type: DataType.STRING, nullable: false },
    { name: 'snapshot_date', type: DataType.DATE, nullable: false },
    { name: 'notes', type: DataType.TEXT, nullable: true },
    { name: 'source', type: DataType.STRING, nullable: false, defaultValue: "'SYSTEM'" },
    { name: 'recorded_at', type: DataType.TIMESTAMP, nullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
  ],
  indexes: [
    { name: 'idx_goal_snapshots_goal', columns: ['goal_id', 'snapshot_date'], unique: true },
    { name: 'idx_goal_snapshots_date', columns: ['tenant_id', 'snapshot_date'], unique: false },
  ],
  constraints: [],
  partitionBy: {
    type: 'RANGE',
    columns: ['snapshot_date'],
  },
  comment: 'Daily goal progress snapshots for trend visualization',
};

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

export function generateCreateTableSQL(table: TableDefinition): string {
  const columnDefs = table.columns.map(col => {
    let def = `  "${col.name}" ${col.type}`;
    if (!col.nullable) def += ' NOT NULL';
    if (col.defaultValue !== undefined) def += ` DEFAULT ${col.defaultValue}`;
    if (col.primaryKey) def += ' PRIMARY KEY';
    if (col.unique) def += ' UNIQUE';
    return def;
  });

  const constraints = table.constraints.map(c =>
    `  CONSTRAINT ${c.name} ${c.type} (${c.expression})`
  );

  const allDefs = [...columnDefs, ...constraints];

  let sql = `-- ${table.comment || table.name}\n`;
  sql += `CREATE TABLE IF NOT EXISTS ${table.schema}.${table.name} (\n`;
  sql += allDefs.join(',\n');
  sql += '\n)';

  if (table.partitionBy) {
    sql += ` PARTITION BY ${table.partitionBy.type} (${table.partitionBy.columns.join(', ')})`;
  }

  sql += ';\n\n';

  // Add indexes
  for (const idx of table.indexes) {
    sql += `CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${idx.name}\n`;
    sql += `  ON ${table.schema}.${table.name}`;
    if (idx.using) sql += ` USING ${idx.using}`;
    sql += ` (${idx.columns.join(', ')})`;
    if (idx.where) sql += ` WHERE ${idx.where}`;
    sql += ';\n';
  }

  return sql;
}

export function generateMigrationScript(tables: TableDefinition[]): string {
  let sql = '-- PMS Database Migration\n';
  sql += '-- Generated at: ' + new Date().toISOString() + '\n\n';

  // Create schemas
  const schemas = [...new Set(tables.map(t => t.schema))];
  for (const schema of schemas) {
    sql += `CREATE SCHEMA IF NOT EXISTS ${schema};\n`;
  }
  sql += '\n';

  // Create tables
  for (const table of tables) {
    sql += generateCreateTableSQL(table);
    sql += '\n';
  }

  return sql;
}

// Export all table definitions
export const allTables: TableDefinition[] = [
  tenantsTable,
  employeesTable,
  goalsTable,
  reviewCyclesTable,
  reviewsTable,
  feedbackTable,
  calibrationSessionsTable,
  auditEventsTable,
  goalsHistoryTable,
  reviewsHistoryTable,
  performanceMetricsTable,
  goalProgressSnapshotsTable,
];
