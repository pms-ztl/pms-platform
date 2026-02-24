import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  SparklesIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiAccessUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string | null;
  aiAccessEnabled?: boolean;
  roles?: string[];
  isActive?: boolean;
}

interface AiAccessStats {
  plan: string;
  aiFeatureEnabled: boolean;
  delegateToManagers: boolean;
  totalUsers: number;
  aiEnabledCount: number;
  aiEnabledUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIAccessManagementPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Permission gate
  const isAdmin =
    user?.roles?.includes('HR_ADMIN') ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN');

  // ---- Data fetching -------------------------------------------------------

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<AiAccessStats>({
    queryKey: ['ai-access-stats'],
    queryFn: () => usersApi.getAiAccessStats(),
    enabled: !!isAdmin,
  });

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ['users', 'ai-access-list', searchQuery],
    queryFn: () =>
      usersApi.list({
        search: searchQuery || undefined,
        isActive: true,
        limit: 100,
      }),
    enabled: !!isAdmin,
  });

  const users: AiAccessUser[] = usersData?.data ?? [];

  // Merge AI-enabled user IDs from stats into the user list so the toggle
  // reflects the correct state even if the list endpoint doesn't carry it.
  const aiEnabledIds = useMemo(() => {
    const set = new Set<string>();
    stats?.aiEnabledUsers?.forEach((u) => set.add(u.id));
    return set;
  }, [stats]);

  const enrichedUsers: AiAccessUser[] = useMemo(
    () =>
      users.map((u) => ({
        ...u,
        aiAccessEnabled:
          u.aiAccessEnabled !== undefined
            ? u.aiAccessEnabled
            : aiEnabledIds.has(u.id),
      })),
    [users, aiEnabledIds],
  );

  // ---- Mutations -----------------------------------------------------------

  const showSuccess = useCallback((msg: string) => {
    setSuccessMessage(msg);
    console.log(`[AI Access] ${msg}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const toggleMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: string; enabled: boolean }) =>
      usersApi.toggleAiAccess(userId, enabled),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-access-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'ai-access-list'] });
      showSuccess(
        `AI access ${variables.enabled ? 'enabled' : 'disabled'} for user.`,
      );
    },
  });

  const bulkToggleMutation = useMutation({
    mutationFn: ({
      userIds,
      enabled,
    }: {
      userIds: string[];
      enabled: boolean;
    }) => usersApi.bulkToggleAiAccess(userIds, enabled),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-access-stats'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'ai-access-list'] });
      setSelectedIds(new Set());
      showSuccess(
        `AI access ${variables.enabled ? 'enabled' : 'disabled'} for ${(data as any)?.updated ?? variables.userIds.length} user(s).`,
      );
    },
  });

  const delegationMutation = useMutation({
    mutationFn: (delegateToManagers: boolean) =>
      usersApi.updateAiDelegation(delegateToManagers),
    onSuccess: (_data, delegateToManagers) => {
      queryClient.invalidateQueries({ queryKey: ['ai-access-stats'] });
      showSuccess(
        delegateToManagers
          ? 'Managers can now grant AI access to their reports.'
          : 'AI access delegation to managers disabled.',
      );
    },
  });

  // ---- Selection helpers ---------------------------------------------------

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === enrichedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(enrichedUsers.map((u) => u.id)));
    }
  }, [enrichedUsers, selectedIds.size]);

  // ---- Derived stats -------------------------------------------------------

  const totalUsers = stats?.totalUsers ?? 0;
  const aiEnabledCount = stats?.aiEnabledCount ?? 0;
  const percentage = totalUsers > 0 ? Math.round((aiEnabledCount / totalUsers) * 100) : 0;

  // ---- Guards --------------------------------------------------------------

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldCheckIcon className="h-12 w-12 text-secondary-400 mb-4" />
        <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">
          Access Denied
        </h2>
        <p className="text-secondary-500 dark:text-secondary-400 mt-2">
          You need admin permissions to manage AI access settings.
        </p>
      </div>
    );
  }

  const isLoading = statsLoading || usersLoading;
  const error = statsError || usersError;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Shimmer header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-white/20 rounded w-1/3" />
            <div className="h-10 bg-white/20 rounded w-1/2" />
            <div className="h-4 bg-white/20 rounded w-1/4" />
          </div>
        </div>
        {/* Shimmer stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6"
            >
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
                <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
        {/* Shimmer table */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 bg-secondary-200 dark:bg-secondary-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/4" />
                  <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
                </div>
                <div className="h-6 w-11 bg-secondary-200 dark:bg-secondary-700 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <XCircleIcon className="h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">
          Failed to Load AI Access Data
        </h2>
        <p className="text-secondary-500 dark:text-secondary-400 mt-2 max-w-md">
          {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['ai-access-stats'] });
            queryClient.invalidateQueries({ queryKey: ['users', 'ai-access-list'] });
          }}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ---- Render --------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Success toast */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-green-600 text-white shadow-lg animate-fade-in">
          <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Gradient Header                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute bottom-0 left-0 -mb-6 -ml-6 h-40 w-40 rounded-full bg-white/5 blur-3xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-white/15 backdrop-blur-sm">
              <SparklesIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                AI Access Management
              </h1>
              <p className="mt-1 text-violet-200 text-sm">
                <span className="font-semibold text-white">
                  {aiEnabledCount} / {totalUsers}
                </span>{' '}
                users have AI access
                {stats?.plan && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white">
                    {stats.plan}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* AI feature toggle indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                stats?.aiFeatureEnabled
                  ? 'bg-green-400/20 text-green-100'
                  : 'bg-red-400/20 text-red-200'
              }`}
            >
              {stats?.aiFeatureEnabled ? (
                <CheckCircleIcon className="h-4 w-4" />
              ) : (
                <XCircleIcon className="h-4 w-4" />
              )}
              AI {stats?.aiFeatureEnabled ? 'Enabled' : 'Disabled'} on Plan
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Stats Cards                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total users */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20">
              <UserGroupIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
              Total Users
            </span>
          </div>
          <span className="text-3xl font-bold text-secondary-900 dark:text-white">
            {totalUsers}
          </span>
          <p className="text-xs text-secondary-500 mt-2">Active employees in the organization</p>
        </div>

        {/* AI-enabled users */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/20">
              <SparklesIcon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
              AI-Enabled Users
            </span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-secondary-900 dark:text-white">
              {aiEnabledCount}
            </span>
            <span className="text-lg text-secondary-400 pb-0.5">/ {totalUsers}</span>
          </div>
          <div className="mt-3">
            <div className="w-full h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Percentage card */}
        <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
              Adoption Rate
            </span>
          </div>
          <span className="text-3xl font-bold text-secondary-900 dark:text-white">
            {percentage}%
          </span>
          <p className="text-xs text-secondary-500 mt-2">
            of users have AI features enabled
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Delegate to Managers Toggle                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 mt-0.5">
              <ShieldCheckIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
                Delegate to Managers
              </h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                When enabled, managers can grant or revoke AI access for their
                direct reports without admin involvement.
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={stats?.delegateToManagers ?? false}
            onClick={() =>
              delegationMutation.mutate(!stats?.delegateToManagers)
            }
            disabled={delegationMutation.isPending}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 ${
              stats?.delegateToManagers
                ? 'bg-violet-600'
                : 'bg-secondary-300 dark:bg-secondary-600'
            } ${delegationMutation.isPending ? 'opacity-60 cursor-wait' : ''}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                stats?.delegateToManagers ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Search & Bulk Actions Bar                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white placeholder-secondary-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary-600 dark:text-secondary-400">
              {selectedIds.size} selected
            </span>
            <button
              onClick={() =>
                bulkToggleMutation.mutate({
                  userIds: Array.from(selectedIds),
                  enabled: true,
                })
              }
              disabled={bulkToggleMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              <SparklesIcon className="h-4 w-4" />
              Enable AI
            </button>
            <button
              onClick={() =>
                bulkToggleMutation.mutate({
                  userIds: Array.from(selectedIds),
                  enabled: false,
                })
              }
              disabled={bulkToggleMutation.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-50 transition-colors"
            >
              <XCircleIcon className="h-4 w-4" />
              Disable AI
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-xs font-medium text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Users Table                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50">
                <th className="text-left px-6 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={
                      enrichedUsers.length > 0 &&
                      selectedIds.size === enrichedUsers.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 text-violet-600 rounded border-secondary-300 dark:border-secondary-600 focus:ring-violet-500"
                  />
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                  User
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                  Role / Title
                </th>
                <th className="text-center px-6 py-3 text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                  AI Access
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
              {enrichedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <UserGroupIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-secondary-900 dark:text-white">
                      No users found
                    </p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                      {searchQuery
                        ? 'Try adjusting your search query.'
                        : 'No active users are available.'}
                    </p>
                  </td>
                </tr>
              ) : (
                enrichedUsers.map((u) => {
                  const initials = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase();
                  const isEnabled = u.aiAccessEnabled ?? false;
                  const isToggling =
                    toggleMutation.isPending &&
                    (toggleMutation.variables as any)?.userId === u.id;

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
                    >
                      {/* Checkbox */}
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(u.id)}
                          onChange={() => toggleSelect(u.id)}
                          className="h-4 w-4 text-violet-600 rounded border-secondary-300 dark:border-secondary-600 focus:ring-violet-500"
                        />
                      </td>

                      {/* Avatar + Name + Email */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                              {initials}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role / Job Title */}
                      <td className="px-6 py-4">
                        <p className="text-sm text-secondary-700 dark:text-secondary-300">
                          {u.jobTitle || '---'}
                        </p>
                        {u.roles && u.roles.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {u.roles.slice(0, 2).map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400"
                              >
                                {role.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {u.roles.length > 2 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400">
                                +{u.roles.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* AI Access Toggle */}
                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isEnabled}
                          aria-label={`Toggle AI access for ${u.firstName} ${u.lastName}`}
                          onClick={() =>
                            toggleMutation.mutate({
                              userId: u.id,
                              enabled: !isEnabled,
                            })
                          }
                          disabled={isToggling}
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 ${
                            isEnabled
                              ? 'bg-violet-600'
                              : 'bg-secondary-300 dark:bg-secondary-600'
                          } ${isToggling ? 'opacity-60 cursor-wait' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {enrichedUsers.length > 0 && (
          <div className="px-6 py-3 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50 flex items-center justify-between">
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              Showing {enrichedUsers.length} user{enrichedUsers.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              {aiEnabledCount} with AI access enabled
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
