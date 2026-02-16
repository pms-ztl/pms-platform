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
};
