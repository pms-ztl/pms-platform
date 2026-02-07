import type {
  Tenant,
  User,
  Department,
  Role,
  UserRole,
  Session,
  Goal,
  GoalAlignment,
  GoalProgressUpdate,
  GoalComment,
  ReviewCycle,
  ReviewTemplate,
  Review,
  ReviewGoal,
  Feedback,
  CalibrationSession,
  CalibrationParticipant,
  CalibrationRating,
  OneOnOne,
  CompetencyFramework,
  Competency,
  Integration,
  IntegrationSyncJob,
  NotificationTemplate,
  Notification,
  AuditEvent,
  CalendarEvent,
  CalendarEventType,
  GoalType,
  GoalStatus,
  GoalPriority,
  ReviewCycleStatus,
  ReviewCycleType,
  ReviewStatus,
  ReviewType,
  FeedbackType,
  FeedbackVisibility,
  CalibrationStatus,
  OneOnOneStatus,
  IntegrationStatus,
  SyncJobStatus,
  NotificationStatus,
} from '@prisma/client';

// Re-export all types
export type {
  Tenant,
  User,
  Department,
  Role,
  UserRole,
  Session,
  Goal,
  GoalAlignment,
  GoalProgressUpdate,
  GoalComment,
  ReviewCycle,
  ReviewTemplate,
  Review,
  ReviewGoal,
  Feedback,
  CalibrationSession,
  CalibrationParticipant,
  CalibrationRating,
  OneOnOne,
  CompetencyFramework,
  Competency,
  Integration,
  IntegrationSyncJob,
  NotificationTemplate,
  Notification,
  AuditEvent,
  CalendarEvent,
};

// Re-export enums
export {
  GoalType,
  GoalStatus,
  GoalPriority,
  ReviewCycleStatus,
  ReviewCycleType,
  ReviewStatus,
  ReviewType,
  FeedbackType,
  FeedbackVisibility,
  CalibrationStatus,
  OneOnOneStatus,
  IntegrationStatus,
  SyncJobStatus,
  NotificationStatus,
  CalendarEventType,
} from '@prisma/client';

// Custom types for API/Business logic
export interface TenantContext {
  tenantId: string;
  userId: string;
  roles: string[];
  permissions: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  type: GoalType;
  priority?: GoalPriority;
  parentGoalId?: string;
  ownerId?: string;
  startDate?: Date;
  dueDate?: Date;
  targetValue?: number;
  unit?: string;
  weight?: number;
  isPrivate?: boolean;
  tags?: string[];
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  priority?: GoalPriority;
  status?: GoalStatus;
  progress?: number;
  currentValue?: number;
  startDate?: Date;
  dueDate?: Date;
  weight?: number;
  isPrivate?: boolean;
  tags?: string[];
}

export interface CreateReviewInput {
  cycleId: string;
  revieweeId: string;
  reviewerId: string;
  type: ReviewType;
}

export interface SubmitReviewInput {
  overallRating: number;
  content: Record<string, unknown>;
  strengths?: string[];
  areasForGrowth?: string[];
  summary?: string;
  privateNotes?: string;
  goalRatings?: Array<{
    goalId: string;
    rating: number;
    comment?: string;
    achievementPercentage?: number;
  }>;
}

export interface CreateFeedbackInput {
  toUserId: string;
  type: FeedbackType;
  visibility: FeedbackVisibility;
  content: string;
  isAnonymous?: boolean;
  tags?: string[];
  valueTags?: string[];
  skillTags?: string[];
}

export interface CreateCalibrationSessionInput {
  cycleId: string;
  name: string;
  description?: string;
  scheduledStart: Date;
  scheduledEnd?: Date;
  departmentScope?: string[];
  levelScope?: number[];
}

export interface AdjustCalibrationRatingInput {
  reviewId: string;
  adjustedRating: number;
  rationale: string;
  discussionNotes?: string;
}
