import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { usersApi, SystemUser } from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  UserIcon,
  ShieldCheckIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', page, search, roleFilter],
    queryFn: () =>
      usersApi.list({
        page,
        limit: 10,
        search: search || undefined,
        role: roleFilter || undefined,
      }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      usersApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User suspended');
      setShowActionsMenu(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => usersApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User activated');
      setShowActionsMenu(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id),
    onSuccess: () => {
      toast.success('Password reset email sent');
      setShowActionsMenu(null);
    },
  });

  const disableMfaMutation = useMutation({
    mutationFn: (id: string) => usersApi.disableMfa(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('MFA disabled');
      setShowActionsMenu(null);
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-success-100 text-success-700',
      INACTIVE: 'bg-gray-100 text-gray-700',
      SUSPENDED: 'bg-danger-100 text-danger-700',
      PENDING: 'bg-warning-100 text-warning-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getRoleBadge = (role: string) => {
    if (role.includes('ADMIN')) {
      return 'bg-primary-100 text-primary-700';
    }
    if (role.includes('MANAGER')) {
      return 'bg-blue-100 text-blue-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all system users across tenants
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="SYSTEM_ADMIN">System Admin</option>
            <option value="TENANT_ADMIN">Tenant Admin</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">User</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Tenant</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">MFA</th>
                    <th className="table-header">Last Login</th>
                    <th className="table-header w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users?.data.data.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <Link
                          to={`/users/${user.id}`}
                          className="flex items-center"
                        >
                          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900 hover:text-primary-600">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', getRoleBadge(user.role))}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="table-cell text-gray-500">
                        {user.tenantName || 'System'}
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', getStatusBadge(user.status))}>
                          {user.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        {user.mfaEnabled ? (
                          <ShieldCheckIcon className="h-5 w-5 text-success-500" />
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-cell text-gray-500">
                        {user.lastLogin
                          ? format(new Date(user.lastLogin), 'MMM d, HH:mm')
                          : 'Never'}
                      </td>
                      <td className="table-cell">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowActionsMenu(
                                showActionsMenu === user.id ? null : user.id
                              )
                            }
                            className="p-1 rounded hover:bg-gray-100"
                          >
                            <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                          </button>
                          {showActionsMenu === user.id && (
                            <>
                              <div
                                className="fixed inset-0"
                                onClick={() => setShowActionsMenu(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <Link
                                  to={`/users/${user.id}`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  View Details
                                </Link>
                                <button
                                  onClick={() => resetPasswordMutation.mutate(user.id)}
                                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <KeyIcon className="h-4 w-4 mr-2" />
                                  Reset Password
                                </button>
                                {user.mfaEnabled && (
                                  <button
                                    onClick={() => disableMfaMutation.mutate(user.id)}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                                    Disable MFA
                                  </button>
                                )}
                                {user.status === 'ACTIVE' ? (
                                  <button
                                    onClick={() =>
                                      suspendMutation.mutate({
                                        id: user.id,
                                        reason: 'Admin action',
                                      })
                                    }
                                    className="block w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-gray-50"
                                  >
                                    Suspend User
                                  </button>
                                ) : user.status === 'SUSPENDED' ? (
                                  <button
                                    onClick={() => activateMutation.mutate(user.id)}
                                    className="block w-full text-left px-4 py-2 text-sm text-success-600 hover:bg-gray-50"
                                  >
                                    Activate User
                                  </button>
                                ) : null}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {users?.data && users.data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * 10 + 1} to{' '}
                  {Math.min(page * 10, users.data.total)} of {users.data.total} users
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= users.data.totalPages}
                    className="btn btn-secondary"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'EMPLOYEE',
    tenantId: '',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created. Invitation email sent.');
      onClose();
    },
    onError: () => {
      toast.error('Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
                className="input"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input"
            >
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="SYSTEM_ADMIN">System Admin</option>
              <option value="TENANT_ADMIN">Tenant Admin</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tenant (optional for system admins)
            </label>
            <input
              type="text"
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="input"
              placeholder="Tenant ID"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="btn btn-primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
