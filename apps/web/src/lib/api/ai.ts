// ============================================================================
// Agentic AI API
// ============================================================================

import { api } from './client';

export interface AIConversation {
  id: string;
  agentType: string;
  title: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface AIMessage {
  id: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AIInsightCard {
  id: string;
  agentType: string;
  insightType: string;
  title: string;
  description: string;
  priority: string;
  data: Record<string, unknown> | null;
  actionUrl: string | null;
  actionLabel: string | null;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
}

export interface AIChatResponse {
  message: string;
  conversationId: string;
  agentType: string;
  metadata: {
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costCents: number;
    latencyMs: number;
  };
  data?: Record<string, unknown>;
  suggestedActions?: Array<{ label: string; url?: string; action?: string }>;
  taskId?: string;
}

// ── Agentic Task Types ──────────────────────────────────────

export interface AgentTaskAction {
  id: string;
  stepIndex: number;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  status: string;
  requiresApproval: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  impactLevel: string;
  costCents: number;
  latencyMs: number;
  reasoning: string | null;
  createdAt: string;
  updatedAt: string;
  task?: { id: string; title: string; agentType: string; goal: string };
}

export interface AgentTask {
  id: string;
  tenantId: string;
  userId: string;
  agentType: string;
  title: string;
  description: string | null;
  goal: string;
  status: string;
  plan: Array<{
    toolName: string;
    toolInput: Record<string, unknown>;
    reasoning: string;
    impactLevel: string;
    requiresApproval: boolean;
  }> | null;
  currentStep: number;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  totalCostCents: number;
  totalTokens: number;
  result: Record<string, unknown> | null;
  isProactive: boolean;
  parentTaskId: string | null;
  createdAt: string;
  updatedAt: string;
  actions: AgentTaskAction[];
  childTasks?: AgentTask[];
}

export const aiApi = {
  // Chat
  chat: (message: string, agentType?: string, conversationId?: string) =>
    api.post<AIChatResponse>('/ai/chat', { message, agentType, conversationId }),

  // Conversations
  getConversations: (params?: { page?: number; limit?: number; agentType?: string }) =>
    api.get<AIConversation[]>('/ai/conversations', { params }),
  getConversation: (id: string) =>
    api.get<{ id: string; messages: AIMessage[]; agentType: string; title: string }>(`/ai/conversations/${id}`),
  archiveConversation: (id: string) => api.delete(`/ai/conversations/${id}`),

  // Insights
  getInsights: (params?: { page?: number; limit?: number; agentType?: string; priority?: string }) =>
    api.get<AIInsightCard[]>('/ai/insights', { params }),
  getInsightsSummary: () => api.get<{ summary: string }>('/ai/insights/summary'),
  markInsightRead: (id: string) => api.put(`/ai/insights/${id}/read`),
  dismissInsight: (id: string) => api.put(`/ai/insights/${id}/dismiss`),

  // Excel AI analysis
  analyzeExcel: (data: { rows: Record<string, unknown>[]; errors: Array<{ row: number; field: string; message: string }> }) =>
    api.post<AIChatResponse>('/ai/excel/analyze', data),

  // Reports
  generateReport: (reportType: string, params?: Record<string, unknown>) =>
    api.post<AIChatResponse>('/ai/reports/generate', { reportType, params }),

  // Usage
  getUsage: () => api.get<{
    period: string;
    conversations: number;
    messages: number;
    insights: number;
    totalTokens: number;
    totalCostCents: number;
  }>('/ai/usage'),

  // Agentic Tasks
  getTasks: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<AgentTask[]>('/ai/tasks', { params }),
  getTask: (id: string) =>
    api.get<AgentTask>(`/ai/tasks/${id}`),
  cancelTask: (id: string) =>
    api.post(`/ai/tasks/${id}/cancel`),

  // Agentic Approvals
  getPendingApprovals: () =>
    api.get<AgentTaskAction[]>('/ai/actions/pending'),
  approveAction: (id: string) =>
    api.post(`/ai/actions/${id}/approve`),
  rejectAction: (id: string, reason: string) =>
    api.post(`/ai/actions/${id}/reject`, { reason }),

  // Multi-Agent Coordination
  coordinateChat: (message: string, agentTypes: string[], conversationId?: string) =>
    api.post<AIChatResponse>('/ai/chat/coordinate', { message, agentTypes, conversationId }),

  // Live Agent Activity
  getActiveAgents: () =>
    api.get<Array<{
      id: string;
      agentType: string;
      title: string;
      status: string;
      currentStep: number;
      totalSteps: number;
      startedAt: string | null;
      isProactive: boolean;
      parentTaskId: string | null;
      user: { firstName: string; lastName: string };
    }>>('/ai/agents/active'),
};
