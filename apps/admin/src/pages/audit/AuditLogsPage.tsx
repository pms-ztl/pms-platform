import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../lib/api';
import { format } from 'date-fns';
import {
  FunnelIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  UserIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';
import { DataTable, Badge } from '../../components/ui';
import type { Column } from '../../components/ui/DataTable';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () =>
      auditApi.list({
        page,
        limit: 20,
        action: filters.action || undefined,
        resource: filters.resource || undefined,
        userId: filters.userId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      }),
  });

  const handleExport = async () => {
    try {
      const response = await auditApi.export({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        format: 'csv',
      });
      window.open(response.data.downloadUrl, '_blank');
    } catch {
      // Handle error
    }
  };

  const actionVariant = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return 'success' as const;
    if (action.includes('DELETE') || action.includes('REMOVE')) return 'danger' as const;
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'info' as const;
    if (action.includes('LOGIN') || action.includes('AUTH')) return 'primary' as const;
    return 'default' as const;
  };

  const logColumns: Column<any>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (log) => <span className="text-gray-500">{format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}</span>,
    },
    {
      key: 'user',
      header: 'User',
      render: (log) => (
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-gray-500" />
          </div>
          <span className="ml-2 text-sm text-gray-900">{log.userEmail}</span>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (log) => <Badge variant={actionVariant(log.action)}>{log.action}</Badge>,
    },
    {
      key: 'resource',
      header: 'Resource',
      sortable: true,
      render: (log) => (
        <div className="flex items-center">
          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-gray-900">{log.resource}</span>
          {log.resourceId && <span className="ml-1 text-gray-400 text-xs">#{log.resourceId.slice(0, 8)}</span>}
        </div>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (log) => (
        <button className="text-sm text-primary-600 hover:text-primary-700" onClick={() => console.log(log.details)}>
          View Details
        </button>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log) => (
        <div className="flex items-center text-gray-500">
          <ComputerDesktopIcon className="h-4 w-4 mr-2" />{log.ipAddress}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">Track all system activities and changes</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="btn btn-secondary">
            <FunnelIcon className="h-5 w-5 mr-2" />Filters
          </button>
          <button onClick={handleExport} className="btn btn-secondary">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select value={filters.action} onChange={(e) => setFilters({ ...filters, action: e.target.value })} className="input">
                <option value="">All Actions</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="EXPORT">Export</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
              <select value={filters.resource} onChange={(e) => setFilters({ ...filters, resource: e.target.value })} className="input">
                <option value="">All Resources</option>
                <option value="USER">User</option>
                <option value="TENANT">Tenant</option>
                <option value="GOAL">Goal</option>
                <option value="REVIEW">Review</option>
                <option value="FEEDBACK">Feedback</option>
                <option value="SETTINGS">Settings</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input type="text" value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })} className="input" placeholder="Search by user ID" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="input" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setFilters({ action: '', resource: '', userId: '', startDate: '', endDate: '' })} className="btn btn-secondary mr-2">Clear Filters</button>
            <button onClick={() => setPage(1)} className="btn btn-primary">Apply Filters</button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <DataTable
        columns={logColumns}
        data={logs?.data?.data ?? []}
        isLoading={isLoading}
        keyExtractor={(log: any) => log.id}
        emptyTitle="No audit logs found"
        emptyDescription="System activity will appear here."
        emptyIcon={<DocumentTextIcon className="h-12 w-12" />}
        pagination={logs?.data ? {
          page,
          pageSize: 20,
          total: logs.data.total,
          onPageChange: setPage,
        } : undefined}
      />
    </div>
  );
}
