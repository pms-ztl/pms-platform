import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  XCircleIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import {
  usersApi,
  type User,
  type CreateUserInput,
  type UpdateUserInput,
  type Role,
  type Department,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { DataTable, type Column } from '@/components/ui';

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState<User | null>(null);

  const isHRAdmin = user?.roles?.includes('HR_ADMIN') || user?.roles?.includes('ADMIN');

  // Fetch users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', 'management', searchQuery, showActiveOnly],
    queryFn: () => usersApi.list({
      search: searchQuery || undefined,
      isActive: showActiveOnly,
      limit: 50,
    }),
    enabled: isHRAdmin,
  });

  // Fetch roles for dropdowns
  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.listRoles(),
    enabled: isHRAdmin,
  });

  // Fetch departments for dropdowns
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => usersApi.listDepartments(),
    enabled: isHRAdmin,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: CreateUserInput) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserInput }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast.success('User updated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => usersApi.assignRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role assigned successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to assign role');
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) => usersApi.removeRole(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role removed successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to remove role');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate user');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => usersApi.reactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User reactivated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate user');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted permanently');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    },
  });

  const userColumns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      render: (member) => (
        <div className="flex items-center gap-3">
          {member.avatarUrl ? (
            <img src={member.avatarUrl} alt={`${member.firstName} ${member.lastName}`} className="w-10 h-10 rounded-full" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">{member.firstName?.[0]}{member.lastName?.[0]}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{member.firstName} {member.lastName}</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 flex items-center gap-1">
              <EnvelopeIcon className="h-3 w-3" />{member.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (member) => (
        <div className="flex flex-wrap gap-1 items-center">
          {member.roles?.slice(0, 2).map((role, i) => (
            <span key={i} className={clsx('px-2 py-0.5 rounded-full text-xs font-medium',
              role === 'ADMIN' || role === 'HR_ADMIN' || role === 'HR Admin' || role === 'Tenant Admin'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                : role === 'MANAGER' || role === 'Manager'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300'
            )}>{role.replace('_', ' ')}</span>
          ))}
          {member.roles && member.roles.length > 2 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400">+{member.roles.length - 2}</span>
          )}
          <button onClick={() => setShowRoleModal(member)} className="ml-1 p-1 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 text-xs underline">Manage</button>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (member) => member.department ? (
        <span className="text-sm text-secondary-700 dark:text-secondary-300 flex items-center gap-1">
          <BuildingOfficeIcon className="h-4 w-4 text-secondary-400" />{member.department.name}
        </span>
      ) : (
        <span className="text-sm text-secondary-400 dark:text-secondary-500">—</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (member) => (
        <span className={clsx('px-2.5 py-1 rounded-full text-xs font-medium',
          member.isActive ? 'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300' : 'bg-danger-100 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300'
        )}>{member.isActive ? 'Active' : 'Inactive'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (member) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => setEditingUser(member)} className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 rounded-lg transition-colors" title="Edit user">
            <PencilSquareIcon className="h-5 w-5" />
          </button>
          {member.isActive ? (
            <button onClick={() => { if (confirm('Are you sure you want to deactivate this user?')) deactivateMutation.mutate(member.id); }} className="p-2 text-secondary-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 dark:hover:text-danger-400 rounded-lg transition-colors" title="Deactivate user">
              <XCircleIcon className="h-5 w-5" />
            </button>
          ) : (
            <>
              <button onClick={() => reactivateMutation.mutate(member.id)} className="p-2 text-secondary-400 hover:text-success-600 hover:bg-success-50 dark:hover:bg-success-900/30 dark:hover:text-success-400 rounded-lg transition-colors" title="Reactivate user">
                <CheckCircleIcon className="h-5 w-5" />
              </button>
              <button onClick={() => { if (confirm('Are you sure you want to PERMANENTLY DELETE this user? This action cannot be undone.')) deleteUserMutation.mutate(member.id); }} className="p-2 text-secondary-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/30 dark:hover:text-danger-400 rounded-lg transition-colors" title="Delete user permanently">
                <TrashIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  if (!isHRAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-16 w-16 text-secondary-300 dark:text-secondary-600" />
          <h2 className="mt-4 text-xl font-semibold text-secondary-900 dark:text-white">Access Restricted</h2>
          <p className="mt-2 text-secondary-500 dark:text-secondary-400">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Manage users, roles, and permissions
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary-100 dark:bg-primary-900/30">
              <UserGroupIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Total Users</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {usersData?.meta?.total || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success-100 dark:bg-success-900/30">
              <CheckCircleIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Active</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {usersData?.data?.filter((u: User) => u.isActive).length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-danger-100 dark:bg-danger-900/30">
              <XCircleIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Inactive</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {usersData?.data?.filter((u: User) => !u.isActive).length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning-100 dark:bg-warning-900/30">
              <ShieldCheckIcon className="h-6 w-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Admins</p>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {usersData?.data?.filter((u: User) => u.roles?.includes('ADMIN') || u.roles?.includes('HR_ADMIN')).length || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="input pl-10 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="h-4 w-4 text-primary-600 rounded border-secondary-300 dark:border-secondary-600"
            />
            <span className="text-sm text-secondary-700 dark:text-secondary-300">Active only</span>
          </label>
        </div>
      </div>

      {/* Users List */}
      <DataTable<User>
        columns={userColumns}
        data={usersData?.data ?? []}
        isLoading={isLoading}
        keyExtractor={(member) => member.id}
        emptyTitle="No users found"
        emptyDescription={searchQuery ? 'Try adjusting your search query.' : 'Add your first user to get started.'}
        emptyIcon={<UserGroupIcon className="h-12 w-12" />}
        emptyAction={{ label: 'Add User', onClick: () => setShowCreateModal(true) }}
      />

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-secondary-200/50 dark:border-secondary-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Add New User</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
                >
                  <XMarkIcon className="h-5 w-5 text-secondary-500" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const roleIds = formData.getAll('roleIds') as string[];
                  createUserMutation.mutate({
                    email: formData.get('email') as string,
                    firstName: formData.get('firstName') as string,
                    lastName: formData.get('lastName') as string,
                    password: formData.get('password') as string || undefined,
                    jobTitle: formData.get('jobTitle') as string || undefined,
                    departmentId: formData.get('departmentId') as string || undefined,
                    roleIds: roleIds.length > 0 ? roleIds : undefined,
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">First Name</label>
                    <input name="firstName" type="text" required className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white" placeholder="John" />
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Last Name</label>
                    <input name="lastName" type="text" required className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Email</label>
                  <input name="email" type="email" required className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white" placeholder="john.doe@company.com" />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Password (optional - will be auto-generated if empty)</label>
                  <input name="password" type="password" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white" placeholder="Leave empty to auto-generate" minLength={8} />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Job Title (optional)</label>
                  <input name="jobTitle" type="text" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white" placeholder="Software Engineer" />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Department</label>
                  <select name="departmentId" className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white">
                    <option value="">Select Department</option>
                    {departments?.map((dept: Department) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Roles</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto p-3 border border-secondary-200 dark:border-secondary-600 rounded-lg bg-secondary-50 dark:bg-secondary-700/50">
                    {roles?.map((role: Role) => (
                      <label key={role.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="roleIds"
                          value={role.id}
                          className="h-4 w-4 text-primary-600 rounded border-secondary-300 dark:border-secondary-500"
                        />
                        <span className="text-sm text-secondary-700 dark:text-secondary-300">{role.name}</span>
                        {role.description && (
                          <span className="text-xs text-secondary-500 dark:text-secondary-400">- {role.description}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={createUserMutation.isPending} className="btn-primary">
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-secondary-200/50 dark:border-secondary-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Edit User</h2>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
                >
                  <XMarkIcon className="h-5 w-5 text-secondary-500" />
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const departmentId = formData.get('departmentId') as string;
                  updateUserMutation.mutate({
                    id: editingUser.id,
                    data: {
                      firstName: formData.get('firstName') as string || undefined,
                      lastName: formData.get('lastName') as string || undefined,
                      jobTitle: formData.get('jobTitle') as string || undefined,
                      departmentId: departmentId || null,
                    },
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">First Name</label>
                    <input
                      name="firstName"
                      type="text"
                      defaultValue={editingUser.firstName}
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Last Name</label>
                    <input
                      name="lastName"
                      type="text"
                      defaultValue={editingUser.lastName}
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="input bg-secondary-100 dark:bg-secondary-700 cursor-not-allowed dark:text-secondary-400"
                  />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Job Title</label>
                  <input
                    name="jobTitle"
                    type="text"
                    defaultValue={editingUser.jobTitle || ''}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    placeholder="Software Engineer"
                  />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Department</label>
                  <select
                    name="departmentId"
                    defaultValue={editingUser.department?.id || ''}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                  >
                    <option value="">No Department</option>
                    {departments?.map((dept: Department) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" disabled={updateUserMutation.isPending} className="btn-primary">
                    {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Role Management Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRoleModal(null)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-secondary-200/50 dark:border-secondary-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Manage Roles for {showRoleModal.firstName} {showRoleModal.lastName}
                </h2>
                <button
                  onClick={() => setShowRoleModal(null)}
                  className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
                >
                  <XMarkIcon className="h-5 w-5 text-secondary-500" />
                </button>
              </div>

              {/* Current Roles */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Current Roles</h3>
                {showRoleModal.roles && showRoleModal.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {showRoleModal.roles.map((roleName: string, i: number) => {
                      const roleObj = roles?.find((r: Role) => r.name === roleName);
                      return (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300"
                        >
                          {roleName}
                          {roleObj && (
                            <button
                              onClick={() => {
                                if (confirm(`Remove "${roleName}" role from this user?`)) {
                                  removeRoleMutation.mutate({
                                    userId: showRoleModal.id,
                                    roleId: roleObj.id,
                                  });
                                }
                              }}
                              className="ml-1 p-0.5 hover:bg-primary-200 dark:hover:bg-primary-800 rounded-full"
                              disabled={removeRoleMutation.isPending}
                            >
                              <XMarkIcon className="h-3 w-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">No roles assigned</p>
                )}
              </div>

              {/* Available Roles to Add */}
              <div>
                <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">Add Role</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {roles?.filter((role: Role) => !showRoleModal.roles?.includes(role.name)).map((role: Role) => (
                    <button
                      key={role.id}
                      onClick={() => {
                        assignRoleMutation.mutate({
                          userId: showRoleModal.id,
                          roleId: role.id,
                        });
                      }}
                      disabled={assignRoleMutation.isPending}
                      className="w-full text-left p-3 rounded-lg border border-secondary-200 dark:border-secondary-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">{role.description}</p>
                      )}
                    </button>
                  ))}
                  {roles?.filter((role: Role) => !showRoleModal.roles?.includes(role.name)).length === 0 && (
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-4">
                      All available roles are assigned
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <button onClick={() => setShowRoleModal(null)} className="btn-secondary">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
