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
import { DataTable, Badge } from '../../components/ui';
import type { Column } from '../../components/ui/DataTable';

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

  const statusVariant = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
      ACTIVE: 'success', TRIAL: 'warning', SUSPENDED: 'danger', CANCELLED: 'default',
    };
    return map[status] || 'default';
  };

  const planVariant = (plan: string) => {
    const map: Record<string, 'primary' | 'info' | 'success' | 'default'> = {
      ENTERPRISE: 'primary', PROFESSIONAL: 'info', STARTER: 'success', FREE: 'default',
    };
    return map[plan] || 'default';
  };

  const tenantColumns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Tenant',
      sortable: true,
      render: (tenant) => (
        <Link to={`/tenants/${tenant.id}`} className="flex items-center">
          <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900 hover:text-primary-600">{tenant.name}</p>
            <p className="text-xs text-gray-500">{tenant.slug}</p>
          </div>
        </Link>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (tenant) => <Badge variant={statusVariant(tenant.status)} dot>{tenant.status}</Badge>,
    },
    {
      key: 'plan',
      header: 'Plan',
      sortable: true,
      render: (tenant) => <Badge variant={planVariant(tenant.plan)}>{tenant.plan}</Badge>,
    },
    {
      key: 'userCount',
      header: 'Users / Licenses',
      sortable: true,
      render: (tenant) => {
        const usage = tenant.licenseCount ? Math.round((tenant.userCount / tenant.licenseCount) * 100) : 0;
        return (
          <div>
            <div className="flex items-center text-gray-700">
              <UsersIcon className="h-4 w-4 mr-1 text-gray-400" />
              {tenant.userCount} / {tenant.licenseCount || '~'}
            </div>
            {tenant.licenseCount > 0 && (
              <div className="w-20 h-1.5 bg-gray-100 rounded-full mt-1">
                <div
                  className={clsx('h-1.5 rounded-full', usage >= 90 ? 'bg-red-500' : usage >= 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                  style={{ width: `${Math.min(usage, 100)}%` }}
                />
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'maxLevel',
      header: 'Levels',
      render: (tenant) => (
        <span className="text-gray-600 text-sm">L1-L{tenant.maxLevel || 16}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (tenant) => <span className="text-gray-500">{format(new Date(tenant.createdAt), 'MMM d, yyyy')}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-10',
      render: (tenant) => (
        <div className="relative">
          <button onClick={() => setShowActionsMenu(showActionsMenu === tenant.id ? null : tenant.id)} className="p-1 rounded hover:bg-gray-100">
            <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
          </button>
          {showActionsMenu === tenant.id && (
            <>
              <div className="fixed inset-0" onClick={() => setShowActionsMenu(null)} />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <Link to={`/tenants/${tenant.id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">View Details</Link>
                {tenant.status === 'ACTIVE' ? (
                  <button onClick={() => suspendMutation.mutate({ id: tenant.id, reason: 'Admin action' })} className="block w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-gray-50">Suspend Tenant</button>
                ) : tenant.status === 'SUSPENDED' ? (
                  <button onClick={() => activateMutation.mutate(tenant.id)} className="block w-full text-left px-4 py-2 text-sm text-success-600 hover:bg-gray-50">Activate Tenant</button>
                ) : null}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all tenant organizations</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-full sm:w-48">
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <DataTable<Tenant>
        columns={tenantColumns}
        data={tenants?.data?.data ?? []}
        isLoading={isLoading}
        keyExtractor={(t) => t.id}
        emptyTitle="No tenants found"
        emptyDescription="Create your first tenant to get started."
        emptyIcon={<BuildingOfficeIcon className="h-12 w-12" />}
        emptyAction={{ label: 'Add Tenant', onClick: () => setShowCreateModal(true) }}
        pagination={tenants?.data ? {
          page,
          pageSize: 10,
          total: tenants.data.total,
          onPageChange: setPage,
        } : undefined}
      />

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
    licenseCount: 50,
    maxLevel: 9,
    ceoEmail: '',
    superAdminCanView: true,
  });
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => tenantsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Tenant created successfully');
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create tenant');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Tenant</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Info */}
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
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  })
                }
                className="input"
                required
                placeholder="company-name"
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

          {/* License Configuration */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              License Configuration
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Employee Licenses
                </label>
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={formData.licenseCount}
                  onChange={(e) => setFormData({ ...formData, licenseCount: parseInt(e.target.value) || 0 })}
                  className="input"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Max active employees allowed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organizational Levels (1-16)
                </label>
                <select
                  value={formData.maxLevel}
                  onChange={(e) => setFormData({ ...formData, maxLevel: parseInt(e.target.value) })}
                  className="input"
                >
                  {Array.from({ length: 16 }, (_, i) => i + 1).map((level) => (
                    <option key={level} value={level}>
                      L1 - L{level} ({level} level{level > 1 ? 's' : ''})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Max hierarchy levels for this org</p>
              </div>
            </div>
          </div>

          {/* Admin Account */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Company Admin Account
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
                  Admin Email
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
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEO Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.ceoEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, ceoEmail: e.target.value })
                  }
                  className="input"
                  placeholder="ceo@company.com"
                />
                <p className="text-xs text-gray-400 mt-1">For critical security and compliance alerts</p>
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              Permissions &amp; Consent
            </h3>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.superAdminCanView}
                onChange={(e) => setFormData({ ...formData, superAdminCanView: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <span className="text-sm text-gray-700 font-medium">Allow Super Admin to view employee data</span>
                <p className="text-xs text-gray-400">Super Admin can see enrollment data and employee details for license monitoring</p>
              </div>
            </label>
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
