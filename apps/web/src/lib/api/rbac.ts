import { api } from './client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface RBACStats {
  totalRoles: number;
  usersWithRoles: number;
  activeDelegations: number;
  activePolicies: number;
}

export interface RoleDistribution {
  name: string;
  userCount: number;
  category: string | null;
}

export interface RecentRoleChange {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  performedBy: { id: string; name: string } | null;
  createdAt: string;
}

// ── API Helpers ──────────────────────────────────────────────────────────────

/**
 * Aggregates RBAC dashboard data from existing endpoints.
 * No new backend endpoint needed — this combines roles, delegations, policies, and audit data.
 */
export const rbacApi = {
  /** Fetch roles list to derive stats */
  async getRoles() {
    return api.get<Array<{ id: string; name: string; category: string | null; userCount: number; permissions: string[] }>>('/roles');
  },

  /** Fetch active delegations count */
  async getDelegations() {
    return api.get<Array<{ id: string; status: string }>>('/delegations?status=ACTIVE');
  },

  /** Fetch active policies count */
  async getPolicies() {
    return api.get<Array<{ id: string; status: string }>>('/policies?status=ACTIVE');
  },

  /** Fetch recent role-related audit events */
  async getRecentRoleChanges() {
    return api.get<Array<RecentRoleChange>>('/audit?actions=ROLE_ASSIGNED,ROLE_REMOVED,ROLE_CREATED,ROLE_DELETED,ROLE_CLONED,BULK_ROLE_ASSIGNED,BULK_ROLE_REMOVED&limit=20');
  },
};
