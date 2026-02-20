import { api } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export type DelegationType = 'ACTING_MANAGER' | 'PROXY_APPROVER' | 'REVIEW_DELEGATE' | 'FULL_DELEGATION';
export type DelegationStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface DelegationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Delegation {
  id: string;
  tenantId: string;
  delegatorId: string;
  delegateId: string;
  type: DelegationType;
  status: DelegationStatus;
  scope: Record<string, unknown>;
  reason: string | null;
  startDate: string;
  endDate: string | null;
  approvedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  createdAt: string;
  updatedAt: string;
  delegator?: DelegationUser;
  delegate?: DelegationUser;
  approvedBy?: DelegationUser | null;
  revokedBy?: DelegationUser | null;
}

export interface CreateDelegationInput {
  delegatorId: string;
  delegateId: string;
  type: DelegationType;
  startDate: string;
  endDate?: string;
  scope?: Record<string, unknown>;
  reason?: string;
}

export interface DelegationAuditEvent {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  performedBy: { id: string; name: string } | null;
  createdAt: string;
}

// ── API Client ───────────────────────────────────────────────────────────────

export const delegationsApi = {
  list(filters?: { status?: DelegationStatus; type?: DelegationType; userId?: string }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.type) params.set('type', filters.type);
    if (filters?.userId) params.set('userId', filters.userId);
    const qs = params.toString();
    return api.get<Delegation[]>(`/delegations${qs ? `?${qs}` : ''}`);
  },

  get(id: string) {
    return api.get<Delegation>(`/delegations/${id}`);
  },

  create(input: CreateDelegationInput) {
    return api.post<Delegation>('/delegations', input);
  },

  approve(id: string) {
    return api.post<Delegation>(`/delegations/${id}/approve`);
  },

  reject(id: string, reason?: string) {
    return api.post<Delegation>(`/delegations/${id}/reject`, { reason });
  },

  revoke(id: string, reason?: string) {
    return api.post<Delegation>(`/delegations/${id}/revoke`, { reason });
  },

  getAudit(id: string) {
    return api.get<DelegationAuditEvent[]>(`/delegations/${id}/audit`);
  },
};
