// ============================================================================
// Integrations API — Connector catalog, integration CRUD, sync management
// ============================================================================

import { api } from './client';

export interface IntegrationConnector {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: 'HRIS' | 'COLLABORATION' | 'PRODUCTIVITY' | 'CALENDAR' | 'IDENTITY';
  capabilities: string[];
  requiredFields: string[];
  oauthUrl?: string;
}

export interface Integration {
  id: string;
  type: string;
  name: string;
  status: string;
  lastSyncAt?: string;
  createdAt: string;
  config?: Record<string, any>;
}

export interface SyncHistoryEntry {
  id: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: string[];
}

export const integrationsApi = {
  getConnectors: () => api.get<IntegrationConnector[]>('/integrations/connectors'),
  list: () => api.get<Integration[]>('/integrations'),
  getById: (id: string) => api.get<Integration>(`/integrations/${id}`),
  create: (data: { type: string; name: string; config: Record<string, any> }) =>
    api.post<Integration>('/integrations', data),
  update: (id: string, data: Partial<{ name: string; config: Record<string, any> }>) =>
    api.put<Integration>(`/integrations/${id}`, data),
  delete: (id: string) => api.delete(`/integrations/${id}`),
  testConnection: (id: string) =>
    api.post<{ success: boolean; message: string }>(`/integrations/${id}/test`),
  triggerSync: (id: string) => api.post<any>(`/integrations/${id}/sync`),
  getSyncHistory: (id: string) =>
    api.get<SyncHistoryEntry[]>(`/integrations/${id}/sync-history`),
};
