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
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => systemApi.getMetrics(),
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ['recent-tenants'],
    queryFn: () => tenantsApi.list({ limit: 5 }),
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['recent-audit'],
    queryFn: () => auditApi.list({ limit: 10 }),
  });

  const systemMetrics = metrics?.data;

  const userGrowthData = [
    { month: 'Jan', users: 1200 },
    { month: 'Feb', users: 1450 },
    { month: 'Mar', users: 1680 },
    { month: 'Apr', users: 1890 },
    { month: 'May', users: 2100 },
    { month: 'Jun', users: 2450 },
  ];

  const apiRequestsData = [
    { hour: '00:00', requests: 1200 },
    { hour: '04:00', requests: 800 },
    { hour: '08:00', requests: 2400 },
    { hour: '12:00', requests: 3200 },
    { hour: '16:00', requests: 2800 },
    { hour: '20:00', requests: 1600 },
  ];

  const planDistribution = [
    { name: 'Enterprise', value: 45 },
    { name: 'Professional', value: 120 },
    { name: 'Starter', value: 85 },
    { name: 'Free', value: 150 },
  ];

  const healthServices = [
    { name: 'API Server', status: 'healthy' },
    { name: 'Database', status: 'healthy' },
    { name: 'Redis Cache', status: 'healthy' },
    { name: 'Email Service', status: 'healthy' },
    { name: 'Socket.io', status: 'healthy' },
  ];

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
          <h3 className="text-base font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d946ef" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#d946ef" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="users" stroke="#d946ef" strokeWidth={2} fill="url(#userGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">API Requests (Today)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={apiRequestsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="hour" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Tenant Plans</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {planDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
        </div>

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
            {healthServices.map((service) => (
              <div key={service.name} className="flex items-center justify-between p-2.5 rounded-lg bg-green-50/50">
                <div className="flex items-center gap-2.5">
                  <CheckCircleIcon className="h-4.5 w-4.5 text-green-500" />
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                </div>
                <Badge variant="success" size="sm">Healthy</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Uptime</span>
              <span className="text-sm font-semibold text-gray-900">
                {systemMetrics?.uptime?.toFixed(2) || '99.99'}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Avg Response</span>
              <span className="text-sm font-semibold text-gray-900">
                {systemMetrics?.avgResponseTime || 45}ms
              </span>
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
