// System-wide constants

// Review rating scale
export const RATING_SCALE = {
  MIN: 1,
  MAX: 5,
  LABELS: {
    1: 'Does Not Meet Expectations',
    2: 'Partially Meets Expectations',
    3: 'Meets Expectations',
    4: 'Exceeds Expectations',
    5: 'Significantly Exceeds Expectations',
  },
} as const;

// Goal types
export const GOAL_TYPES = {
  INDIVIDUAL: 'INDIVIDUAL',
  TEAM: 'TEAM',
  DEPARTMENT: 'DEPARTMENT',
  COMPANY: 'COMPANY',
  OKR_OBJECTIVE: 'OKR_OBJECTIVE',
  OKR_KEY_RESULT: 'OKR_KEY_RESULT',
} as const;

// Goal statuses
export const GOAL_STATUSES = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD',
} as const;

// Review cycle types
export const REVIEW_CYCLE_TYPES = {
  ANNUAL: 'ANNUAL',
  SEMI_ANNUAL: 'SEMI_ANNUAL',
  QUARTERLY: 'QUARTERLY',
  PROBATION: 'PROBATION',
  PROJECT: 'PROJECT',
  AD_HOC: 'AD_HOC',
} as const;

// Feedback types
export const FEEDBACK_TYPES = {
  PRAISE: 'PRAISE',
  CONSTRUCTIVE: 'CONSTRUCTIVE',
  SUGGESTION: 'SUGGESTION',
  REQUEST: 'REQUEST',
  RECOGNITION: 'RECOGNITION',
} as const;

// Feedback visibility levels
export const FEEDBACK_VISIBILITY = {
  PRIVATE: 'PRIVATE',
  MANAGER_VISIBLE: 'MANAGER_VISIBLE',
  PUBLIC: 'PUBLIC',
} as const;

// System roles
export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_ADMIN: 'Tenant Admin',
  HR_ADMIN: 'HR Admin',
  HR_BP: 'HR Business Partner',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
} as const;

// Permission actions
export const PERMISSION_ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage',
} as const;

// Permission scopes
export const PERMISSION_SCOPES = {
  OWN: 'own',
  TEAM: 'team',
  DEPARTMENT: 'department',
  ALL: 'all',
} as const;

// Notification channels
export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  IN_APP: 'in_app',
  PUSH: 'push',
  SLACK: 'slack',
  TEAMS: 'teams',
} as const;

// Session configuration
export const SESSION_CONFIG = {
  DEFAULT_TIMEOUT_HOURS: 8,
  MAX_TIMEOUT_HOURS: 24,
  REFRESH_THRESHOLD_MINUTES: 15,
} as const;

// Rate limiting configuration
export const RATE_LIMITS = {
  STANDARD: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 100,
  },
  AUTH: {
    WINDOW_MS: 900000, // 15 minutes
    MAX_REQUESTS: 10,
  },
  MFA: {
    WINDOW_MS: 300000, // 5 minutes
    MAX_REQUESTS: 5,
  },
  PASSWORD_RESET: {
    WINDOW_MS: 3600000, // 1 hour
    MAX_REQUESTS: 3,
  },
  INTEGRATION: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 1000,
  },
} as const;

// File upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Audit event types
export const AUDIT_EVENTS = {
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PASSWORD_RESET_INITIATED: 'PASSWORD_RESET_INITIATED',
  PASSWORD_RESET_COMPLETED: 'PASSWORD_RESET_COMPLETED',
  MFA_ENABLED: 'MFA_ENABLED',
  MFA_DISABLED: 'MFA_DISABLED',

  // Users
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DEACTIVATED: 'USER_DEACTIVATED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  ROLE_ASSIGNED: 'ROLE_ASSIGNED',
  ROLE_REMOVED: 'ROLE_REMOVED',

  // Goals
  GOAL_CREATED: 'GOAL_CREATED',
  GOAL_UPDATED: 'GOAL_UPDATED',
  GOAL_DELETED: 'GOAL_DELETED',
  GOAL_PROGRESS_UPDATED: 'GOAL_PROGRESS_UPDATED',
  GOAL_ALIGNED: 'GOAL_ALIGNED',
  GOAL_ALIGNMENT_REMOVED: 'GOAL_ALIGNMENT_REMOVED',

  // Reviews
  REVIEW_CYCLE_CREATED: 'REVIEW_CYCLE_CREATED',
  REVIEW_CYCLE_UPDATED: 'REVIEW_CYCLE_UPDATED',
  REVIEW_CYCLE_LAUNCHED: 'REVIEW_CYCLE_LAUNCHED',
  REVIEW_CYCLE_STATUS_CHANGED: 'REVIEW_CYCLE_STATUS_CHANGED',
  REVIEW_STARTED: 'REVIEW_STARTED',
  REVIEW_SUBMITTED: 'REVIEW_SUBMITTED',
  REVIEW_ACKNOWLEDGED: 'REVIEW_ACKNOWLEDGED',

  // Feedback
  FEEDBACK_CREATED: 'FEEDBACK_CREATED',
  FEEDBACK_ACKNOWLEDGED: 'FEEDBACK_ACKNOWLEDGED',
  FEEDBACK_DELETED: 'FEEDBACK_DELETED',
  FEEDBACK_REQUESTED: 'FEEDBACK_REQUESTED',

  // Calibration
  CALIBRATION_SESSION_CREATED: 'CALIBRATION_SESSION_CREATED',
  CALIBRATION_SESSION_STARTED: 'CALIBRATION_SESSION_STARTED',
  CALIBRATION_SESSION_COMPLETED: 'CALIBRATION_SESSION_COMPLETED',
  CALIBRATION_RATING_ADJUSTED: 'CALIBRATION_RATING_ADJUSTED',
} as const;

// Company values (default - customizable per tenant)
export const DEFAULT_COMPANY_VALUES = [
  'Integrity',
  'Innovation',
  'Collaboration',
  'Excellence',
  'Customer Focus',
  'Accountability',
  'Respect',
  'Growth Mindset',
] as const;
