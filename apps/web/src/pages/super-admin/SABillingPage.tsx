import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import {
  superAdminBillingApi,
  type SABillingInfo,
  type SAPaginatedResponse,
} from '@/lib/api';
import { DataTable, type Column, Badge, StatCard } from '@/components/ui';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const PLAN_BADGE: Record<string, { variant: 'default' | 'success' | 'info' | 'warning' | 'primary' | 'danger'; label: string }> = {
  FREE: { variant: 'default', label: 'Free' },
  STARTER: { variant: 'info', label: 'Starter' },
  PROFESSIONAL: { variant: 'primary', label: 'Professional' },
  ENTERPRISE: { variant: 'warning', label: 'Enterprise' },
};

const STATUS_BADGE: Record<string, { variant: 'success' | 'warning' | 'danger' | 'default'; label: string }> = {
  ACTIVE: { variant: 'success', label: 'Active' },
  PAST_DUE: { variant: 'warning', label: 'Past Due' },
  CANCELLED: { variant: 'danger', label: 'Cancelled' },
  TRIAL: { variant: 'info' as 'default', label: 'Trial' },
  EXPIRED: { variant: 'danger', label: 'Expired' },
};

type PlanKey = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

const PLAN_FEATURES: { feature: string; plans: Record<PlanKey, boolean> }[] = [
  { feature: 'Performance Reviews', plans: { FREE: true, STARTER: true, PROFESSIONAL: true, ENTERPRISE: true } },
  { feature: 'Goal Management', plans: { FREE: true, STARTER: true, PROFESSIONAL: true, ENTERPRISE: true } },
  { feature: '360 Feedback', plans: { FREE: false, STARTER: true, PROFESSIONAL: true, ENTERPRISE: true } },
  { feature: 'Analytics & Reports', plans: { FREE: false, STARTER: true, PROFESSIONAL: true, ENTERPRISE: true } },
  { feature: 'Calibration', plans: { FREE: false, STARTER: false, PROFESSIONAL: true, ENTERPRISE: true } },
  { feature: 'Succession Planning', plans: { FREE: false, STARTER: false, PROFESSIONAL: true, ENTERPRISE: true } },
  { feature: 'Agentic AI', plans: { FREE: false, STARTER: false, PROFESSIONAL: true, ENTERPRISE: true } },
  { feature: 'Custom Integrations', plans: { FREE: false, STARTER: false, PROFESSIONAL: false, ENTERPRISE: true } },
  { feature: 'Dedicated Support', plans: { FREE: false, STARTER: false, PROFESSIONAL: false, ENTERPRISE: true } },
];

const PLAN_ORDER: PlanKey[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso?: string): string {
  if (!iso) return '--';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SABillingPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // Revenue stats
  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['sa-billing-revenue'],
    queryFn: () => superAdminBillingApi.getRevenue({ period: 'monthly' }),
  });

  // Subscriptions list
  const { data: subscriptions, isLoading: subsLoading } = useQuery({
    queryKey: ['sa-billing-subs', page, statusFilter],
    queryFn: () =>
      superAdminBillingApi.list({
        page,
        limit: PAGE_SIZE,
        status: statusFilter || undefined,
      }),
  });

  const subs = subscriptions?.data ?? [];
  const total = subscriptions?.total ?? 0;
  const totalPages = subscriptions?.totalPages ?? 0;

  // Plan update mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ tenantId, plan }: { tenantId: string; plan: string }) =>
      superAdminBillingApi.updatePlan(tenantId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sa-billing-subs'] });
      queryClient.invalidateQueries({ queryKey: ['sa-billing-revenue'] });
      toast.success('Subscription plan updated');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update plan');
    },
  });

  // Derived stats
  const monthlyRevenue = revenue?.total ?? 0;
  const activeSubscriptions = subs.filter((s) => s.status === 'ACTIVE' || s.status === 'active').length;
  const avgRevenuePerTenant = total > 0 ? monthlyRevenue / total : 0;
  const cancelledCount = subs.filter((s) => s.status === 'CANCELLED' || s.status === 'cancelled').length;
  const churnRate = total > 0 ? ((cancelledCount / total) * 100).toFixed(1) : '0.0';

  // Columns
  const columns: Column<SABillingInfo>[] = [
    {
      key: 'tenant',
      header: 'Tenant',
      render: (sub) => (
        <div>
          <p className="text-sm font-medium text-secondary-900 dark:text-white">{sub.tenantName}</p>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 font-mono">{sub.tenantId.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (sub) => {
        const planKey = sub.plan?.toUpperCase() ?? 'FREE';
        const badge = PLAN_BADGE[planKey] ?? PLAN_BADGE.FREE;
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (sub) => {
        const statusKey = sub.status?.toUpperCase() ?? 'ACTIVE';
        const badge = STATUS_BADGE[statusKey] ?? { variant: 'default' as const, label: sub.status };
        return <Badge variant={badge.variant} dot>{badge.label}</Badge>;
      },
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (sub) => (
        <span className="text-sm font-medium text-secondary-900 dark:text-white">
          {formatCurrency(sub.amount, sub.currency)}
        </span>
      ),
    },
    {
      key: 'nextBilling',
      header: 'Next Billing',
      render: (sub) => (
        <span className="text-sm text-secondary-500 dark:text-secondary-400 whitespace-nowrap">
          {formatDate(sub.currentPeriodEnd)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (sub) => (
        <div className="flex items-center justify-end gap-1">
          <select
            value={sub.plan?.toUpperCase() ?? 'FREE'}
            onChange={(e) => {
              if (confirm(`Change plan for ${sub.tenantName} to ${e.target.value}?`)) {
                updatePlanMutation.mutate({ tenantId: sub.tenantId, plan: e.target.value });
              }
            }}
            className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-2 py-1 text-xs text-secondary-700 dark:text-secondary-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="FREE">Free</option>
            <option value="STARTER">Starter</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
      ),
    },
  ];

  // Page numbers
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Billing & Subscriptions</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Manage revenue, subscriptions, and billing across all tenants
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Revenue"
          value={revenueLoading ? '--' : formatCurrency(monthlyRevenue)}
          icon={<CurrencyDollarIcon className="h-6 w-6" />}
        />
        <StatCard
          label="Active Subscriptions"
          value={subsLoading ? '--' : activeSubscriptions}
          icon={<CreditCardIcon className="h-6 w-6" />}
        />
        <StatCard
          label="Avg Revenue / Tenant"
          value={subsLoading || revenueLoading ? '--' : formatCurrency(avgRevenuePerTenant)}
          icon={<ChartBarIcon className="h-6 w-6" />}
        />
        <StatCard
          label="Churn Rate"
          value={subsLoading ? '--' : `${churnRate}%`}
          icon={<ArrowTrendingDownIcon className="h-6 w-6" />}
        />
      </div>

      {/* Plan Feature Comparison */}
      <div className="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Plan Comparison</h2>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">Features included in each subscription tier</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50">
                <th className="text-left px-6 py-3 font-medium text-secondary-600 dark:text-secondary-400">Feature</th>
                {PLAN_ORDER.map((plan) => (
                  <th key={plan} className="px-4 py-3 text-center font-medium text-secondary-600 dark:text-secondary-400">
                    <Badge variant={PLAN_BADGE[plan].variant}>{PLAN_BADGE[plan].label}</Badge>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURES.map((row, idx) => (
                <tr
                  key={row.feature}
                  className={clsx(
                    'border-b border-secondary-100 dark:border-secondary-700/50',
                    idx % 2 === 0 ? 'bg-white dark:bg-secondary-800' : 'bg-secondary-50/50 dark:bg-secondary-800/30',
                  )}
                >
                  <td className="px-6 py-3 font-medium text-secondary-900 dark:text-white whitespace-nowrap">{row.feature}</td>
                  {PLAN_ORDER.map((plan) => (
                    <td key={plan} className="px-4 py-3 text-center">
                      {row.plans[plan] ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-secondary-300 dark:text-secondary-600 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3 py-2.5 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAST_DUE">Past Due</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="TRIAL">Trial</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Subscriptions Table */}
      <DataTable<SABillingInfo>
        columns={columns}
        data={subs}
        isLoading={subsLoading}
        keyExtractor={(s) => s.tenantId}
        emptyTitle="No subscriptions found"
        emptyDescription="No billing records match your current filters."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
            {Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} subscriptions
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            {pageNumbers.map((pn) => (
              <button
                key={pn}
                onClick={() => setPage(pn)}
                className={clsx(
                  'min-w-[2rem] h-8 rounded-lg text-sm font-medium transition-colors',
                  pn === page
                    ? 'bg-primary-600 text-white'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                )}
              >
                {pn}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
