import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  XMarkIcon,
  KeyIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import {
  superAdminUsersApi,
  type SAUser,
  type SAPaginatedResponse,
} from '@/lib/api';
import { DataTable, type Column, Badge, Modal } from '@/components/ui';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLES = [
  { value: '', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR_ADMIN', label: 'HR Admin' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roleBadgeVariant(role: string): 'primary' | 'info' | 'warning' | 'default' {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'primary';
    case 'ADMIN':
    case 'HR_ADMIN':
      return 'warning';
    case 'MANAGER':
      return 'info';
    default:
      return 'default';
  }
}

function statusBadgeVariant(status: string): 'success' | 'danger' | 'warning' | 'default' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'SUSPENDED':
      return 'danger';
    case 'PENDING':
      return 'warning';
    case 'INACTIVE':
    default:
      return 'default';
  }
}

function formatDate(iso?: string): string {
  if (!iso) return 'Never';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SAUsersPage() {
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'EMPLOYEE',
    tenantId: '',
  });

  // Data query
  const { data, isLoading } = useQuery({
    queryKey: ['sa-users', search, roleFilter, page],
    queryFn: () =>
      superAdminUsersApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter || undefined,
      }),
  });

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Mutations
  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => superAdminUsersApi.resetPassword(id),
    onSuccess: () => {
      toast.success('Password reset email sent successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reset password');
    },
  });

  const disableMfaMutation = useMutation({
    mutationFn: (id: string) => superAdminUsersApi.disableMfa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-users'] });
      toast.success('MFA disabled successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to disable MFA');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => superAdminUsersApi.suspend(id, 'Suspended by Super Admin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-users'] });
      toast.success('User suspended');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to suspend user');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => superAdminUsersApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-users'] });
      toast.success('User activated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to activate user');
    },
  });

  const createUserMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => superAdminUsersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-users'] });
      setShowCreateModal(false);
      setCreateForm({ firstName: '', lastName: '', email: '', role: 'EMPLOYEE', tenantId: '' });
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    },
  });

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      firstName: createForm.firstName,
      lastName: createForm.lastName,
      email: createForm.email,
      role: createForm.role,
    };
    if (createForm.tenantId.trim()) {
      payload.tenantId = createForm.tenantId.trim();
    }
    createUserMutation.mutate(payload);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  // Columns
  const columns: Column<SAUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user) => (
        <Badge variant={roleBadgeVariant(user.role)}>
          {user.role.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'tenant',
      header: 'Tenant',
      render: (user) => (
        <span className="text-sm text-secondary-700 dark:text-secondary-300">
          {user.tenantName || user.tenantId || '--'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <Badge variant={statusBadgeVariant(user.status)} dot>
          {user.status}
        </Badge>
      ),
    },
    {
      key: 'mfa',
      header: 'MFA',
      render: (user) =>
        user.mfaEnabled ? (
          <ShieldCheckIcon className="h-5 w-5 text-green-500" title="MFA Enabled" />
        ) : (
          <span className="text-xs text-secondary-400 dark:text-secondary-500">Off</span>
        ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (user) => (
        <span className="text-sm text-secondary-500 dark:text-secondary-400 whitespace-nowrap">
          {formatDate(user.lastLogin)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (user) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => {
              if (confirm(`Send password reset email to ${user.email}?`)) {
                resetPasswordMutation.mutate(user.id);
              }
            }}
            className="p-1.5 rounded-lg text-secondary-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-colors"
            title="Reset Password"
          >
            <KeyIcon className="h-4 w-4" />
          </button>
          {user.mfaEnabled && (
            <button
              onClick={() => {
                if (confirm(`Disable MFA for ${user.firstName} ${user.lastName}?`)) {
                  disableMfaMutation.mutate(user.id);
                }
              }}
              className="p-1.5 rounded-lg text-secondary-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 transition-colors"
              title="Disable MFA"
            >
              <ShieldCheckIcon className="h-4 w-4" />
            </button>
          )}
          {user.status === 'ACTIVE' ? (
            <button
              onClick={() => {
                if (confirm(`Suspend user ${user.firstName} ${user.lastName}?`)) {
                  suspendMutation.mutate(user.id);
                }
              }}
              className="p-1.5 rounded-lg text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
              title="Suspend User"
            >
              <NoSymbolIcon className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={() => activateMutation.mutate(user.id)}
              className="p-1.5 rounded-lg text-secondary-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
              title="Activate User"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Page numbers for custom pagination
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Manage all users across tenants
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
        >
          <UserPlusIcon className="h-5 w-5" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl pl-10 pr-4 py-2.5 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => handleRoleFilterChange(e.target.value)}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl px-3 py-2.5 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <DataTable<SAUser>
        columns={columns}
        data={users}
        isLoading={isLoading}
        keyExtractor={(u) => u.id}
        emptyTitle="No users found"
        emptyDescription="Try adjusting your search or filters."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} users
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {pageNumbers.map((pn) => (
              <button
                key={pn}
                onClick={() => setPage(pn)}
                className={clsx(
                  'min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors',
                  pn === page
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                )}
              >
                {pn}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create User" size="md">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="john.doe@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Role
            </label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="MANAGER">Manager</option>
              <option value="HR_ADMIN">HR Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Tenant ID <span className="text-secondary-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={createForm.tenantId}
              onChange={(e) => setCreateForm((f) => ({ ...f, tenantId: e.target.value }))}
              className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Leave empty for platform-level user"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUserMutation.isPending}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
