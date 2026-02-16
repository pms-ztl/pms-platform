import { useQuery } from '@tanstack/react-query';
import { systemApi, tenantsApi, auditApi } from '../../lib/api';
import {
  BuildingOfficeIcon,
  UsersIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format } from 'date-fns';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { LiveIndicator } from '../../components/ui/ConnectionStatus';

const COLORS = ['#d946ef', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

export default function DashboardPage() {
  const { data: dashboardData, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => systemApi.getDashboardStats(),
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['recent-tenants'],
    queryFn: () => tenantsApi.list({ limit: 5 }),
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['recent-audit'],
    queryFn: () => auditApi.list({ limit: 10 }),
  });

  const systemMetrics = dashboardData?.data;

  // Use real plan distribution from backend (falls back to empty)
  const planDistribution = systemMetrics?.planDistribution || [];

  // Use real health data from backend
  const healthServices = systemMetrics?.health
    ? Object.entries(systemMetrics.health).map(([name, status]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        status: status as string,
      }))
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">System overview and key metrics</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <LiveIndicator />
          <span>Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tenants"
            value={systemMetrics?.totalTenants || 0}
            icon={<BuildingOfficeIcon />}
            trend={{ value: 12, label: 'this month' }}
          />
          <StatCard
            label="Active Users"
            value={systemMetrics?.activeUsers?.toLocaleString() || '0'}
            icon={<UsersIcon />}
            trend={{ value: 8, label: 'this month' }}
          />
          <StatCard
            label="API Requests (Today)"
            value={systemMetrics?.apiRequestsToday?.toLocaleString() || '0'}
            icon={<ServerIcon />}
            trend={{ value: -3, label: 'vs yesterday' }}
          />
          <StatCard
            label="Error Rate"
            value={`${systemMetrics?.errorRate?.toFixed(2) || '0'}%`}
            icon={<ExclamationTriangleIcon />}
            trend={{ value: -15, label: 'this week' }}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Platform Summary</h3>
          <div className="h-64 flex flex-col justify-center space-y-5">
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-purple-50">
              <div>
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-2xl font-bold text-purple-700">{systemMetrics?.totalTenants ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-lg font-semibold text-green-600">{systemMetrics?.activeTenants ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-50">
              <div>
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-blue-700">{systemMetrics?.totalUsers?.toLocaleString() ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-lg font-semibold text-green-600">{systemMetrics?.activeUsers?.toLocaleString() ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50">
              <div>
                <p className="text-sm text-gray-500">System Uptime</p>
                <p className="text-2xl font-bold text-gray-700">
                  {systemMetrics?.uptime ? `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m` : 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Status</p>
                <Badge variant={systemMetrics?.healthStatus === 'healthy' ? 'success' : 'warning'}>
                  {systemMetrics?.healthStatus || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Tenant Plans (Live)</h3>
          {planDistribution.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {planDistribution.map((_, index) => (
                        <Cell key={`cell-chart-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {planDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-gray-600">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
              No tenant data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Tenants</h3>
          {tenantsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton variant="rect" width={40} height={40} />
                  <div className="flex-1">
                    <Skeleton width="60%" height={14} />
                    <Skeleton width="30%" height={10} className="mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {tenants?.data?.data?.slice(0, 5).map((tenant: any) => (
                <div key={tenant.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center">
                      <BuildingOfficeIcon className="h-4.5 w-4.5 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.plan}</p>
                    </div>
                  </div>
                  <Badge
                    variant={tenant.status === 'ACTIVE' ? 'success' : tenant.status === 'TRIAL' ? 'warning' : 'default'}
                    dot
                  >
                    {tenant.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Health */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-2.5">
            {healthServices.length > 0 ? healthServices.map((service) => (
              <div key={service.name} className={`flex items-center justify-between p-2.5 rounded-lg ${
                service.status === 'healthy' ? 'bg-green-50/50' : 'bg-red-50/50'
              }`}>
                <div className="flex items-center gap-2.5">
                  {service.status === 'healthy' ? (
                    <CheckCircleIcon className="h-4.5 w-4.5 text-green-500" />
                  ) : (
                    <ExclamationTriangleIcon className="h-4.5 w-4.5 text-red-500" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                </div>
                <Badge variant={service.status === 'healthy' ? 'success' : 'danger'} size="sm">
                  {service.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                </Badge>
              </div>
            )) : (
              <p className="text-sm text-gray-400">Loading health data...</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Uptime</span>
              <span className="text-sm font-semibold text-gray-900">
                {systemMetrics?.uptime
                  ? `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Overall Status</span>
              <Badge variant={systemMetrics?.healthStatus === 'healthy' ? 'success' : 'warning'} size="sm">
                {systemMetrics?.healthStatus || 'Unknown'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {auditLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton variant="circle" width={32} height={32} />
                  <div className="flex-1">
                    <Skeleton width="50%" height={14} />
                    <Skeleton width="30%" height={10} className="mt-2" />
                  </div>
                  <Skeleton width={80} height={12} />
                </div>
              ))}
            </div>
          ) : (
            auditLogs?.data?.data?.map((log: any) => (
              <div key={log.id} className="px-6 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <ClockIcon className="h-4 w-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {log.userEmail} <span className="text-gray-400">-</span>{' '}
                        <Badge
                          variant={
                            log.action?.includes('CREATE') || log.action?.includes('ADD') ? 'success'
                              : log.action?.includes('DELETE') || log.action?.includes('REMOVE') ? 'danger'
                              : log.action?.includes('LOGIN') ? 'primary'
                              : 'info'
                          }
                          size="sm"
                        >
                          {log.action}
                        </Badge>
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {log.resource} {log.resourceId && `(${log.resourceId.slice(0, 8)}...)`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
