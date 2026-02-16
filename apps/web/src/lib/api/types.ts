// ============================================================================
// Shared types used across multiple API domains
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  permissions: string[];
  displayName?: string;
  avatarUrl?: string;
  jobTitle?: string;
  department?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
  roles: string[];
  isActive: boolean;
  mfaEnabled?: boolean;
  aiAccessEnabled?: boolean;
}

export interface DashboardMetrics {
  goals: {
    total: number;
    completed: number;
    inProgress: number;
    avgProgress: number;
    onTrack: number;
    atRisk: number;
    overdue: number;
  };
  reviews: {
    activeCycles: number;
    completionRate: number;
    avgRating: number;
    pendingReviews: number;
    submittedReviews: number;
  };
  feedback: {
    total: number;
    praiseCount: number;
    constructiveCount: number;
    avgSentiment: number;
  };
  team: {
    totalEmployees: number;
    activeEmployees: number;
    avgGoalsPerEmployee: number;
  };
}
