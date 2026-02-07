import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { tenantsApi, Tenant } from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants', page, search, statusFilter],
    queryFn: () =>
      tenantsApi.list({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      tenantsApi.suspend(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant suspended');
      setShowActionsMenu(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => tenantsApi.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant activated');
      setShowActionsMenu(null);
    },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-success-100 text-success-700',
      TRIAL: 'bg-warning-100 text-warning-700',
      SUSPENDED: 'bg-danger-100 text-danger-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      ENTERPRISE: 'bg-primary-100 text-primary-700',
      PROFESSIONAL: 'bg-blue-100 text-blue-700',
      STARTER: 'bg-green-100 text-green-700',
      FREE: 'bg-gray-100 text-gray-700',
    };
    return styles[plan] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage all tenant organizations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
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
                    <th className="table-header">Tenant</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Plan</th>
                    <th className="table-header">Users</th>
                    <th className="table-header">Storage</th>
                    <th className="table-header">Created</th>
                    <th className="table-header w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants?.data.data.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <Link
                          to={`/tenants/${tenant.id}`}
                          className="flex items-center"
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-gray-900 hover:text-primary-600">
                              {tenant.name}
                            </p>
                            <p className="text-xs text-gray-500">{tenant.slug}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', getStatusBadge(tenant.status))}>
                          {tenant.status}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={clsx('badge', getPlanBadge(tenant.plan))}>
                          {tenant.plan}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-gray-700">
                          <UsersIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {tenant.userCount}
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-gray-700">
                          <CircleStackIcon className="h-4 w-4 mr-1 text-gray-400" />
                          {(tenant.storageUsed / 1024 / 1024 / 1024).toFixed(1)} GB
                        </div>
                      </td>
                      <td className="table-cell text-gray-500">
                        {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="table-cell">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setShowActionsMenu(
                                showActionsMenu === tenant.id ? null : tenant.id
                              )
                            }
                            className="p-1 rounded hover:bg-gray-100"
                          >
                            <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                          </button>
                          {showActionsMenu === tenant.id && (
                            <>
                              <div
                                className="fixed inset-0"
                                onClick={() => setShowActionsMenu(null)}
                              />
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                                <Link
                                  to={`/tenants/${tenant.id}`}
                                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  View Details
                                </Link>
                                {tenant.status === 'ACTIVE' ? (
                                  <button
                                    onClick={() =>
                                      suspendMutation.mutate({
                                        id: tenant.id,
                                        reason: 'Admin action',
                                      })
                                    }
                                    className="block w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-gray-50"
                                  >
                                    Suspend Tenant
                                  </button>
                                ) : tenant.status === 'SUSPENDED' ? (
                                  <button
                                    onClick={() => activateMutation.mutate(tenant.id)}
                                    className="block w-full text-left px-4 py-2 text-sm text-success-600 hover:bg-gray-50"
                                  >
                                    Activate Tenant
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
            {tenants?.data && tenants.data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * 10 + 1} to{' '}
                  {Math.min(page * 10, tenants.data.total)} of {tenants.data.total}{' '}
                  tenants
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
                    disabled={page >= tenants.data.totalPages}
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
        <CreateTenantModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'STARTER',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => tenantsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
      onClose();
    },
    onError: () => {
      toast.error('Failed to create tenant');
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
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Tenant</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  })
                }
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plan
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="input"
              >
                <option value="FREE">Free</option>
                <option value="STARTER">Starter</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Admin Account
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.adminFirstName}
                  onChange={(e) =>
                    setFormData({ ...formData, adminFirstName: e.target.value })
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
                  value={formData.adminLastName}
                  onChange={(e) =>
                    setFormData({ ...formData, adminLastName: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.adminEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, adminEmail: e.target.value })
                  }
                  className="input"
                  required
                />
              </div>
            </div>
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
              {createMutation.isPending ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
