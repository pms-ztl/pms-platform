// ============================================================================
// Goals API
// ============================================================================

import { api } from './client';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  progress: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  weight?: number;
  startDate?: string;
  dueDate?: string;
  createdById?: string;
  owner: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  createdBy?: { id: string; firstName: string; lastName: string };
  parentGoal?: { id: string; title: string };
  childGoals?: Goal[];
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  type: string;
  priority?: string;
  parentGoalId?: string;
  ownerId?: string;
  startDate?: string;
  dueDate?: string;
  targetValue?: number;
  unit?: string;
  weight?: number;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  progress?: number;
}

export const goalsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; type?: string; ownerId?: string }) =>
    api.getPaginated<Goal>('/goals', params),
  getMyGoals: (params?: { status?: string }) => api.getPaginated<Goal>('/goals/my', params),
  getById: (id: string) => api.get<Goal>(`/goals/${id}`),
  create: (data: CreateGoalInput) => api.post<Goal>('/goals', data),
  update: (id: string, data: UpdateGoalInput) => api.put<Goal>(`/goals/${id}`, data),
  delete: (id: string) => api.delete(`/goals/${id}`),
  updateProgress: (id: string, progress: number, note?: string) =>
    api.post<Goal>(`/goals/${id}/progress`, { progress, note }),
  getProgressHistory: (id: string) => api.get<any[]>(`/goals/${id}/progress/history`),
  getTree: (rootGoalId?: string) => api.get<Goal[]>('/goals/tree', { params: { rootGoalId } }),
  getTeamTree: () => api.get<Goal[]>('/goals/team-tree'),
  addComment: (id: string, content: string) => api.post<any>(`/goals/${id}/comments`, { content }),
  getComments: (id: string) => api.get<any[]>(`/goals/${id}/comments`),
};
