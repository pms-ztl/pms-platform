import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuthStore } from '@/store/auth';
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
  CpuChipIcon,
  ArrowTrendingUpIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  Cog6ToothIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  ShieldExclamationIcon,
  LockClosedIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  ArrowUpCircleIcon,
  NoSymbolIcon,
  EyeIcon,
  CommandLineIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ComputerDesktopIcon,
  InboxIcon,
  ChevronRightIcon,
  FingerPrintIcon,
  AdjustmentsHorizontalIcon,
  RocketLaunchIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
  Legend,
} from 'recharts';
import { formatDistanceToNow, format } from 'date-fns';
import clsx from 'clsx';

import {
  superAdminSystemApi,
  superAdminTenantsApi,
  superAdminUsersApi,
  superAdminAuditApi,
  superAdminBillingApi,
  superAdminSecurityApi,
  type SADashboardStats,
  type SASystemConfig,
} from '@/lib/api';

// ============================================================================
// Demo Data Fallbacks
// ============================================================================

const DEMO_STATS: SADashboardStats & { storageUsedGb: number; avgResponseTime: number } = {
  totalTenants: 12,
  activeTenants: 10,
  totalUsers: 847,
  activeUsers: 623,
  monthlyActiveUsers: 512,
  apiRequestsToday: 24_891,
  errorRate: 0.42,
  uptime: 99.97,
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
  storageUsedGb: 18.4,
  avgResponseTime: 128,
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

const DEMO_REVENUE = {
  total: 84_250,
  byPlan: { Enterprise: 42_000, Professional: 28_500, Starter: 9_750, Trial: 4_000 },
  trend: [52_000, 58_400, 63_100, 69_800, 74_200, 78_900, 84_250],
};

const DEMO_REVENUE_MONTHS = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

const DEMO_THREATS = {
  blocked: 23,
  suspicious: 7,
  recentAttempts: [
    { ip: '203.0.113.42', count: 12, lastAttempt: new Date(Date.now() - 30 * 60000).toISOString() },
    { ip: '198.51.100.15', count: 8, lastAttempt: new Date(Date.now() - 2 * 3600000).toISOString() },
    { ip: '192.0.2.88', count: 5, lastAttempt: new Date(Date.now() - 6 * 3600000).toISOString() },
    { ip: '10.0.0.99', count: 3, lastAttempt: new Date(Date.now() - 12 * 3600000).toISOString() },
  ],
};

const DEMO_CONFIG: SASystemConfig = {
  maintenance: { enabled: false, message: '' },
  features: { signupsEnabled: true, trialDays: 14, defaultPlan: 'STARTER', requireEmailVerification: true },
  email: { provider: 'smtp', fromAddress: 'noreply@pms.com', fromName: 'PMS Platform' },
  security: { maxLoginAttempts: 5, lockoutDuration: 30, passwordMinLength: 8, requireMfaForAdmins: true },
  limits: { maxTenantsPerAccount: 5, maxApiRequestsPerMinute: 100, maxFileUploadSizeMb: 25 },
};

const DEMO_SESSIONS = [
  { id: 's1', userId: 'u1', ip: '192.168.1.42', userAgent: 'Chrome 121 / Windows', createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: 's2', userId: 'u2', ip: '10.0.0.15', userAgent: 'Firefox 123 / macOS', createdAt: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: 's3', userId: 'u3', ip: '172.16.0.88', userAgent: 'Safari 17 / iOS', createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 's4', userId: 'u4', ip: '203.0.113.7', userAgent: 'Edge 121 / Windows', createdAt: new Date(Date.now() - 4 * 3600000).toISOString() },
];

const DEMO_USERS_DISTRIBUTION = [
  { name: 'Active', value: 623, color: '#34d399' },
  { name: 'Inactive', value: 180, color: '#94a3b8' },
  { name: 'Suspended', value: 24, color: '#f87171' },
  { name: 'Pending', value: 20, color: '#fbbf24' },
];

const DEMO_TENANT_USAGE = [
  { name: 'Acme Corp', users: 156, goals: 432, reviews: 89 },
  { name: 'TechFlow', users: 89, goals: 267, reviews: 54 },
  { name: 'CloudNine', users: 203, goals: 589, reviews: 123 },
  { name: 'DataSync', users: 67, goals: 178, reviews: 32 },
  { name: 'GreenLeaf', users: 12, goals: 24, reviews: 6 },
];

const CHART_COLORS = ['#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#f87171'];
const REVENUE_COLORS: Record<string, string> = {
  Enterprise: '#a78bfa',
  Professional: '#60a5fa',
  Starter: '#34d399',
  Trial: '#fbbf24',
};

// ============================================================================
// Helpers
// ============================================================================

type ServiceStatus = 'healthy' | 'degraded' | 'down' | string;

function formatNumber(n: number | undefined | null): string {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

function formatUptime(uptime: number | undefined | null): string {
  if (uptime == null || uptime === 0) return 'N/A';
  // If value is > 100, it's in seconds — convert to human-readable
  if (uptime > 100) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    if (days > 0) return `${days}d ${hours}h`;
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  // Otherwise treat as percentage
  return `${uptime.toFixed(2)}%`;
}

function getActionIcon(action: string) {
  if (action.includes('LOGIN')) return ArrowRightOnRectangleIcon;
  if (action.includes('CREATE') || action.includes('ADD')) return UserPlusIcon;
  if (action.includes('DELETE') || action.includes('REMOVE')) return TrashIcon;
  if (action.includes('UPDATE') || action.includes('CONFIG')) return Cog6ToothIcon;
  if (action.includes('BACKUP')) return CircleStackIcon;
  return ClockIcon;
}

function getActionColor(action: string): { bg: string; text: string; border: string } {
  if (action.includes('LOGIN')) return { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-l-blue-500' };
  if (action.includes('CREATE') || action.includes('ADD')) return { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500' };
  if (action.includes('DELETE') || action.includes('REMOVE')) return { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-l-red-500' };
  if (action.includes('UPDATE') || action.includes('CONFIG')) return { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500' };
  if (action.includes('BACKUP')) return { bg: 'bg-violet-100 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-l-violet-500' };
  return { bg: 'bg-gray-100 dark:bg-white/5', text: 'text-gray-500 dark:text-gray-400', border: 'border-l-gray-300 dark:border-l-gray-600' };
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400';
    case 'TRIAL': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400';
    case 'SUSPENDED': return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400';
    default: return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400';
  }
}

function getPlanBadge(plan: string) {
  switch (plan?.toUpperCase()) {
    case 'ENTERPRISE': return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400';
    case 'PROFESSIONAL': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400';
    case 'STARTER': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400';
    default: return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400';
  }
}

const HEALTH_ICONS: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  database: CircleStackIcon,
  redis: BoltIcon,
  api: GlobeAltIcon,
  storage: ServerStackIcon,
  email: EnvelopeIcon,
};

// ============================================================================
// Accent color system for stat cards
// ============================================================================

type AccentColor = 'blue' | 'violet' | 'emerald' | 'amber' | 'rose' | 'cyan';

const ACCENT_STYLES: Record<AccentColor, { iconBg: string; iconText: string; valueBg: string; shimmer: string }> = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-500/15',
    iconText: 'text-blue-600 dark:text-blue-400',
    valueBg: 'text-blue-700 dark:text-blue-300',
    shimmer: 'from-blue-500/0 via-blue-500/25 to-blue-500/0',
  },
  violet: {
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    iconText: 'text-violet-600 dark:text-violet-400',
    valueBg: 'text-violet-700 dark:text-violet-300',
    shimmer: 'from-violet-500/0 via-violet-500/25 to-violet-500/0',
  },
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-500/15',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    valueBg: 'text-emerald-700 dark:text-emerald-300',
    shimmer: 'from-emerald-500/0 via-emerald-500/25 to-emerald-500/0',
  },
  amber: {
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
    iconText: 'text-amber-600 dark:text-amber-400',
    valueBg: 'text-amber-700 dark:text-amber-300',
    shimmer: 'from-amber-500/0 via-amber-500/25 to-amber-500/0',
  },
  rose: {
    iconBg: 'bg-rose-100 dark:bg-rose-500/15',
    iconText: 'text-rose-600 dark:text-rose-400',
    valueBg: 'text-rose-700 dark:text-rose-300',
    shimmer: 'from-rose-500/0 via-rose-500/25 to-rose-500/0',
  },
  cyan: {
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/15',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    valueBg: 'text-cyan-700 dark:text-cyan-300',
    shimmer: 'from-cyan-500/0 via-cyan-500/25 to-cyan-500/0',
  },
};

// ============================================================================
// Custom chart tooltip (glassmorphism)
// ============================================================================

function GlassTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/15 px-3.5 py-2.5 shadow-2xl"
      style={{ background: 'rgba(15, 20, 35, 0.92)', backdropFilter: 'blur(20px)' }}>
      {label && <p className="text-[11px] text-white/50 mb-1.5 font-medium">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-xs text-white/70">{entry.name || entry.dataKey}:</span>
          <span className="text-xs font-semibold text-white">
            {typeof entry.value === 'number' && entry.dataKey?.toLowerCase().includes('revenue')
              ? formatCurrency(entry.value)
              : entry.value?.toLocaleString?.() ?? entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Skeleton Loader
// ============================================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-28 rounded-2xl bg-white/50 dark:bg-white/5 animate-pulse sa-glass-card" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white/50 dark:bg-white/5 animate-pulse sa-glass-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-60 rounded-2xl bg-white/50 dark:bg-white/5 animate-pulse sa-glass-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-72 rounded-2xl bg-white/50 dark:bg-white/5 animate-pulse sa-glass-card" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Error State
// ============================================================================

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Failed to Load Dashboard</h2>
      <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">{message}</p>
      <button onClick={onRetry} className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
        <ArrowPathIcon className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}

// ============================================================================
// Section Card Wrapper
// ============================================================================

function SectionCard({ children, className, delay }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={clsx(
        'sa-glass-card bg-white/70 dark:bg-white/[0.03] rounded-2xl border border-gray-200/60 dark:border-white/[0.06] p-6 animate-fade-in-up',
        className
      )}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, badge }: { icon: React.ComponentType<any>; title: string; badge?: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-900 dark:text-white/90 mb-5 flex items-center gap-2">
      <Icon className="h-5 w-5 text-gray-400 dark:text-white/40" />
      {title}
      {badge && <span className="ml-auto">{badge}</span>}
    </h3>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SADashboardPage() {
  const queryClient = useQueryClient();
  const [cacheClearLoading, setCacheClearLoading] = useState(false);

  // ── Core Data ──
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<SADashboardStats>({
    queryKey: ['sa-dashboard-stats'],
    queryFn: () => superAdminSystemApi.getDashboardStats(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: tenantsResp, isLoading: tenantsLoading } = useQuery({
    queryKey: ['sa-recent-tenants'],
    queryFn: () => superAdminTenantsApi.list({ limit: 5 }),
  });

  const { data: auditResp, isLoading: auditLoading } = useQuery({
    queryKey: ['sa-recent-audit'],
    queryFn: () => superAdminAuditApi.list({ limit: 8 }),
  });

  // ── Revenue Data ──
  const { data: revenueData } = useQuery({
    queryKey: ['sa-revenue'],
    queryFn: () => superAdminBillingApi.getRevenue(),
    staleTime: 120_000,
  });

  // ── Security Data ──
  const { data: threatData } = useQuery({
    queryKey: ['sa-threats'],
    queryFn: () => superAdminSecurityApi.getThreats(),
    staleTime: 60_000,
  });

  // ── System Config ──
  const { data: sysConfig } = useQuery<SASystemConfig>({
    queryKey: ['sa-system-config'],
    queryFn: () => superAdminSystemApi.getConfig(),
    staleTime: 120_000,
  });

  // ── Active Sessions ──
  const { data: sessionsData } = useQuery({
    queryKey: ['sa-active-sessions'],
    queryFn: () => superAdminSecurityApi.getActiveSessions(),
    staleTime: 60_000,
  });

  // ── Upgrade Requests Pending Count ──
  const { data: pendingUpgrades } = useQuery({
    queryKey: ['sa-upgrade-pending'],
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const res = await axios.get('/api/admin/upgrade-requests/pending-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data ?? res.data ?? 0;
    },
    staleTime: 60_000,
  });

  // ── Users list (for status distribution) ──
  const { data: usersResp } = useQuery({
    queryKey: ['sa-users-status'],
    queryFn: () => superAdminUsersApi.list({ limit: 100 }),
    staleTime: 120_000,
  });

  // ── Mutations for RBAC controls ──
  const toggleMaintenance = useMutation({
    mutationFn: (enabled: boolean) =>
      superAdminSystemApi.updateConfig({ maintenance: { enabled, message: enabled ? 'System under maintenance' : '' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sa-system-config'] }),
  });

  const clearCache = useMutation({
    mutationFn: () => {
      setCacheClearLoading(true);
      return superAdminSystemApi.clearCache();
    },
    onSettled: () => {
      setCacheClearLoading(false);
      queryClient.invalidateQueries({ queryKey: ['sa-dashboard-stats'] });
    },
  });

  // ── Loading ──
  if (isLoading) return <DashboardSkeleton />;

  // ── Error ──
  if (isError || !stats) {
    return (
      <DashboardError
        message={(error as Error)?.message || 'An unexpected error occurred while fetching dashboard data.'}
        onRetry={() => refetch()}
      />
    );
  }

  // ── Resolve with demo fallbacks ──
  const useDemoStats = !(stats.totalTenants > 1 || stats.totalUsers > 5);
  const m = useDemoStats ? { ...DEMO_STATS, ...(stats.totalTenants > 0 ? stats : {}) } : { ...DEMO_STATS, ...stats };

  const planDistribution = (m.planDistribution && m.planDistribution.length > 0)
    ? m.planDistribution
    : DEMO_STATS.planDistribution;
  const planTotal = planDistribution.reduce((sum, p) => sum + p.value, 0);

  const healthServices = m.health
    ? Object.entries(m.health).map(([name, status]) => ({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        status: status as ServiceStatus,
      }))
    : Object.entries(DEMO_STATS.health).map(([name, status]) => ({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        status,
      }));

  const rawTenants = (tenantsResp as any)?.data;
  const tenantList = (rawTenants && rawTenants.length > 1) ? rawTenants.slice(0, 5) : DEMO_TENANTS;

  const rawAudit = (auditResp as any)?.data;
  const activityList = (rawAudit && rawAudit.length > 2) ? rawAudit : DEMO_AUDIT;

  // ── Revenue fallback ──
  const revenue = (revenueData as any)?.total > 0 ? (revenueData as any) : DEMO_REVENUE;
  const revenueTrend = (revenue.trend || DEMO_REVENUE.trend).map((val: number, i: number) => ({
    month: DEMO_REVENUE_MONTHS[i] || `M${i + 1}`,
    revenue: val,
  }));
  const revenueByPlan = Object.entries(revenue.byPlan || DEMO_REVENUE.byPlan).map(([name, value]) => ({
    name,
    value: value as number,
    fill: REVENUE_COLORS[name] || '#94a3b8',
  }));

  // ── Security fallback ──
  const threats = (threatData as any)?.blocked != null ? (threatData as any) : DEMO_THREATS;

  // ── Config fallback ──
  const config: SASystemConfig = sysConfig || DEMO_CONFIG;

  // ── Audit breakdown by action type ──
  const auditBreakdown = activityList.reduce((acc: Record<string, number>, log: any) => {
    const action = log.action?.replace(/_/g, ' ') || 'Unknown';
    acc[action] = (acc[action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const auditChartData = Object.entries(auditBreakdown)
    .map(([name, count]) => ({ name, count: count as number }))
    .sort((a, b) => b.count - a.count);

  // ── Active sessions fallback ──
  const sessions = (sessionsData as any)?.length > 0 ? (sessionsData as any) : DEMO_SESSIONS;

  // ── User status distribution ──
  const rawUsers = (usersResp as any)?.data;
  const userDistribution = rawUsers && rawUsers.length > 3
    ? (() => {
        const dist: Record<string, number> = {};
        rawUsers.forEach((u: any) => { dist[u.status] = (dist[u.status] || 0) + 1; });
        const colorMap: Record<string, string> = { ACTIVE: '#34d399', INACTIVE: '#94a3b8', SUSPENDED: '#f87171', PENDING: '#fbbf24' };
        return Object.entries(dist).map(([name, value]) => ({ name, value, color: colorMap[name] || '#94a3b8' }));
      })()
    : DEMO_USERS_DISTRIBUTION;

  // ── Tenant usage comparison ──
  const tenantUsage = (rawTenants && rawTenants.length > 2)
    ? rawTenants.slice(0, 5).map((t: any) => ({ name: t.name?.split(' ')[0] || t.name, users: t.userCount || 0, goals: 0, reviews: 0 }))
    : DEMO_TENANT_USAGE;

  // ── Upgrade requests count ──
  const pendingUpgradeCount = typeof pendingUpgrades === 'number' ? pendingUpgrades : (pendingUpgrades as any)?.count ?? 3;

  // ── Stat card config ──
  const statCards: { label: string; value: string | number; subtitle: string; icon: React.ComponentType<any>; accent: AccentColor }[] = [
    {
      label: 'Total Tenants',
      value: m.totalTenants,
      subtitle: `${m.activeTenants} active`,
      icon: BuildingOffice2Icon,
      accent: 'blue',
    },
    {
      label: 'Active Users',
      value: formatNumber(m.activeUsers),
      subtitle: `${formatNumber(m.totalUsers)} total`,
      icon: UsersIcon,
      accent: 'violet',
    },
    {
      label: 'API Requests Today',
      value: formatNumber(m.apiRequestsToday),
      subtitle: `${(m.errorRate ?? 0).toFixed(2)}% error rate`,
      icon: BoltIcon,
      accent: 'emerald',
    },
    {
      label: 'Monthly Revenue',
      value: formatCurrency(revenue.total),
      subtitle: `${Object.keys(revenue.byPlan || {}).length} active plans`,
      icon: CurrencyDollarIcon,
      accent: 'amber',
    },
    {
      label: 'System Uptime',
      value: formatUptime(m.uptime),
      subtitle: m.healthStatus === 'healthy' ? 'All systems operational' : `Status: ${m.healthStatus}`,
      icon: ClockIcon,
      accent: 'cyan',
    },
    {
      label: 'Security Threats',
      value: threats.blocked + threats.suspicious,
      subtitle: `${threats.blocked} blocked, ${threats.suspicious} suspicious`,
      icon: ShieldExclamationIcon,
      accent: 'rose',
    },
  ];

  return (
    <div className="space-y-8">
      {/* ════════════════════════════════════════════════════════════════════
          Hero Welcome Banner
         ════════════════════════════════════════════════════════════════════ */}
      <div className="sa-hero-banner animate-fade-in-up relative overflow-hidden rounded-2xl p-6">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.35) 0%, transparent 70%)' }} />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-25 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)' }} />

        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-white/[0.08] border border-indigo-200/60 dark:border-white/[0.1]">
              <CpuChipIcon className="h-6 w-6 text-indigo-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Command Center</h1>
              <p className="text-sm text-gray-500 dark:text-white/50">Platform-wide overview, analytics & system controls</p>
            </div>
          </div>

          {/* Quick summary badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08]">
              <BuildingOffice2Icon className="h-4 w-4 text-blue-500 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-white/80">{m.totalTenants} Tenants</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/60 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08]">
              <CurrencyDollarIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-white/80">{formatCurrency(revenue.total)}</span>
            </div>
            <div className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg border',
              config.maintenance.enabled
                ? 'bg-amber-50 dark:bg-amber-500/[0.08] border-amber-200/60 dark:border-amber-400/[0.15]'
                : 'bg-emerald-50 dark:bg-emerald-500/[0.08] border-emerald-200/60 dark:border-emerald-400/[0.15]'
            )}>
              {config.maintenance.enabled ? (
                <>
                  <WrenchScrewdriverIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Maintenance Mode</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">All Systems Healthy</span>
                </>
              )}
            </div>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-white/[0.06] border border-gray-200/60 dark:border-white/[0.08] hover:bg-white dark:hover:bg-white/[0.1] transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 text-gray-500 dark:text-white/50" />
              <span className="text-sm font-medium text-gray-600 dark:text-white/60">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Stat Cards (6-column accent-colored)
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => {
          const accent = ACCENT_STYLES[card.accent];
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={clsx(
                'sa-stat-card group relative overflow-hidden rounded-2xl p-5',
                'bg-white/75 dark:bg-white/[0.04] sa-glass-card',
                'border border-gray-200/60 dark:border-white/[0.08]',
                'hover:shadow-lg hover:bg-white/90 dark:hover:bg-white/[0.07]',
                'transition-all duration-300',
                'animate-fade-in-up',
              )}
              style={{ animationDelay: `${i * 0.05 + 0.1}s` }}
            >
              {/* Shimmer line on hover */}
              <div className={clsx(
                'absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300',
                'bg-gradient-to-r', accent.shimmer,
              )} />

              <div className="flex items-center gap-3 mb-3">
                <div className={clsx('p-2 rounded-xl border border-transparent', accent.iconBg)}>
                  <Icon className={clsx('h-5 w-5', accent.iconText)} />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{card.label}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: Revenue Trend (Area) + Revenue by Plan (Bar)
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Revenue Trend Area Chart — 3 cols */}
        <SectionCard className="lg:col-span-3" delay={0.25}>
          <SectionTitle
            icon={ArrowTrendingUpIcon}
            title="Revenue Trend"
            badge={
              <span className="text-xs text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                Last 7 months
              </span>
            }
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'rgba(156,163,175,0.8)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'rgba(156,163,175,0.8)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip content={<GlassTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#a78bfa"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#a78bfa', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-6 pt-3 border-t border-gray-100 dark:border-white/[0.06]">
            <div>
              <p className="text-[11px] text-gray-400 dark:text-white/35 uppercase tracking-wider">Total MRR</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(revenue.total)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 dark:text-white/35 uppercase tracking-wider">Growth</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                +{revenue.trend?.length >= 2
                  ? ((revenue.trend[revenue.trend.length - 1] / revenue.trend[revenue.trend.length - 2] - 1) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Revenue by Plan — 2 cols */}
        <SectionCard className="lg:col-span-2" delay={0.3}>
          <SectionTitle icon={CurrencyDollarIcon} title="Revenue by Plan" />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByPlan} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'rgba(156,163,175,0.8)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'rgba(156,163,175,0.9)' }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                  {revenueByPlan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            {revenueByPlan.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                <span className="text-[11px] text-gray-500 dark:text-white/50">
                  {item.name}: {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Combined: Platform Overview + Quick Actions + Security + Tenant Plans
          Quick Actions spans 2 rows on the right to eliminate dead space.
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Platform Overview — 2 cols, row 1 */}
        <SectionCard className="lg:col-span-2" delay={0.35}>
          <SectionTitle icon={ChartBarIcon} title="Platform Overview" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tenants */}
            <MiniMetric
              icon={BuildingOffice2Icon}
              iconColor="blue"
              label="Tenants"
              value={<>{m.activeTenants}<span className="text-gray-400 dark:text-white/30 text-sm font-normal">/{m.totalTenants}</span></>}
              progress={m.totalTenants ? (m.activeTenants / m.totalTenants) * 100 : 0}
              progressColor="from-blue-500 to-blue-400"
              detail={`${m.activeTenants} active of ${m.totalTenants}`}
            />
            {/* Users */}
            <MiniMetric
              icon={UsersIcon}
              iconColor="violet"
              label="Users"
              value={<>{m.activeUsers.toLocaleString()}<span className="text-gray-400 dark:text-white/30 text-sm font-normal">/{m.totalUsers.toLocaleString()}</span></>}
              progress={m.totalUsers ? (m.activeUsers / m.totalUsers) * 100 : 0}
              progressColor="from-violet-500 to-violet-400"
              detail={`${m.activeUsers.toLocaleString()} active of ${m.totalUsers.toLocaleString()}`}
            />
            {/* Avg Response Time */}
            <MiniMetric
              icon={BoltIcon}
              iconColor="cyan"
              label="Avg Response"
              value={<>{m.avgResponseTime}<span className="text-gray-400 dark:text-white/30 text-sm font-normal">ms</span></>}
              progress={Math.min((m.avgResponseTime / 500) * 100, 100)}
              progressColor="from-cyan-500 to-cyan-400"
              detail={m.avgResponseTime < 200 ? 'Excellent' : m.avgResponseTime < 500 ? 'Good' : 'Needs attention'}
            />
            {/* Storage */}
            <MiniMetric
              icon={CircleStackIcon}
              iconColor="amber"
              label="Storage"
              value={<>{m.storageUsedGb}<span className="text-gray-400 dark:text-white/30 text-sm font-normal">GB</span></>}
              progress={Math.min((m.storageUsedGb / 50) * 100, 100)}
              progressColor="from-amber-500 to-amber-400"
              detail={`${((m.storageUsedGb / 50) * 100).toFixed(0)}% of 50 GB used`}
            />
            {/* MAU */}
            <MiniMetric
              icon={ArrowTrendingUpIcon}
              iconColor="emerald"
              label="MAU"
              value={m.monthlyActiveUsers.toLocaleString()}
              progress={m.totalUsers ? (m.monthlyActiveUsers / m.totalUsers) * 100 : 0}
              progressColor="from-emerald-500 to-emerald-400"
              detail={`${((m.monthlyActiveUsers / (m.totalUsers || 1)) * 100).toFixed(0)}% of total users`}
            />
            {/* Error Rate */}
            <MiniMetric
              icon={ExclamationTriangleIcon}
              iconColor={m.errorRate > 1 ? 'rose' : 'emerald'}
              label="Error Rate"
              value={<><span className={m.errorRate > 1 ? 'text-red-600 dark:text-red-400' : ''}>{(m.errorRate ?? 0).toFixed(2)}</span><span className="text-gray-400 dark:text-white/30 text-sm font-normal">%</span></>}
              progress={Math.min(m.errorRate * 10, 100)}
              progressColor={m.errorRate > 1 ? 'from-red-500 to-red-400' : 'from-emerald-500 to-emerald-400'}
              detail={m.errorRate < 1 ? 'Healthy' : m.errorRate < 5 ? 'Needs attention' : 'Critical'}
            />
          </div>
        </SectionCard>

        {/* RBAC Quick Actions — 1 col, row-span-2 */}
        <SectionCard className="lg:row-span-2" delay={0.4}>
          <SectionTitle icon={WrenchScrewdriverIcon} title="Quick Actions" />
          <div className="space-y-3">
            {/* Maintenance Mode Toggle */}
            <ActionItem
              icon={config.maintenance.enabled ? PauseCircleIcon : PlayCircleIcon}
              label="Maintenance Mode"
              description={config.maintenance.enabled ? 'Currently active — site is down for users' : 'System running normally'}
              color={config.maintenance.enabled ? 'amber' : 'emerald'}
              action={
                <button
                  onClick={() => toggleMaintenance.mutate(!config.maintenance.enabled)}
                  disabled={toggleMaintenance.isPending}
                  className={clsx(
                    'text-xs font-medium px-3 py-1.5 rounded-lg transition-colors',
                    config.maintenance.enabled
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25'
                  )}
                >
                  {toggleMaintenance.isPending ? 'Saving...' : config.maintenance.enabled ? 'Disable' : 'Enable'}
                </button>
              }
            />
            {/* Clear Cache */}
            <ActionItem
              icon={ArrowPathIcon}
              label="Clear Cache"
              description="Flush Redis and in-memory caches"
              color="blue"
              action={
                <button
                  onClick={() => clearCache.mutate()}
                  disabled={cacheClearLoading}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:hover:bg-blue-500/25 transition-colors"
                >
                  {cacheClearLoading ? 'Clearing...' : 'Clear'}
                </button>
              }
            />
            {/* Signups */}
            <ActionItem
              icon={UserPlusIcon}
              label="New Signups"
              description={config.features.signupsEnabled ? 'Registration is open' : 'Registration is closed'}
              color={config.features.signupsEnabled ? 'emerald' : 'rose'}
              badge={
                <span className={clsx(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  config.features.signupsEnabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                )}>
                  {config.features.signupsEnabled ? 'OPEN' : 'CLOSED'}
                </span>
              }
            />
            {/* MFA for Admins */}
            <ActionItem
              icon={LockClosedIcon}
              label="Admin MFA Requirement"
              description={config.security.requireMfaForAdmins ? 'MFA enforced for all admins' : 'MFA optional'}
              color={config.security.requireMfaForAdmins ? 'emerald' : 'amber'}
              badge={
                <span className={clsx(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  config.security.requireMfaForAdmins
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                )}>
                  {config.security.requireMfaForAdmins ? 'ENFORCED' : 'OPTIONAL'}
                </span>
              }
            />
            {/* Trial Days */}
            <ActionItem
              icon={ClockIcon}
              label="Default Trial Period"
              description={`${config.features.trialDays} day trial for new tenants`}
              color="violet"
              badge={
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400">
                  {config.features.trialDays}d
                </span>
              }
            />
            {/* Rate Limits */}
            <ActionItem
              icon={CommandLineIcon}
              label="API Rate Limit"
              description={`${config.limits.maxApiRequestsPerMinute} req/min per tenant`}
              color="blue"
              badge={
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400">
                  {config.limits.maxApiRequestsPerMinute}/min
                </span>
              }
            />
          </div>
        </SectionCard>

        {/* Security & Threat Monitoring — col 1, row 2 */}
        <SectionCard delay={0.45}>
          <SectionTitle
            icon={ShieldExclamationIcon}
            title="Security & Threats"
            badge={
              threats.blocked + threats.suspicious > 0 ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  {threats.blocked + threats.suspicious} threats
                </span>
              ) : null
            }
          />

          {/* Threat summary cards */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-red-50/80 dark:bg-red-500/[0.06] border border-red-100 dark:border-red-400/[0.1]">
              <div className="flex items-center gap-2 mb-1">
                <NoSymbolIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Blocked</span>
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">{threats.blocked}</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-500/[0.06] border border-amber-100 dark:border-amber-400/[0.1]">
              <div className="flex items-center gap-2 mb-1">
                <EyeIcon className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Suspicious</span>
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{threats.suspicious}</p>
            </div>
          </div>

          {/* Recent Failed Attempts */}
          <p className="text-xs font-medium text-gray-500 dark:text-white/40 mb-2 uppercase tracking-wider">Recent Login Attempts</p>
          {(threats.recentAttempts || []).length > 0 ? (
            <div className="space-y-1.5">
              {(threats.recentAttempts || []).slice(0, 4).map((attempt: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 rounded-md bg-red-100 dark:bg-red-500/10">
                      <GlobeAltIcon className="h-3.5 w-3.5 text-red-500 dark:text-red-400" />
                    </div>
                    <span className="text-sm font-mono text-gray-700 dark:text-white/70">{attempt.ip}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400">{attempt.count} tries</span>
                    <span className="text-[11px] text-gray-400 dark:text-white/25">
                      {(() => {
                        try { return formatDistanceToNow(new Date(attempt.lastAttempt), { addSuffix: true }); }
                        catch { return 'recently'; }
                      })()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/[0.04] border border-emerald-100 dark:border-emerald-400/[0.08]">
              <CheckCircleIcon className="h-5 w-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">No suspicious login attempts detected. System is secure.</p>
            </div>
          )}
          {/* Security quick stats */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.06] grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-white/35">Max Login Attempts</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{config.security.maxLoginAttempts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-white/35">Lockout Duration</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{config.security.lockoutDuration}m</span>
            </div>
          </div>
        </SectionCard>

        {/* Tenant Plans Donut */}
        <SectionCard delay={0.5}>
          <SectionTitle
            icon={BuildingOffice2Icon}
            title="Tenant Plans"
            badge={
              <span className="text-xs text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">{planTotal} total</span>
            }
          />
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
                <Tooltip content={<GlassTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{planTotal}</p>
                <p className="text-[10px] text-gray-400 dark:text-white/40 uppercase tracking-wider">Tenants</p>
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
            {planDistribution.map((item: any, index: number) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                <span className="text-xs text-gray-500 dark:text-white/50">{item.name}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-white/70">{item.value}</span>
                <span className="text-[10px] text-gray-400 dark:text-white/25">({((item.value / planTotal) * 100).toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: System Health + Audit Breakdown Chart
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* System Health */}
        <SectionCard delay={0.55}>
          <SectionTitle icon={ShieldCheckIcon} title="System Health" />

          {/* Overall status banner */}
          <div className={clsx(
            'flex items-center gap-3 p-3 rounded-xl border mb-4',
            m.healthStatus === 'healthy'
              ? 'bg-emerald-50 dark:bg-emerald-500/[0.06] border-emerald-200 dark:border-emerald-400/[0.12]'
              : 'bg-amber-50 dark:bg-amber-500/[0.06] border-amber-200 dark:border-amber-400/[0.12]'
          )}>
            <div className={clsx(
              'p-2 rounded-lg',
              m.healthStatus === 'healthy' ? 'bg-emerald-100 dark:bg-emerald-400/15' : 'bg-amber-100 dark:bg-amber-400/15'
            )}>
              {m.healthStatus === 'healthy' ? (
                <CheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <p className={clsx('text-sm font-semibold', m.healthStatus === 'healthy' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400')}>
                {m.healthStatus === 'healthy' ? 'All Systems Operational' : 'Degraded Performance'}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-white/35">Last checked just now</p>
            </div>
          </div>

          {/* Service grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {healthServices.map((service) => {
              const ServiceIcon = HEALTH_ICONS[service.name] || ServerStackIcon;
              const isHealthy = service.status === 'healthy';
              return (
                <div key={service.name} className={clsx(
                  'flex items-center gap-3 p-3 rounded-xl border transition-colors',
                  isHealthy
                    ? 'bg-gray-50/50 dark:bg-white/[0.02] border-gray-100 dark:border-white/[0.06] hover:bg-gray-50 dark:hover:bg-white/[0.04]'
                    : 'bg-red-50 dark:bg-red-500/[0.04] border-red-200 dark:border-red-400/[0.08] hover:bg-red-100 dark:hover:bg-red-500/[0.06]'
                )}>
                  <div className={clsx(
                    'p-1.5 rounded-lg',
                    isHealthy ? 'bg-emerald-100 dark:bg-emerald-400/10' : 'bg-red-100 dark:bg-red-400/10'
                  )}>
                    <ServiceIcon className={clsx('h-4 w-4', isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-white/75 flex-1">{service.label}</span>
                  <div className={clsx('w-2 h-2 rounded-full', isHealthy ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400')} />
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.06] grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-gray-400 dark:text-white/35 uppercase tracking-wider">Uptime</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/80 mt-0.5">{formatUptime(m.uptime)}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 dark:text-white/35 uppercase tracking-wider">Avg Response</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/80 mt-0.5">{m.avgResponseTime}ms</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 dark:text-white/35 uppercase tracking-wider">Error Rate</p>
              <p className={clsx('text-sm font-semibold mt-0.5', m.errorRate > 1 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-white/80')}>{(m.errorRate ?? 0).toFixed(2)}%</p>
            </div>
          </div>
        </SectionCard>

        {/* Audit Breakdown Chart */}
        <SectionCard delay={0.6}>
          <SectionTitle
            icon={DocumentTextIcon}
            title="Activity Breakdown"
            badge={
              <span className="text-xs text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {activityList.length} events
              </span>
            }
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={auditChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: 'rgba(156,163,175,0.8)' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'rgba(156,163,175,0.8)' }}
                  axisLine={false}
                  tickLine={false}
                  width={110}
                />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={20}>
                  {auditChartData.map((entry, index) => {
                    const actionName = entry.name.toUpperCase();
                    let color = '#94a3b8';
                    if (actionName.includes('LOGIN')) color = '#60a5fa';
                    else if (actionName.includes('CREATE') || actionName.includes('ADD')) color = '#34d399';
                    else if (actionName.includes('DELETE') || actionName.includes('REMOVE')) color = '#f87171';
                    else if (actionName.includes('UPDATE') || actionName.includes('CONFIG')) color = '#fbbf24';
                    else if (actionName.includes('BACKUP')) color = '#a78bfa';
                    return <Cell key={index} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: Recent Tenants + Recent Activity
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Recent Tenants */}
        <SectionCard delay={0.65}>
          <SectionTitle icon={BuildingOffice2Icon} title="Recent Tenants" />
          {tenantsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {tenantList.map((tenant: any) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all duration-200 border border-transparent hover:border-gray-100 dark:hover:border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-500/15 dark:to-violet-500/10 border border-blue-200/40 dark:border-white/[0.08] flex items-center justify-center">
                      <BuildingOffice2Icon className="h-4 w-4 text-blue-600 dark:text-blue-400/80" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white/90">{tenant.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full', getPlanBadge(tenant.plan))}>
                          {tenant.plan}
                        </span>
                        {tenant.userCount != null && (
                          <span className="text-[11px] text-gray-400 dark:text-white/30">{tenant.userCount} users</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', getStatusBadge(tenant.status))}>
                    {tenant.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Activity */}
        <SectionCard className="!p-0 overflow-hidden" delay={0.7}>
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white/90 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-400 dark:text-white/40" />
              Recent Activity
            </h3>
          </div>
          {auditLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/[0.03]">
              {activityList.map((log: any) => {
                const ActionIcon = getActionIcon(log.action);
                const colors = getActionColor(log.action);
                return (
                  <div key={log.id} className={clsx('px-5 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors border-l-2', colors.border)}>
                    <div className="flex items-center gap-3">
                      <div className={clsx('p-1.5 rounded-lg flex-shrink-0', colors.bg)}>
                        <ActionIcon className={clsx('h-3.5 w-3.5', colors.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800 dark:text-white/80 truncate">{log.userEmail}</span>
                          <span className={clsx(
                            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                            log.action?.includes('CREATE') || log.action?.includes('ADD')
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                              : log.action?.includes('DELETE') || log.action?.includes('REMOVE')
                              ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                              : log.action?.includes('LOGIN')
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
                          )}>
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {log.resource && (
                          <p className="text-[11px] text-gray-400 dark:text-white/25 mt-0.5 truncate">
                            {log.resource} {log.resourceId && `(${String(log.resourceId).slice(0, 8)}...)`}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-white/20 whitespace-nowrap flex-shrink-0">
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
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: Security Config Summary + System Limits
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Security Config */}
        <SectionCard delay={0.75}>
          <SectionTitle icon={LockClosedIcon} title="Security Config" />
          <div className="space-y-3">
            <ConfigRow label="Max Login Attempts" value={`${config.security.maxLoginAttempts} attempts`} />
            <ConfigRow label="Lockout Duration" value={`${config.security.lockoutDuration} minutes`} />
            <ConfigRow label="Min Password Length" value={`${config.security.passwordMinLength} chars`} />
            <ConfigRow label="Admin MFA" value={config.security.requireMfaForAdmins ? 'Required' : 'Optional'} isGood={config.security.requireMfaForAdmins} />
            <ConfigRow label="Email Verification" value={config.features.requireEmailVerification ? 'Required' : 'Not required'} isGood={config.features.requireEmailVerification} />
          </div>
        </SectionCard>

        {/* System Limits */}
        <SectionCard delay={0.8}>
          <SectionTitle icon={ServerStackIcon} title="System Limits" />
          <div className="space-y-3">
            <ConfigRow label="Tenants per Account" value={`${config.limits.maxTenantsPerAccount}`} />
            <ConfigRow label="API Rate Limit" value={`${config.limits.maxApiRequestsPerMinute}/min`} />
            <ConfigRow label="Max Upload Size" value={`${config.limits.maxFileUploadSizeMb} MB`} />
            <ConfigRow label="Default Plan" value={config.features.defaultPlan} />
            <ConfigRow label="Trial Period" value={`${config.features.trialDays} days`} />
          </div>
        </SectionCard>

        {/* Email Config */}
        <SectionCard delay={0.85}>
          <SectionTitle icon={EnvelopeIcon} title="Email Configuration" />
          <div className="space-y-3">
            <ConfigRow label="Provider" value={config.email.provider.toUpperCase()} />
            <ConfigRow label="From Address" value={config.email.fromAddress} />
            <ConfigRow label="From Name" value={config.email.fromName} />
            <div className="pt-3 border-t border-gray-100 dark:border-white/[0.06]">
              <p className="text-[11px] text-gray-400 dark:text-white/35 uppercase tracking-wider mb-1">Registration Status</p>
              <div className="flex items-center gap-2">
                <div className={clsx('w-2 h-2 rounded-full', config.features.signupsEnabled ? 'bg-emerald-500' : 'bg-red-500')} />
                <span className="text-sm font-medium text-gray-700 dark:text-white/70">
                  {config.features.signupsEnabled ? 'Open for signups' : 'Registration closed'}
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: User Status Distribution + Tenant Usage Comparison + Upgrade Requests
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* User Status Distribution Donut — 2 cols */}
        <SectionCard className="lg:col-span-2" delay={0.9}>
          <SectionTitle
            icon={UserGroupIcon}
            title="User Status Distribution"
            badge={
              <span className="text-xs text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {userDistribution.reduce((sum: number, d: any) => sum + d.value, 0)} total
              </span>
            }
          />
          <div className="flex items-center gap-4">
            <div className="h-44 w-44 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {userDistribution.map((entry: any, index: number) => (
                      <Cell key={`ucell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {userDistribution.reduce((sum: number, d: any) => sum + d.value, 0)}
                  </p>
                  <p className="text-[9px] text-gray-400 dark:text-white/40 uppercase tracking-wider">Users</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {userDistribution.map((item: any) => {
                const total = userDistribution.reduce((s: number, d: any) => s + d.value, 0);
                const pct = total ? ((item.value / total) * 100).toFixed(0) : '0';
                return (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-xs text-gray-500 dark:text-white/50 flex-1">{item.name}</span>
                    <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{item.value}</span>
                    <span className="text-[10px] text-gray-400 dark:text-white/25 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>

        {/* Upgrade Requests — compact, 1 col */}
        <SectionCard className="lg:col-span-1" delay={0.95}>
          <SectionTitle icon={ArrowUpCircleIcon} title="Upgrades" />
          <div className="flex flex-col items-center text-center">
            <div className={clsx(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-3',
              pendingUpgradeCount > 0
                ? 'bg-amber-100 dark:bg-amber-500/15'
                : 'bg-emerald-100 dark:bg-emerald-500/15'
            )}>
              {pendingUpgradeCount > 0 ? (
                <InboxIcon className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircleIcon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{pendingUpgradeCount}</p>
            <p className="text-xs text-gray-500 dark:text-white/50 mb-3">
              {pendingUpgradeCount > 0 ? 'pending requests' : 'all clear'}
            </p>
            <Link
              to="/sa/upgrade-requests"
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                pendingUpgradeCount > 0
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:hover:bg-amber-500/25'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.06] dark:text-white/60 dark:hover:bg-white/[0.1]'
              )}
            >
              View All <ChevronRightIcon className="h-3 w-3" />
            </Link>
          </div>
          {/* Quick info rows */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-white/35">Sessions</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{sessions.length} active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-white/35">Blocked IPs</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-white/70">{threats.blocked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-400 dark:text-white/35">Maintenance</span>
              <span className={clsx('text-xs font-semibold', config.maintenance.enabled ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                {config.maintenance.enabled ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </SectionCard>

        {/* Tenant Usage Comparison Bar Chart — 2 cols */}
        <SectionCard className="lg:col-span-2" delay={1.0}>
          <SectionTitle icon={ChartBarIcon} title="Tenant Usage Comparison" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tenantUsage} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'rgba(156,163,175,0.8)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'rgba(156,163,175,0.8)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<GlassTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '10px', color: 'rgba(156,163,175,0.8)' }}
                  iconType="circle"
                  iconSize={7}
                />
                <Bar dataKey="users" name="Users" fill="#60a5fa" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="goals" name="Goals" fill="#a78bfa" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="reviews" name="Reviews" fill="#34d399" radius={[4, 4, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Row: Active Sessions + Quick Navigation
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Active Sessions Monitor */}
        <SectionCard delay={1.05}>
          <SectionTitle
            icon={ComputerDesktopIcon}
            title="Active Sessions"
            badge={
              <span className="text-xs text-gray-400 dark:text-white/30 bg-gray-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-full">
                {sessions.length} online
              </span>
            }
          />
          <div className="space-y-2">
            {sessions.slice(0, 6).map((session: any) => (
              <div key={session.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
                <div className="relative">
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-500/10">
                    <ComputerDesktopIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-gray-700 dark:text-white/70 truncate">{session.ip}</p>
                  <p className="text-[11px] text-gray-400 dark:text-white/30 truncate">{session.userAgent}</p>
                </div>
                <span className="text-[10px] text-gray-400 dark:text-white/20 whitespace-nowrap">
                  {(() => {
                    try { return formatDistanceToNow(new Date(session.createdAt), { addSuffix: true }); }
                    catch { return 'active'; }
                  })()}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Quick Navigation Panel */}
        <SectionCard delay={1.1}>
          <SectionTitle icon={RocketLaunchIcon} title="Quick Navigation" />
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Manage Tenants', description: 'Create, edit, suspend', href: '/sa/tenants', icon: BuildingOffice2Icon, color: 'blue' },
              { label: 'User Management', description: 'Users, roles, MFA', href: '/sa/users', icon: UsersIcon, color: 'violet' },
              { label: 'Billing & Revenue', description: 'Plans & invoices', href: '/sa/billing', icon: CurrencyDollarIcon, color: 'amber' },
              { label: 'Audit Logs', description: 'Activity & compliance', href: '/sa/audit', icon: DocumentTextIcon, color: 'emerald' },
              { label: 'Security Center', description: 'Threats & sessions', href: '/sa/security', icon: ShieldExclamationIcon, color: 'rose' },
              { label: 'System Config', description: 'Settings & flags', href: '/sa/system', icon: AdjustmentsHorizontalIcon, color: 'cyan' },
            ].map((item) => {
              const navColorMap: Record<string, { bg: string; text: string }> = {
                blue: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
                violet: { bg: 'bg-violet-100 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
                amber: { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
                emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
                rose: { bg: 'bg-rose-100 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
                cyan: { bg: 'bg-cyan-100 dark:bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
              };
              const c = navColorMap[item.color] || navColorMap.blue;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors group"
                >
                  <div className={clsx('p-1.5 rounded-lg flex-shrink-0', c.bg)}>
                    <item.icon className={clsx('h-4 w-4', c.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-800 dark:text-white/80">{item.label}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/30 truncate">{item.description}</p>
                  </div>
                  <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 dark:text-white/15 group-hover:text-gray-500 dark:group-hover:text-white/40 transition-colors flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function MiniMetric({
  icon: Icon,
  iconColor,
  label,
  value,
  progress,
  progressColor,
  detail,
}: {
  icon: React.ComponentType<any>;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  progress: number;
  progressColor: string;
  detail: string;
}) {
  const colorMap: Record<string, { bg: string; border: string; text: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-500/10', border: 'border-blue-200/60 dark:border-blue-400/15', text: 'text-blue-600 dark:text-blue-400' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-500/10', border: 'border-violet-200/60 dark:border-violet-400/15', text: 'text-violet-600 dark:text-violet-400' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-500/10', border: 'border-cyan-200/60 dark:border-cyan-400/15', text: 'text-cyan-600 dark:text-cyan-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-500/10', border: 'border-amber-200/60 dark:border-amber-400/15', text: 'text-amber-600 dark:text-amber-400' },
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', border: 'border-emerald-200/60 dark:border-emerald-400/15', text: 'text-emerald-600 dark:text-emerald-400' },
    rose: { bg: 'bg-rose-100 dark:bg-rose-500/10', border: 'border-rose-200/60 dark:border-rose-400/15', text: 'text-rose-600 dark:text-rose-400' },
  };
  const c = colorMap[iconColor] || colorMap.blue;

  return (
    <div className="p-4 rounded-xl bg-gray-50/80 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={clsx('p-1.5 rounded-lg border', c.bg, c.border)}>
            <Icon className={clsx('h-4 w-4', c.text)} />
          </div>
          <span className="text-sm font-medium text-gray-500 dark:text-white/70">{label}</span>
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-gray-200 dark:bg-white/[0.06] overflow-hidden">
        <div
          className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', progressColor)}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-gray-400 dark:text-white/30">{detail}</p>
    </div>
  );
}

function ActionItem({
  icon: Icon,
  label,
  description,
  color,
  action,
  badge,
}: {
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  color: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    rose: { bg: 'bg-rose-100 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 dark:bg-white/[0.02] border border-gray-100 dark:border-white/[0.05] hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors">
      <div className={clsx('p-1.5 rounded-lg flex-shrink-0', c.bg)}>
        <Icon className={clsx('h-4 w-4', c.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-white/80">{label}</p>
        <p className="text-[11px] text-gray-400 dark:text-white/30 truncate">{description}</p>
      </div>
      {badge}
      {action}
    </div>
  );
}

function ConfigRow({ label, value, isGood }: { label: string; value: string; isGood?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/50 dark:bg-white/[0.02] border border-gray-100/80 dark:border-white/[0.04]">
      <span className="text-xs text-gray-500 dark:text-white/50">{label}</span>
      <span className={clsx(
        'text-xs font-semibold',
        isGood === true ? 'text-emerald-600 dark:text-emerald-400'
          : isGood === false ? 'text-amber-600 dark:text-amber-400'
          : 'text-gray-700 dark:text-white/70'
      )}>
        {value}
      </span>
    </div>
  );
}
