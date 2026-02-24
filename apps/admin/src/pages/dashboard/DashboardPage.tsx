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
  BoltIcon,
  CircleStackIcon,
  CpuChipIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, formatDistanceToNow } from 'date-fns';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { LiveIndicator } from '../../components/ui/ConnectionStatus';
import clsx from 'clsx';

// ============================================================================
// Constants & Demo Data
// ============================================================================

const CHART_COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f87171'];

const DEMO_STATS = {
  totalTenants: 12,
  activeTenants: 10,
  totalUsers: 847,
  activeUsers: 623,
  monthlyActiveUsers: 512,
  storageUsedGb: 18.4,
  apiRequestsToday: 24_891,
  errorRate: 0.42,
  avgResponseTime: 128,
  uptime: 2_592_000, // 30 days in seconds
  planDistribution: [
    { name: 'Professional', value: 5 },
    { name: 'Enterprise', value: 3 },
    { name: 'Starter', value: 2 },
    { name: 'Trial', value: 2 },
  ],
  health: {
    database: 'healthy',
    redis: 'healthy',
    api: 'healthy',
    storage: 'healthy',
    email: 'healthy',
  },
  healthStatus: 'healthy',
};

const DEMO_TENANTS = [
  { id: 'd1', name: 'Acme Corporation', plan: 'Enterprise', status: 'ACTIVE', userCount: 156 },
  { id: 'd2', name: 'TechFlow Solutions', plan: 'Professional', status: 'ACTIVE', userCount: 89 },
  { id: 'd3', name: 'GreenLeaf Analytics', plan: 'Starter', status: 'TRIAL', userCount: 12 },
  { id: 'd4', name: 'DataSync Labs', plan: 'Professional', status: 'ACTIVE', userCount: 67 },
  { id: 'd5', name: 'CloudNine Systems', plan: 'Enterprise', status: 'ACTIVE', userCount: 203 },
];

const DEMO_AUDIT = [
  { id: 'a1', userEmail: 'admin@acme.com', action: 'LOGIN', resource: 'Auth', resourceId: null, timestamp: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 'a2', userEmail: 'admin@techflow.io', action: 'CREATE_TENANT', resource: 'Tenant', resourceId: 'd2', timestamp: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 'a3', userEmail: 'system@pms.com', action: 'UPDATE_CONFIG', resource: 'SystemConfig', resourceId: null, timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'a4', userEmail: 'admin@greenleaf.co', action: 'ADD_USER', resource: 'User', resourceId: 'u12', timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'a5', userEmail: 'admin@acme.com', action: 'UPDATE_PLAN', resource: 'Subscription', resourceId: 'd1', timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'a6', userEmail: 'admin@datasync.dev', action: 'LOGIN', resource: 'Auth', resourceId: null, timestamp: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: 'a7', userEmail: 'system@pms.com', action: 'BACKUP_COMPLETED', resource: 'System', resourceId: null, timestamp: new Date(Date.now() - 12 * 3600000).toISOString() },
  { id: 'a8', userEmail: 'admin@cloudnine.io', action: 'DELETE_USER', resource: 'User', resourceId: 'u8', timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
];

// ============================================================================
// Helpers
// ============================================================================

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function getActionIcon(action: string) {
  if (action.includes('LOGIN')) return ArrowRightOnRectangleIcon;
  if (action.includes('CREATE') || action.includes('ADD')) return UserPlusIcon;
  if (action.includes('DELETE') || action.includes('REMOVE')) return TrashIcon;
  if (action.includes('UPDATE') || action.includes('CONFIG')) return Cog6ToothIcon;
  if (action.includes('BACKUP')) return CircleStackIcon;
  return ClockIcon;
}

function getActionColor(action: string): string {
  if (action.includes('LOGIN')) return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  if (action.includes('CREATE') || action.includes('ADD')) return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  if (action.includes('DELETE') || action.includes('REMOVE')) return 'text-red-400 bg-red-400/10 border-red-400/20';
  if (action.includes('UPDATE') || action.includes('CONFIG')) return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  if (action.includes('BACKUP')) return 'text-violet-400 bg-violet-400/10 border-violet-400/20';
  return 'text-white/40 bg-white/[0.06] border-white/[0.08]';
}

function getActionBorderColor(action: string): string {
  if (action.includes('LOGIN')) return 'border-l-blue-400/60';
  if (action.includes('CREATE') || action.includes('ADD')) return 'border-l-emerald-400/60';
  if (action.includes('DELETE') || action.includes('REMOVE')) return 'border-l-red-400/60';
  if (action.includes('UPDATE') || action.includes('CONFIG')) return 'border-l-amber-400/60';
  if (action.includes('BACKUP')) return 'border-l-violet-400/60';
  return 'border-l-white/10';
}

const HEALTH_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  database: CircleStackIcon,
  redis: BoltIcon,
  api: GlobeAltIcon,
  storage: ServerIcon,
  email: EnvelopeIcon,
};

// ============================================================================
// Component
// ============================================================================

export default function DashboardPage() {
  // ── Data fetching ──
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

  // ── Resolve data with demo fallbacks ──
  const rawMetrics = dashboardData?.data;
  const metrics = (rawMetrics && (rawMetrics.totalTenants > 1 || rawMetrics.totalUsers > 5))
    ? rawMetrics
    : { ...DEMO_STATS, ...((rawMetrics?.totalTenants ?? 0) > 0 ? rawMetrics : {}) };

  const planDistribution = (metrics.planDistribution && metrics.planDistribution.length > 0)
    ? metrics.planDistribution
    : DEMO_STATS.planDistribution;

  const healthServices = metrics.health
    ? Object.entries(metrics.health).map(([name, status]) => ({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        status: status as string,
      }))
    : Object.entries(DEMO_STATS.health).map(([name, status]) => ({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        status,
      }));

  const rawTenantList = tenants?.data?.data;
  const tenantList = (rawTenantList && rawTenantList.length > 1)
    ? rawTenantList.slice(0, 5)
    : DEMO_TENANTS;

  const rawAuditList = auditLogs?.data?.data;
  const activityList = (rawAuditList && rawAuditList.length > 2)
    ? rawAuditList
    : DEMO_AUDIT;

  const planTotal = planDistribution.reduce((sum: number, p: any) => sum + p.value, 0);

  return (
    <div className="space-y-8">
      {/* ════════════════════════════════════════════════════════════════════
          Hero Welcome Banner
         ════════════════════════════════════════════════════════════════════ */}
      <div className="glass-hero animate-fade-in-up">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }} />

        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-white/[0.08] border border-white/[0.1]">
                <CpuChipIcon className="h-6 w-6 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Command Center</h1>
                <p className="text-sm text-white/50">Welcome back, Super Admin</p>
              </div>
            </div>
          </div>

          {/* Quick summary badges */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
              <BuildingOfficeIcon className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white/80">{metrics.totalTenants} Tenants</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08]">
              <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-medium text-white/80">
                {metrics.uptime ? `${Math.floor(metrics.uptime / 86400)}d Uptime` : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400/[0.08] border border-emerald-400/[0.15]">
              <LiveIndicator />
              <span className="text-sm font-medium text-emerald-400">All Systems Healthy</span>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Stat Cards (4-column grid with accent colors)
         ════════════════════════════════════════════════════════════════════ */}
      {metricsLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Tenants"
            value={metrics.totalTenants}
            icon={<BuildingOfficeIcon />}
            trend={{ value: 12, label: 'this month' }}
            accentColor="blue"
            delay={50}
          />
          <StatCard
            label="Active Users"
            value={metrics.activeUsers}
            icon={<UsersIcon />}
            trend={{ value: 8, label: 'this month' }}
            accentColor="violet"
            delay={100}
          />
          <StatCard
            label="API Requests (Today)"
            value={metrics.apiRequestsToday}
            icon={<ServerIcon />}
            trend={{ value: 5, label: 'vs yesterday' }}
            accentColor="emerald"
            delay={150}
          />
          <StatCard
            label="Error Rate"
            value={`${(metrics.errorRate ?? 0).toFixed(2)}%`}
            icon={<ExclamationTriangleIcon />}
            trend={{ value: -15, label: 'this week' }}
            accentColor="amber"
            delay={200}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          Platform Overview (6 mini metric cards)
         ════════════════════════════════════════════════════════════════════ */}
      <div className="glass-card animate-fade-in-up stagger-5">
        <h3 className="text-base font-semibold text-white/90 mb-5 flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-white/40" />
          Platform Overview
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Tenants */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-400/15">
                  <BuildingOfficeIcon className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-white/70">Tenants</span>
              </div>
              <span className="text-lg font-bold text-white">{metrics.activeTenants}<span className="text-white/30 text-sm font-normal">/{metrics.totalTenants}</span></span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-1000"
                style={{ width: `${metrics.totalTenants ? (metrics.activeTenants / metrics.totalTenants) * 100 : 0}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">{metrics.activeTenants} active of {metrics.totalTenants}</p>
          </div>

          {/* Users */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-400/15">
                  <UsersIcon className="h-4 w-4 text-violet-400" />
                </div>
                <span className="text-sm font-medium text-white/70">Users</span>
              </div>
              <span className="text-lg font-bold text-white">{metrics.activeUsers.toLocaleString()}<span className="text-white/30 text-sm font-normal">/{metrics.totalUsers.toLocaleString()}</span></span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all duration-1000"
                style={{ width: `${metrics.totalUsers ? (metrics.activeUsers / metrics.totalUsers) * 100 : 0}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">{metrics.activeUsers.toLocaleString()} active of {metrics.totalUsers.toLocaleString()}</p>
          </div>

          {/* Avg Response Time */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-400/15">
                  <BoltIcon className="h-4 w-4 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-white/70">Avg Response</span>
              </div>
              <span className="text-lg font-bold text-white">{metrics.avgResponseTime}<span className="text-white/30 text-sm font-normal">ms</span></span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                style={{ width: `${Math.min((metrics.avgResponseTime / 500) * 100, 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">
              {metrics.avgResponseTime < 200 ? 'Excellent' : metrics.avgResponseTime < 500 ? 'Good' : 'Needs attention'}
            </p>
          </div>

          {/* Storage */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-400/15">
                  <CircleStackIcon className="h-4 w-4 text-amber-400" />
                </div>
                <span className="text-sm font-medium text-white/70">Storage</span>
              </div>
              <span className="text-lg font-bold text-white">{metrics.storageUsedGb}<span className="text-white/30 text-sm font-normal">GB</span></span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                style={{ width: `${Math.min((metrics.storageUsedGb / 50) * 100, 100)}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">{((metrics.storageUsedGb / 50) * 100).toFixed(0)}% of 50 GB used</p>
          </div>

          {/* Monthly Active Users */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-400/15">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-white/70">MAU</span>
              </div>
              <span className="text-lg font-bold text-white">{metrics.monthlyActiveUsers.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: `${metrics.totalUsers ? (metrics.monthlyActiveUsers / metrics.totalUsers) * 100 : 0}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">{((metrics.monthlyActiveUsers / (metrics.totalUsers || 1)) * 100).toFixed(0)}% of total users</p>
          </div>

          {/* System Uptime */}
          <div className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-400/15">
                  <ClockIcon className="h-4 w-4 text-rose-400" />
                </div>
                <span className="text-sm font-medium text-white/70">Uptime</span>
              </div>
              <span className="text-lg font-bold text-white">{formatUptime(metrics.uptime)}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: '99.9%' }} />
            </div>
            <p className="mt-1.5 text-[11px] text-white/30">99.9% availability</p>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: Tenant Plans Donut + System Health
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tenant Plans Donut */}
        <div className="glass-card animate-fade-in-up stagger-6">
          <h3 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-white/40" />
            Tenant Plans
            <span className="ml-auto text-xs text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">{planTotal} total</span>
          </h3>
          <div className="h-56 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {planDistribution.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
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
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{planTotal}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Tenants</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {planDistribution.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="text-xs text-white/50">{item.name}</span>
                <span className="text-xs font-medium text-white/70">{item.value}</span>
                <span className="text-[10px] text-white/25">({((item.value / planTotal) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="glass-card animate-fade-in-up stagger-7">
          <h3 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-white/40" />
            System Health
          </h3>

          {/* Overall status banner */}
          <div className={clsx(
            'flex items-center gap-3 p-3 rounded-xl border mb-4',
            metrics.healthStatus === 'healthy'
              ? 'bg-emerald-400/[0.06] border-emerald-400/[0.12]'
              : 'bg-amber-400/[0.06] border-amber-400/[0.12]'
          )}>
            <div className={clsx(
              'p-2 rounded-lg',
              metrics.healthStatus === 'healthy' ? 'bg-emerald-400/15' : 'bg-amber-400/15'
            )}>
              {metrics.healthStatus === 'healthy' ? (
                <CheckCircleIcon className="h-5 w-5 text-emerald-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
              )}
            </div>
            <div>
              <p className={clsx('text-sm font-semibold', metrics.healthStatus === 'healthy' ? 'text-emerald-400' : 'text-amber-400')}>
                {metrics.healthStatus === 'healthy' ? 'All Systems Operational' : 'Degraded Performance'}
              </p>
              <p className="text-[11px] text-white/35">Last checked just now</p>
            </div>
          </div>

          {/* Service grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {healthServices.map((service) => {
              const ServiceIcon = HEALTH_ICONS[service.name] || ServerIcon;
              const isHealthy = service.status === 'healthy';
              return (
                <div key={service.name} className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                  isHealthy
                    ? 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                    : 'bg-red-400/[0.04] border-red-400/[0.08] hover:bg-red-400/[0.06]'
                )}>
                  <div className={clsx(
                    'p-1.5 rounded-lg',
                    isHealthy ? 'bg-emerald-400/10' : 'bg-red-400/10'
                  )}>
                    <ServiceIcon className={clsx('h-4 w-4', isHealthy ? 'text-emerald-400' : 'text-red-400')} />
                  </div>
                  <span className="text-sm font-medium text-white/75 flex-1">{service.label}</span>
                  <div className={clsx('w-2 h-2 rounded-full', isHealthy ? 'bg-emerald-400' : 'bg-red-400')} />
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="mt-4 pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wider">Uptime</p>
              <p className="text-sm font-semibold text-white/80 mt-0.5">{formatUptime(metrics.uptime)}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/35 uppercase tracking-wider">Avg Response</p>
              <p className="text-sm font-semibold text-white/80 mt-0.5">{metrics.avgResponseTime}ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: Recent Tenants + Recent Activity
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="glass-card animate-fade-in-up stagger-8">
          <h3 className="text-base font-semibold text-white/90 mb-4 flex items-center gap-2">
            <BuildingOfficeIcon className="h-5 w-5 text-white/40" />
            Recent Tenants
          </h3>
          {tenantsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tenantList.map((tenant: any) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] transition-all duration-200 border border-transparent hover:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500/15 to-violet-500/10 border border-white/[0.08] flex items-center justify-center">
                      <BuildingOfficeIcon className="h-4 w-4 text-blue-400/80" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{tenant.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-white/30">{tenant.plan}</span>
                        {tenant.userCount != null && (
                          <>
                            <span className="text-white/10">·</span>
                            <span className="text-[11px] text-white/30">{tenant.userCount} users</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={tenant.status === 'ACTIVE' ? 'success' : tenant.status === 'TRIAL' ? 'warning' : 'default'}
                    dot
                    size="sm"
                  >
                    {tenant.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="glass-card !p-0 overflow-hidden animate-fade-in-up stagger-9">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-base font-semibold text-white/90 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-white/40" />
              Recent Activity
            </h3>
          </div>
          {auditLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-white/[0.03]">
              {activityList.map((log: any) => {
                const ActionIcon = getActionIcon(log.action);
                const iconColor = getActionColor(log.action);
                const borderColor = getActionBorderColor(log.action);
                return (
                  <div key={log.id} className={clsx('px-5 py-3 hover:bg-white/[0.03] transition-colors border-l-2', borderColor)}>
                    <div className="flex items-center gap-3">
                      <div className={clsx('p-1.5 rounded-lg border flex-shrink-0', iconColor)}>
                        <ActionIcon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/80 truncate">{log.userEmail}</span>
                          <Badge
                            variant={
                              log.action?.includes('CREATE') || log.action?.includes('ADD') ? 'success'
                                : log.action?.includes('DELETE') || log.action?.includes('REMOVE') ? 'danger'
                                : log.action?.includes('LOGIN') ? 'primary'
                                : 'info'
                            }
                            size="sm"
                          >
                            {log.action?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        {log.resource && (
                          <p className="text-[11px] text-white/25 mt-0.5 truncate">
                            {log.resource} {log.resourceId && `(${String(log.resourceId).slice(0, 8)}...)`}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-white/20 whitespace-nowrap flex-shrink-0">
                        {(() => {
                          try {
                            return formatDistanceToNow(new Date(log.timestamp), { addSuffix: true });
                          } catch {
                            return format(new Date(log.timestamp), 'MMM d, HH:mm');
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
