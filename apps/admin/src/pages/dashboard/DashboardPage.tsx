import { useQuery } from '@tanstack/react-query';
import { systemApi, tenantsApi, auditApi } from '../../lib/api';
import {
  BuildingOfficeIcon,
  UsersIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import clsx from 'clsx';
import { format } from 'date-fns';

const COLORS = ['#d946ef', '#22c55e', '#f59e0b', '#3b82f6', '#ef4444'];

export default function DashboardPage() {
  const { data: metrics } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => systemApi.getMetrics(),
  });

  const { data: tenants } = useQuery({
    queryKey: ['recent-tenants'],
    queryFn: () => tenantsApi.list({ limit: 5 }),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['recent-audit'],
    queryFn: () => auditApi.list({ limit: 10 }),
  });

  const systemMetrics = metrics?.data;

  // Mock data for charts
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

  const stats = [
    {
      name: 'Total Tenants',
      value: systemMetrics?.totalTenants || 0,
      change: '+12%',
      trend: 'up',
      icon: BuildingOfficeIcon,
      color: 'bg-primary-500',
    },
    {
      name: 'Active Users',
      value: systemMetrics?.activeUsers?.toLocaleString() || '0',
      change: '+8%',
      trend: 'up',
      icon: UsersIcon,
      color: 'bg-success-500',
    },
    {
      name: 'API Requests (Today)',
      value: systemMetrics?.apiRequestsToday?.toLocaleString() || '0',
      change: '-3%',
      trend: 'down',
      icon: ServerIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Error Rate',
      value: `${systemMetrics?.errorRate?.toFixed(2) || '0'}%`,
      change: '-15%',
      trend: 'down',
      icon: ExclamationTriangleIcon,
      color: systemMetrics?.errorRate && systemMetrics.errorRate > 1 ? 'bg-danger-500' : 'bg-success-500',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          System overview and key metrics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center">
              <div className={clsx('p-3 rounded-lg', stat.color)}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                <div className="flex items-baseline">
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  <span
                    className={clsx(
                      'ml-2 text-sm font-medium flex items-center',
                      stat.trend === 'up' ? 'text-success-600' : 'text-danger-600'
                    )}
                  >
                    {stat.trend === 'up' ? (
                      <ArrowTrendingUpIcon className="h-4 w-4 mr-0.5" />
                    ) : (
                      <ArrowTrendingDownIcon className="h-4 w-4 mr-0.5" />
                    )}
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#d946ef"
                  fill="#d946ef"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* API Requests */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">API Requests (Today)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={apiRequestsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Plans</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-4">
            {planDistribution.map((item, index) => (
              <div key={item.name} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-600">
                  {item.name} ({item.value})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Tenants */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Tenants</h3>
          <div className="space-y-4">
            {tenants?.data.data.slice(0, 5).map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{tenant.name}</p>
                    <p className="text-xs text-gray-500">{tenant.plan}</p>
                  </div>
                </div>
                <span
                  className={clsx(
                    'badge',
                    tenant.status === 'ACTIVE'
                      ? 'bg-success-100 text-success-700'
                      : tenant.status === 'TRIAL'
                      ? 'bg-warning-100 text-warning-700'
                      : 'bg-gray-100 text-gray-700'
                  )}
                >
                  {tenant.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-success-500 rounded-full mr-3" />
                <span className="text-sm font-medium text-gray-900">API Server</span>
              </div>
              <span className="text-sm text-success-600">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-success-500 rounded-full mr-3" />
                <span className="text-sm font-medium text-gray-900">Database</span>
              </div>
              <span className="text-sm text-success-600">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-success-500 rounded-full mr-3" />
                <span className="text-sm font-medium text-gray-900">Redis Cache</span>
              </div>
              <span className="text-sm text-success-600">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-success-500 rounded-full mr-3" />
                <span className="text-sm font-medium text-gray-900">Email Service</span>
              </div>
              <span className="text-sm text-success-600">Healthy</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Uptime</span>
                <span className="text-sm font-medium text-gray-900">
                  {systemMetrics?.uptime?.toFixed(2) || '99.99'}%
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm text-gray-500">Avg Response</span>
                <span className="text-sm font-medium text-gray-900">
                  {systemMetrics?.avgResponseTime || 45}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {auditLogs?.data.data.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <ClockIcon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {log.userEmail} - {log.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {log.resource} {log.resourceId && `(${log.resourceId})`}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
