import { useQuery } from '@tanstack/react-query';
import { systemApi, tenantsApi, auditApi } from '../../lib/api';
import {
  BuildingOfficeIcon,
  UsersIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton, SkeletonCard } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { LiveIndicator } from '../../components/ui/ConnectionStatus';

const COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f87171'];

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
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="mt-1 text-sm text-white/40">Real-time system overview & key metrics</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1.5">
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
            delay={50}
          />
          <StatCard
            label="Active Users"
            value={systemMetrics?.activeUsers?.toLocaleString() || '0'}
            icon={<UsersIcon />}
            trend={{ value: 8, label: 'this month' }}
            delay={100}
          />
          <StatCard
            label="API Requests (Today)"
            value={systemMetrics?.apiRequestsToday?.toLocaleString() || '0'}
            icon={<ServerIcon />}
            trend={{ value: -3, label: 'vs yesterday' }}
            delay={150}
          />
          <StatCard
            label="Error Rate"
            value={`${systemMetrics?.errorRate?.toFixed(2) || '0'}%`}
            icon={<ExclamationTriangleIcon />}
            trend={{ value: -15, label: 'this week' }}
            delay={200}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Summary */}
        <div className="glass-card animate-fade-in-up stagger-5">
          <h3 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-white/40" />
            Platform Summary
          </h3>
          <div className="h-64 flex flex-col justify-center space-y-4">
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Total Tenants</p>
                <p className="text-2xl font-bold text-white mt-0.5">{systemMetrics?.totalTenants ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40">Active</p>
                <p className="text-lg font-semibold text-emerald-400">{systemMetrics?.activeTenants ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">Total Users</p>
                <p className="text-2xl font-bold text-white mt-0.5">{systemMetrics?.totalUsers?.toLocaleString() ?? 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40">Active</p>
                <p className="text-lg font-semibold text-emerald-400">{systemMetrics?.activeUsers?.toLocaleString() ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] transition-colors">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wider">System Uptime</p>
                <p className="text-2xl font-bold text-white mt-0.5">
                  {systemMetrics?.uptime ? `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m` : 'N/A'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40">Status</p>
                <Badge variant={systemMetrics?.healthStatus === 'healthy' ? 'success' : 'warning'}>
                  {systemMetrics?.healthStatus || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Tenant Plans */}
        <div className="glass-card animate-fade-in-up stagger-6">
          <h3 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-white/40" />
            Tenant Plans
            <span className="ml-auto text-xs text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">Live</span>
          </h3>
          {planDistribution.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {planDistribution.map((_: any, index: number) => (
                        <Cell key={`cell-chart-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(15, 20, 35, 0.95)',
                        color: 'white',
                        boxShadow: '0 16px 40px -8px rgba(0,0,0,0.5)',
                      }}
                      itemStyle={{ color: 'rgba(255,255,255,0.8)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                {planDistribution.map((item: any, index: number) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-xs text-white/50">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-white/30 text-sm">
              No tenant data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="glass-card animate-fade-in-up stagger-7">
          <h3 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-white/40" />
            Recent Tenants
          </h3>
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
            <div className="space-y-2">
              {tenants?.data?.data?.slice(0, 5).map((tenant: any) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 border border-transparent hover:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                      <BuildingOfficeIcon className="h-4 w-4 text-white/50" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{tenant.name}</p>
                      <p className="text-xs text-white/35">{tenant.plan}</p>
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
        <div className="glass-card animate-fade-in-up stagger-8">
          <h3 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <ServerIcon className="h-5 w-5 text-white/40" />
            System Health
          </h3>
          <div className="space-y-2">
            {healthServices.length > 0 ? healthServices.map((service) => (
              <div key={service.name} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                service.status === 'healthy'
                  ? 'bg-emerald-400/[0.04] border-emerald-400/[0.08] hover:bg-emerald-400/[0.06]'
                  : 'bg-red-400/[0.04] border-red-400/[0.08] hover:bg-red-400/[0.06]'
              }`}>
                <div className="flex items-center gap-2.5">
                  {service.status === 'healthy' ? (
                    <CheckCircleIcon className="h-4.5 w-4.5 text-emerald-400" />
                  ) : (
                    <ExclamationTriangleIcon className="h-4.5 w-4.5 text-red-400" />
                  )}
                  <span className="text-sm font-medium text-white/80">{service.name}</span>
                </div>
                <Badge variant={service.status === 'healthy' ? 'success' : 'danger'} size="sm">
                  {service.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
                </Badge>
              </div>
            )) : (
              <p className="text-sm text-white/30">Loading health data...</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Uptime</span>
              <span className="text-sm font-semibold text-white/80">
                {systemMetrics?.uptime
                  ? `${Math.floor(systemMetrics.uptime / 3600)}h ${Math.floor((systemMetrics.uptime % 3600) / 60)}m`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/40">Overall Status</span>
              <Badge variant={systemMetrics?.healthStatus === 'healthy' ? 'success' : 'warning'} size="sm">
                {systemMetrics?.healthStatus || 'Unknown'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card !p-0 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.45s' }}>
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-semibold text-white/90 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-white/40" />
            Recent Activity
          </h3>
        </div>
        <div className="divide-y divide-white/[0.04]">
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
              <div key={log.id} className="px-6 py-3.5 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.06] border border-white/[0.06] flex items-center justify-center">
                      <ClockIcon className="h-4 w-4 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/80">
                        {log.userEmail} <span className="text-white/20">-</span>{' '}
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
                      <p className="text-xs text-white/30 mt-0.5">
                        {log.resource} {log.resourceId && `(${log.resourceId.slice(0, 8)}...)`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-white/25 whitespace-nowrap">
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
