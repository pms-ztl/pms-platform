import { useQuery } from '@tanstack/react-query';
import {
  BuildingOffice2Icon,
  UsersIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ServerStackIcon,
  SignalIcon,
  CircleStackIcon,
  EnvelopeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

import { superAdminSystemApi, type SADashboardStats } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  bgColor: string;
  iconColor: string;
  subtitle?: string;
}

type ServiceStatus = 'healthy' | 'degraded' | 'down' | string;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(uptimePercent: number | undefined | null): string {
  if (uptimePercent == null) return '0.00%';
  return `${uptimePercent.toFixed(2)}%`;
}

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${((n ?? 0) / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${((n ?? 0) / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function serviceStatusIcon(status: ServiceStatus) {
  switch (status) {
    case 'healthy':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'degraded':
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    case 'down':
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    default:
      return <ExclamationTriangleIcon className="h-5 w-5 text-secondary-400" />;
  }
}

function serviceStatusBadge(status: ServiceStatus) {
  const base = 'text-xs font-medium px-2.5 py-0.5 rounded-full capitalize';
  switch (status) {
    case 'healthy':
      return `${base} bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400`;
    case 'degraded':
      return `${base} bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400`;
    case 'down':
      return `${base} bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400`;
    default:
      return `${base} bg-secondary-50 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-400`;
  }
}

const SERVICE_ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  api: ServerStackIcon,
  database: CircleStackIcon,
  redis: BoltIcon,
  email: EnvelopeIcon,
  queue: SignalIcon,
};

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300',
  STARTER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PROFESSIONAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  ENTERPRISE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// ---------------------------------------------------------------------------
// Skeleton Loader
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-56 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse" />
        <div className="h-4 w-80 bg-secondary-200 dark:bg-secondary-700 rounded animate-pulse mt-2" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="sa-glass-card bg-white/75 dark:bg-secondary-900/55 rounded-xl border border-white/50 dark:border-white/10 p-6"
          >
            <div className="animate-pulse space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-secondary-200 dark:bg-secondary-700 rounded-lg" />
                <div className="h-4 w-24 bg-secondary-200 dark:bg-secondary-700 rounded" />
              </div>
              <div className="h-8 w-20 bg-secondary-200 dark:bg-secondary-700 rounded" />
              <div className="h-3 w-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom sections skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="sa-glass-card bg-white/75 dark:bg-secondary-900/55 rounded-xl border border-white/50 dark:border-white/10 p-6"
          >
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-40 bg-secondary-200 dark:bg-secondary-700 rounded" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" />
      <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">
        Failed to Load Dashboard
      </h2>
      <p className="text-secondary-500 dark:text-secondary-400 mt-2 max-w-md">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
      >
        <ArrowPathIcon className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SADashboardPage() {
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SADashboardStats>({
    queryKey: ['sa-dashboard-stats'],
    queryFn: () => superAdminSystemApi.getDashboardStats(),
    refetchInterval: 60_000, // auto-refresh every 60s
    staleTime: 30_000,
  });

  // ── Loading ──
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // ── Error ──
  if (isError || !stats) {
    return (
      <DashboardError
        message={(error as Error)?.message || 'An unexpected error occurred while fetching dashboard data.'}
        onRetry={() => refetch()}
      />
    );
  }

  // ── Safe accessors (defence against partial API responses) ──
  const totalTenants = stats.totalTenants ?? 0;
  const activeTenants = stats.activeTenants ?? 0;
  const activeUsers = stats.activeUsers ?? 0;
  const totalUsers = stats.totalUsers ?? 0;
  const apiRequestsToday = stats.apiRequestsToday ?? 0;
  const errorRate = stats.errorRate ?? 0;
  const uptime = stats.uptime ?? 0;
  const healthStatus = stats.healthStatus ?? 'unknown';
  const monthlyActiveUsers = stats.monthlyActiveUsers ?? 0;

  // ── Stat cards configuration ──
  const statCards: StatCard[] = [
    {
      label: 'Total Tenants',
      value: totalTenants,
      icon: BuildingOffice2Icon,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      subtitle: `${activeTenants} active`,
    },
    {
      label: 'Active Users',
      value: formatNumber(activeUsers),
      icon: UsersIcon,
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      iconColor: 'text-green-600 dark:text-green-400',
      subtitle: `${formatNumber(totalUsers)} total`,
    },
    {
      label: 'API Requests Today',
      value: formatNumber(apiRequestsToday),
      icon: BoltIcon,
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      iconColor: 'text-purple-600 dark:text-purple-400',
      subtitle: `${(errorRate ?? 0).toFixed(2)}% error rate`,
    },
    {
      label: 'System Uptime',
      value: formatUptime(uptime),
      icon: ClockIcon,
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      subtitle: healthStatus === 'healthy' ? 'All systems operational' : `Status: ${healthStatus}`,
    },
  ];

  // ── Health services ──
  const healthEntries = stats.health ? Object.entries(stats.health) : [];

  // ── Plan distribution ──
  const planDistribution = stats.planDistribution ?? [];
  const totalTenantsByPlan = planDistribution.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            System Dashboard
          </h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Platform-wide overview and system health monitoring
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Overall health banner */}
      {healthStatus !== 'healthy' && (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300">
          <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">System Health Degraded</p>
            <p className="text-sm opacity-80">
              One or more services are experiencing issues. Check the System Health section below for details.
            </p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="sa-glass-card bg-white/75 dark:bg-secondary-900/55 rounded-xl border border-white/50 dark:border-white/10 p-6 hover:shadow-lg hover:bg-white/85 dark:hover:bg-secondary-900/65 transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 ${card.iconColor}`} />
                </div>
                <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  {card.label}
                </span>
              </div>
              <p className="text-3xl font-bold text-secondary-900 dark:text-white">
                {card.value}
              </p>
              {card.subtitle && (
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-2">
                  {card.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom grid: Plan Distribution | System Health | Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Distribution by Plan */}
        <div className="sa-glass-card bg-white/75 dark:bg-secondary-900/55 rounded-xl border border-white/50 dark:border-white/10">
          <div className="px-6 py-4 border-b border-secondary-200/50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-secondary-500" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Tenant Distribution by Plan
              </h2>
            </div>
          </div>
          <div className="p-6">
            {planDistribution.length > 0 ? (
              <div className="space-y-4">
                {planDistribution.map((plan) => {
                  const pct = totalTenantsByPlan > 0
                    ? (((plan.value ?? 0) / totalTenantsByPlan) * 100).toFixed(1)
                    : '0';
                  const colorClass = PLAN_COLORS[plan.name.toUpperCase()] ?? PLAN_COLORS.FREE;

                  return (
                    <div key={plan.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colorClass}`}>
                          {plan.name}
                        </span>
                        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                          {plan.value} <span className="text-secondary-400 text-xs">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-secondary-100 dark:bg-secondary-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${totalTenantsByPlan > 0 ? (plan.value / totalTenantsByPlan) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-3 mt-3 border-t border-secondary-100 dark:border-secondary-800">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-secondary-500 dark:text-secondary-400">Total</span>
                    <span className="font-semibold text-secondary-900 dark:text-white">
                      {totalTenantsByPlan} tenants
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  No plan distribution data available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="sa-glass-card bg-white/75 dark:bg-secondary-900/55 rounded-xl border border-white/50 dark:border-white/10">
          <div className="px-6 py-4 border-b border-secondary-200/50 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ServerStackIcon className="h-5 w-5 text-secondary-500" />
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  System Health
                </h2>
              </div>
              <span className={serviceStatusBadge(healthStatus)}>
                {healthStatus}
              </span>
            </div>
          </div>
          <div className="p-6">
            {healthEntries.length > 0 ? (
              <div className="space-y-3">
                {healthEntries.map(([service, status]) => {
                  const ServiceIcon = SERVICE_ICON_MAP[service.toLowerCase()] ?? ServerStackIcon;
                  return (
                    <div
                      key={service}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <ServiceIcon className="h-4 w-4 text-secondary-400" />
                        <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 capitalize">
                          {service}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {serviceStatusIcon(status)}
                        <span className={serviceStatusBadge(status)}>
                          {status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <ServerStackIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  No health data available
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="sa-glass-card bg-white/75 dark:bg-secondary-900/55 rounded-xl border border-white/50 dark:border-white/10">
          <div className="px-6 py-4 border-b border-secondary-200/50 dark:border-white/10">
            <div className="flex items-center gap-2">
              <SignalIcon className="h-5 w-5 text-secondary-500" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Recent Activity
              </h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {/* Summary metrics as activity overview */}
              <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <div className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    Monthly Active Users
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {formatNumber(monthlyActiveUsers)} users active this month
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex-shrink-0 h-2 w-2 rounded-full bg-green-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    Active Tenants
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {activeTenants} of {totalTenants} tenants currently active
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <div className="flex-shrink-0 h-2 w-2 rounded-full bg-purple-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    API Activity
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {formatNumber(apiRequestsToday)} requests processed today
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg ${
                errorRate > 1
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-emerald-50 dark:bg-emerald-900/20'
              }`}>
                <div className={`flex-shrink-0 h-2 w-2 rounded-full ${
                  errorRate > 1 ? 'bg-red-500' : 'bg-emerald-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    Error Rate
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {(errorRate ?? 0).toFixed(2)}% of requests resulted in errors
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
