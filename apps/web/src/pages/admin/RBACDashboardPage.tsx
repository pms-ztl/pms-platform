import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheckIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { PageHeader } from '@/components/ui';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { rbacApi, type RoleDistribution, type RecentRoleChange } from '@/lib/api/rbac';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── Types ────────────────────────────────────────────────────────────────────

interface RoleInfo {
  id: string;
  name: string;
  category: string | null;
  userCount: number;
  permissions: string[];
}

// ── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6'];

const ACTION_BADGE_STYLES: Record<string, string> = {
  ASSIGNED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REMOVED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CREATED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  DELETED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  CLONED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getActionBadgeStyle(action: string): string {
  const key = Object.keys(ACTION_BADGE_STYLES).find((k) => action.toUpperCase().includes(k));
  return key ? ACTION_BADGE_STYLES[key] : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300';
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function describeChange(change: RecentRoleChange): string {
  const meta = change.metadata as Record<string, string | undefined>;
  if (meta?.description) return meta.description;
  if (meta?.roleName && meta?.userName) {
    const verb = change.action.includes('REMOVED') ? 'Removed' : 'Assigned';
    return `${verb} ${meta.roleName} role ${change.action.includes('REMOVED') ? 'from' : 'to'} ${meta.userName}`;
  }
  if (meta?.roleName) {
    return `${change.action.replace(/_/g, ' ').toLowerCase()} - ${meta.roleName}`;
  }
  return change.action.replace(/_/g, ' ').toLowerCase();
}

// ── Component ────────────────────────────────────────────────────────────────

export function RBACDashboardPage() {
  usePageTitle('RBAC Dashboard');

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [delegationCount, setDelegationCount] = useState(0);
  const [policyCount, setPolicyCount] = useState(0);
  const [recentChanges, setRecentChanges] = useState<RecentRoleChange[]>([]);
  const [changesError, setChangesError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Roles always work
      const rolesRes = await rbacApi.getRoles();
      const rolesData = Array.isArray(rolesRes) ? rolesRes : (rolesRes as any)?.data ?? [];
      setRoles(rolesData);

      // Delegations — may fail
      try {
        const delRes = await rbacApi.getDelegations();
        const delData = Array.isArray(delRes) ? delRes : (delRes as any)?.data ?? [];
        setDelegationCount(delData.length);
      } catch {
        setDelegationCount(0);
      }

      // Policies — may fail
      try {
        const polRes = await rbacApi.getPolicies();
        const polData = Array.isArray(polRes) ? polRes : (polRes as any)?.data ?? [];
        setPolicyCount(polData.length);
      } catch {
        setPolicyCount(0);
      }

      // Recent changes — may fail
      try {
        const changesRes = await rbacApi.getRecentRoleChanges();
        const changesData = Array.isArray(changesRes) ? changesRes : (changesRes as any)?.data ?? [];
        setRecentChanges(changesData);
        setChangesError(false);
      } catch {
        setRecentChanges([]);
        setChangesError(true);
      }
    } catch (err) {
      toast.error('Failed to load RBAC data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const totalRoles = roles.length;
  const usersWithRoles = roles.reduce((sum, r) => sum + r.userCount, 0);

  const pieData: RoleDistribution[] = roles
    .filter((r) => r.userCount > 0)
    .map((r) => ({ name: r.name, userCount: r.userCount, category: r.category }));

  const maxPermissions = Math.max(1, ...roles.map((r) => r.permissions.length));

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">RBAC Dashboard</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Loading access control data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
                <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 h-64">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4" />
                <div className="h-40 bg-secondary-200 dark:bg-secondary-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="RBAC Dashboard" subtitle="Overview of roles, permissions, and access control across your organization">
        <button
          onClick={() => fetchData()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </PageHeader>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ShieldCheckIcon}
          label="Total Roles"
          value={totalRoles}
          colorClass="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={UsersIcon}
          label="Users with Roles"
          value={usersWithRoles}
          colorClass="bg-green-50 dark:bg-green-900/20"
          iconColor="text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={ArrowsRightLeftIcon}
          label="Active Delegations"
          value={delegationCount}
          colorClass="bg-purple-50 dark:bg-purple-900/20"
          iconColor="text-purple-600 dark:text-purple-400"
        />
        <StatCard
          icon={DocumentTextIcon}
          label="Active Policies"
          value={policyCount}
          colorClass="bg-amber-50 dark:bg-amber-900/20"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Row 2: Charts & Permission Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Role Distribution */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Role Distribution</h2>
          </div>
          <div className="p-6">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="userCount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={50}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    contentStyle={{
                      background: 'rgba(15, 23, 42, 0.80)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: '0.75rem',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                      fontSize: '0.75rem',
                      color: '#f1f5f9',
                    }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number) => [`${value} users`, 'Count']}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span className="text-xs text-secondary-600 dark:text-secondary-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShieldCheckIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mb-3" />
                <p className="text-sm text-secondary-500 dark:text-secondary-400">No roles with assigned users</p>
              </div>
            )}
          </div>
        </div>

        {/* Permission Coverage */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Permission Coverage</h2>
          </div>
          <div className="p-6">
            {roles.length > 0 ? (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {roles
                  .slice()
                  .sort((a, b) => b.permissions.length - a.permissions.length)
                  .map((role, idx) => {
                    const pct = (role.permissions.length / maxPermissions) * 100;
                    return (
                      <div key={role.id} className="flex items-center gap-3">
                        <span
                          className="text-xs font-medium text-secondary-700 dark:text-secondary-300 w-28 break-words text-right"
                          title={role.name}
                        >
                          {role.name}
                        </span>
                        <div className="flex-1 h-5 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(pct, 2)}%`,
                              backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 w-8 text-right">
                          {role.permissions.length}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <DocumentTextIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mb-3" />
                <p className="text-sm text-secondary-500 dark:text-secondary-400">No roles configured</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Role Changes Timeline */}
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-secondary-500" />
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Recent Role Changes</h2>
          </div>
        </div>
        <div className="p-6">
          {changesError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ExclamationCircleIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mb-3" />
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Unable to load audit events
              </p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                The audit endpoint may require additional permissions
              </p>
            </div>
          ) : recentChanges.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <ClockIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mb-3" />
              <p className="text-sm text-secondary-500 dark:text-secondary-400">No recent role changes</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-secondary-200 dark:bg-secondary-700" />

              <div className="space-y-4">
                {recentChanges.map((change) => (
                  <div key={change.id} className="relative flex items-start gap-4 pl-10">
                    {/* Timeline dot */}
                    <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white dark:border-secondary-900 bg-secondary-400 dark:bg-secondary-500 z-10" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${getActionBadgeStyle(change.action)}`}
                        >
                          {change.action.replace(/^(ROLE_|BULK_ROLE_)/, '').replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-secondary-400 dark:text-secondary-500">
                          {formatTimeAgo(change.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-secondary-700 dark:text-secondary-300 mt-1">
                        {describeChange(change)}
                      </p>
                      {change.performedBy && (
                        <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                          Performed by {change.performedBy.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  iconColor,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: number;
  colorClass: string;
  iconColor: string;
}) {
  return (
    <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">{label}</span>
      </div>
      <span className="text-3xl font-bold text-secondary-900 dark:text-white">{value}</span>
    </div>
  );
}
