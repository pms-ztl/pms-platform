// ============================================================================
// Development Plans & PIP (Performance Improvement Plans) APIs
// ============================================================================

import { api } from './client';

// ── Development Plans ──

export interface DevelopmentPlan {
  id: string;
  userId: string;
  planName: string;
  planType: string;
  status: string;
  careerGoal: string;
  targetRole?: string;
  targetLevel?: string;
  currentLevel: string;
  duration: number;
  startDate: string;
  targetCompletionDate: string;
  overallProgress: number;
  strengthsAssessed: string[];
  developmentAreas: string[];
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; jobTitle?: string };
  activities: DevelopmentActivity[];
  checkpoints: DevelopmentCheckpoint[];
  createdAt: string;
}

export interface DevelopmentActivity {
  id: string;
  activityType: string;
  title: string;
  description: string;
  status: string;
  progressPercentage: number;
  provider?: string;
  learningObjectives: string[];
  targetSkills: string[];
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  startDate?: string;
  completedDate?: string;
  resourceUrl?: string;
  cost?: number;
  priority?: string;
  isRequired: boolean;
  rating?: number;
  feedback?: string;
  completionEvidence?: string;
  certificateUrl?: string;
}

export interface DevelopmentCheckpoint {
  id: string;
  checkpointName: string;
  checkpointDate: string;
  checkpointType: string;
  status: string;
  progressReview?: string;
  skillsAcquired: string[];
  managerFeedback?: string;
  selfAssessment?: string;
  nextSteps: string[];
  completedAt?: string;
}

export interface CreateDevelopmentPlanInput {
  planName: string;
  planType: string;
  careerGoal: string;
  targetRole?: string;
  targetLevel?: string;
  currentLevel: string;
  duration: number;
  startDate: string;
  targetCompletionDate: string;
  strengthsAssessed?: string[];
  developmentAreas?: string[];
  notes?: string;
}

export interface CreateDevelopmentActivityInput {
  activityType: string;
  title: string;
  description: string;
  provider?: string;
  learningObjectives?: string[];
  targetSkills?: string[];
  estimatedHours?: number;
  dueDate?: string;
  startDate?: string;
  resourceUrl?: string;
  cost?: number;
  priority?: string;
  isRequired?: boolean;
}

export const developmentApi = {
  createPlan: (data: CreateDevelopmentPlanInput) => api.post<DevelopmentPlan>('/development/plans', data),
  listPlans: (params?: { status?: string; page?: number; limit?: number }) =>
    api.getPaginated<DevelopmentPlan>('/development/plans', params),
  getTeamPlans: () => api.get<DevelopmentPlan[]>('/development/plans/team'),
  getPlanById: (id: string) => api.get<DevelopmentPlan>(`/development/plans/${id}`),
  updatePlan: (id: string, data: Partial<CreateDevelopmentPlanInput>) =>
    api.put<DevelopmentPlan>(`/development/plans/${id}`, data),
  approvePlan: (id: string) => api.post<DevelopmentPlan>(`/development/plans/${id}/approve`),
  addActivity: (planId: string, data: CreateDevelopmentActivityInput) =>
    api.post<DevelopmentActivity>(`/development/plans/${planId}/activities`, data),
  updateActivity: (activityId: string, data: Partial<{
    status: string; progressPercentage: number; rating: number;
    feedback: string; completionEvidence: string; certificateUrl: string; actualHours: number;
  }>) => api.put<DevelopmentActivity>(`/development/activities/${activityId}`, data),
  addCheckpoint: (planId: string, data: { checkpointName: string; checkpointDate: string; checkpointType: string }) =>
    api.post<DevelopmentCheckpoint>(`/development/plans/${planId}/checkpoints`, data),
  completeCheckpoint: (checkpointId: string, data: {
    progressReview?: string; skillsAcquired?: string[];
    managerFeedback?: string; selfAssessment?: string; nextSteps?: string[];
  }) => api.put<DevelopmentCheckpoint>(`/development/checkpoints/${checkpointId}/complete`, data),
  getRecommendations: (userId?: string) =>
    api.get<any>(userId ? `/development/recommendations/${userId}` : '/development/recommendations'),
};

// ── PIP (Performance Improvement Plans) ──

export interface PIP {
  id: string;
  userId: string;
  createdBy: string;
  pipTitle: string;
  pipType: string;
  severity: string;
  status: string;
  startDate: string;
  endDate: string;
  duration: number;
  reviewFrequency: string;
  performanceIssues: Array<{ issue: string; details?: string }>;
  impactStatement: string;
  performanceExpectations: string;
  specificGoals: Array<{ goal: string; metric?: string }>;
  measurableObjectives: Array<{ objective: string; target?: string }>;
  successCriteria: Array<{ criterion: string }>;
  supportProvided: Array<{ support: string }>;
  trainingRequired: string[];
  consequencesOfNonCompliance: string;
  outcome?: string;
  outcomeDate?: string;
  outcomeNotes?: string;
  employeeAcknowledged: boolean;
  acknowledgedAt?: string;
  employeeComments?: string;
  hrApprovedBy?: string;
  hrApprovedAt?: string;
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl?: string; jobTitle?: string };
  checkIns: PIPCheckIn[];
  milestoneProgress: PIPMilestone[];
  createdAt: string;
}

export interface PIPCheckIn {
  id: string;
  checkInDate: string;
  checkInType: string;
  progressSummary: string;
  performanceRating?: number;
  onTrack: boolean;
  positiveObservations: string[];
  concernsRaised: string[];
  managerFeedback: string;
  employeeFeedback?: string;
  actionItems: Array<{ item: string; assignee?: string; dueDate?: string }>;
  nextSteps: string[];
}

export interface PIPMilestone {
  id: string;
  milestoneName: string;
  description: string;
  dueDate: string;
  status: string;
  achievementLevel?: string;
  evaluationNotes?: string;
  completionDate?: string;
  successCriteria: Array<{ criterion: string }>;
}

export interface CreatePIPInput {
  userId: string;
  pipTitle: string;
  pipType: string;
  severity: string;
  startDate: string;
  endDate: string;
  reviewFrequency: string;
  performanceIssues: Array<{ issue: string; details?: string }>;
  impactStatement: string;
  performanceExpectations: string;
  specificGoals: Array<{ goal: string; metric?: string }>;
  measurableObjectives: Array<{ objective: string; target?: string }>;
  successCriteria: Array<{ criterion: string }>;
  supportProvided: Array<{ support: string }>;
  trainingRequired?: string[];
  consequencesOfNonCompliance: string;
}

export const pipApi = {
  create: (data: CreatePIPInput) => api.post<PIP>('/pip', data),
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.getPaginated<PIP>('/pip', params),
  getById: (id: string) => api.get<PIP>(`/pip/${id}`),
  approve: (id: string) => api.post<PIP>(`/pip/${id}/approve`),
  addCheckIn: (pipId: string, data: {
    checkInDate: string; checkInType: string; progressSummary: string;
    performanceRating?: number; onTrack: boolean; positiveObservations?: string[];
    concernsRaised?: string[]; managerFeedback: string; employeeFeedback?: string;
    actionItems?: Array<{ item: string; assignee?: string; dueDate?: string }>; nextSteps?: string[];
  }) => api.post<PIPCheckIn>(`/pip/${pipId}/check-ins`, data),
  addMilestone: (pipId: string, data: {
    milestoneName: string; description: string; dueDate: string;
    successCriteria: Array<{ criterion: string }>;
  }) => api.post<PIPMilestone>(`/pip/${pipId}/milestones`, data),
  updateMilestone: (milestoneId: string, data: {
    status?: string; achievementLevel?: string; evaluationNotes?: string;
  }) => api.put<PIPMilestone>(`/pip/milestones/${milestoneId}`, data),
  close: (pipId: string, data: { outcome: string; notes?: string }) =>
    api.post<PIP>(`/pip/${pipId}/close`, data),
  acknowledge: (pipId: string, data?: { comments?: string }) =>
    api.post<PIP>(`/pip/${pipId}/acknowledge`, data),
};
