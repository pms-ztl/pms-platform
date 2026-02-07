import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../lib/api';
import { format } from 'date-fns';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  UserIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

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

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return 'text-success-600 bg-success-50';
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'text-danger-600 bg-danger-50';
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'text-blue-600 bg-blue-50';
    }
    if (action.includes('LOGIN') || action.includes('AUTH')) {
      return 'text-primary-600 bg-primary-50';
    }
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track all system activities and changes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary"
          >
            <FunnelIcon className="h-5 w-5 mr-2" />
            Filters
          </button>
          <button onClick={handleExport} className="btn btn-secondary">
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="input"
              >
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource
              </label>
              <select
                value={filters.resource}
                onChange={(e) =>
                  setFilters({ ...filters, resource: e.target.value })
                }
                className="input"
              >
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="input"
                placeholder="Search by user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters({ ...filters, startDate: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() =>
                setFilters({
                  action: '',
                  resource: '',
                  userId: '',
                  startDate: '',
                  endDate: '',
                })
              }
              className="btn btn-secondary mr-2"
            >
              Clear Filters
            </button>
            <button onClick={() => setPage(1)} className="btn btn-primary">
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-header">Timestamp</th>
                    <th className="table-header">User</th>
                    <th className="table-header">Action</th>
                    <th className="table-header">Resource</th>
                    <th className="table-header">Details</th>
                    <th className="table-header">IP Address</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs?.data.data.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="table-cell text-gray-500">
                        {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-gray-500" />
                          </div>
                          <span className="ml-2 text-sm text-gray-900">
                            {log.userEmail}
                          </span>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getActionColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-gray-900">{log.resource}</span>
                          {log.resourceId && (
                            <span className="ml-1 text-gray-400 text-xs">
                              #{log.resourceId.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="table-cell">
                        <button
                          className="text-sm text-primary-600 hover:text-primary-700"
                          onClick={() => {
                            // Show details modal
                            console.log(log.details);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center text-gray-500">
                          <ComputerDesktopIcon className="h-4 w-4 mr-2" />
                          {log.ipAddress}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {logs?.data && logs.data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * 20 + 1} to{' '}
                  {Math.min(page * 20, logs.data.total)} of {logs.data.total} logs
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
                    disabled={page >= logs.data.totalPages}
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
    </div>
  );
}
