import { api } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export type PolicyType = 'VISIBILITY' | 'ACCESS' | 'APPROVAL' | 'NOTIFICATION' | 'DATA_RETENTION' | 'UNION_CONTRACT';
export type PolicyStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type PolicyEffect = 'ALLOW' | 'DENY';

export interface PolicyUser {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AccessPolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: PolicyType;
  status: PolicyStatus;
  priority: number;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  effect: PolicyEffect;
  targetRoles: string[];
  targetDepartments: string[];
  targetTeams: string[];
  targetLevels: number[];
  unionCode: string | null;
  contractType: string | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: PolicyUser;
  approvedBy?: PolicyUser | null;
}

export interface CreatePolicyInput {
  name: string;
  description?: string;
  type: PolicyType;
  effect?: PolicyEffect;
  priority?: number;
  conditions?: Record<string, unknown>;
  actions?: Record<string, unknown>;
  targetRoles?: string[];
  targetDepartments?: string[];
  targetTeams?: string[];
  targetLevels?: number[];
  unionCode?: string;
  contractType?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface UpdatePolicyInput extends Partial<CreatePolicyInput> {}

export interface SimulatePolicyInput {
  userId: string;
  resource: string;
  action: string;
}

export interface SimulatePolicyResult {
  allowed: boolean;
  matchedPolicies: Array<{
    id: string;
    name: string;
    type: PolicyType;
    effect: PolicyEffect;
    priority: number;
  }>;
}

// ── API Client ───────────────────────────────────────────────────────────────

export const policiesApi = {
  list(filters?: { type?: PolicyType; status?: PolicyStatus }) {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.status) params.set('status', filters.status);
    const qs = params.toString();
    return api.get<AccessPolicy[]>(`/policies${qs ? `?${qs}` : ''}`);
  },

  get(id: string) {
    return api.get<AccessPolicy>(`/policies/${id}`);
  },

  create(input: CreatePolicyInput) {
    return api.post<AccessPolicy>('/policies', input);
  },

  update(id: string, input: UpdatePolicyInput) {
    return api.put<AccessPolicy>(`/policies/${id}`, input);
  },

  activate(id: string) {
    return api.post<AccessPolicy>(`/policies/${id}/activate`);
  },

  deactivate(id: string) {
    return api.post<AccessPolicy>(`/policies/${id}/deactivate`);
  },

  delete(id: string) {
    return api.delete(`/policies/${id}`);
  },

  simulate(input: SimulatePolicyInput) {
    return api.post<SimulatePolicyResult>('/policies/simulate', input);
  },
};
