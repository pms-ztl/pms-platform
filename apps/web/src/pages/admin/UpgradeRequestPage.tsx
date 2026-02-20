import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  XMarkIcon,
  SparklesIcon,
  ShieldCheckIcon,
  RocketLaunchIcon,
  BuildingOffice2Icon,
  StarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

import { api } from '@/lib/api/client';
import { licenseApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SubscriptionPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface UpgradeRequest {
  id: string;
  requestedPlan: SubscriptionPlan;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

interface PlanDefinition {
  name: SubscriptionPlan;
  label: string;
  levelLimit: number;
  price: string;
  period: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  borderColor: string;
  badgeColor: string;
  features: string[];
  popular?: boolean;
}

// ---------------------------------------------------------------------------
// Plan Definitions
// ---------------------------------------------------------------------------

const PLANS: PlanDefinition[] = [
  {
    name: 'FREE',
    label: 'Free',
    levelLimit: 4,
    price: '$0',
    period: 'forever',
    icon: StarIcon,
    color: 'text-secondary-500 dark:text-secondary-400',
    bgGradient: 'from-secondary-50 to-secondary-100 dark:from-secondary-800/50 dark:to-secondary-900/50',
    borderColor: 'border-secondary-200 dark:border-secondary-700',
    badgeColor: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
    features: [
      'Up to 4 job levels (L1\u2013L4)',
      'Basic performance reviews',
      'Goal tracking',
      'Employee self-service',
      'Email support',
    ],
  },
  {
    name: 'STARTER',
    label: 'Starter',
    levelLimit: 8,
    price: '$8',
    period: 'per user / month',
    icon: RocketLaunchIcon,
    color: 'text-blue-600 dark:text-blue-400',
    bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    features: [
      'Up to 8 job levels (L1\u2013L8)',
      '360-degree feedback',
      'Calibration sessions',
      'Custom review templates',
      'Excel bulk upload',
      'Priority email support',
    ],
  },
  {
    name: 'PROFESSIONAL',
    label: 'Professional',
    levelLimit: 12,
    price: '$16',
    period: 'per user / month',
    icon: SparklesIcon,
    color: 'text-violet-600 dark:text-violet-400',
    bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20',
    borderColor: 'border-violet-200 dark:border-violet-800',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    popular: true,
    features: [
      'Up to 12 job levels (L1\u2013L12)',
      'AI-powered insights',
      'Compensation management',
      'Succession planning',
      'Advanced analytics & reports',
      'Career path mapping',
      'Dedicated account manager',
    ],
  },
  {
    name: 'ENTERPRISE',
    label: 'Enterprise',
    levelLimit: 16,
    price: 'Custom',
    period: 'contact sales',
    icon: BuildingOffice2Icon,
    color: 'text-amber-600 dark:text-amber-400',
    bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    features: [
      'Up to 16 job levels (L1\u2013L16)',
      'Multi-entity support',
      'Custom integrations & SSO',
      'Audit log & compliance',
      'SLA guarantee (99.9%)',
      'On-premise deployment option',
      'White-glove onboarding',
      '24/7 phone & chat support',
    ],
  },
];

const PLAN_ORDER: Record<SubscriptionPlan, number> = {
  FREE: 0,
  STARTER: 1,
  PROFESSIONAL: 2,
  ENTERPRISE: 3,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: RequestStatus) {
  const map: Record<RequestStatus, { label: string; classes: string; icon: React.ElementType }> = {
    PENDING: {
      label: 'Pending',
      classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      icon: ClockIcon,
    },
    APPROVED: {
      label: 'Approved',
      classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      icon: CheckCircleIcon,
    },
    REJECTED: {
      label: 'Rejected',
      classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      icon: XCircleIcon,
    },
    CANCELLED: {
      label: 'Cancelled',
      classes: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700/40 dark:text-secondary-400',
      icon: NoSymbolIcon,
    },
  };
  const cfg = map[status] ?? map.PENDING;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}>
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UpgradeRequestPage() {
  const { user } = useAuthStore();

  // State
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('FREE');
  const [currentMaxLevel, setCurrentMaxLevel] = useState<number>(4);
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedPlan, setSelectedPlan] = useState<PlanDefinition | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Fetch current plan info
  useEffect(() => {
    let cancelled = false;
    async function fetchPlanInfo() {
      try {
        const sub = await licenseApi.getSubscription();
        if (cancelled) return;
        const planName = (sub.plan || 'FREE').toUpperCase() as SubscriptionPlan;
        setCurrentPlan(planName in PLAN_ORDER ? planName : 'FREE');
        setCurrentMaxLevel(sub.maxLevel ?? 4);
      } catch {
        try {
          const usage = await licenseApi.getUsage();
          if (cancelled) return;
          const planName = (usage.plan || 'FREE').toUpperCase() as SubscriptionPlan;
          setCurrentPlan(planName in PLAN_ORDER ? planName : 'FREE');
          setCurrentMaxLevel(usage.maxLevel ?? 4);
        } catch {
          if (!cancelled) {
            console.warn('Could not fetch subscription info, defaulting to FREE');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchPlanInfo();
    return () => { cancelled = true; };
  }, []);

  // Fetch past upgrade requests
  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const data = await api.get<any>('/upgrade-requests');
      const items = Array.isArray(data) ? data : data?.items ?? [];
      setRequests(items);
      setError(null);
    } catch (err: any) {
      if (err?.message?.includes('404') || err?.message?.includes('Not Found')) {
        setRequests([]);
      } else {
        setError(err?.message || 'Failed to load upgrade requests');
      }
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Submit upgrade request
  async function handleSubmit() {
    if (!selectedPlan || !reason.trim()) return;
    setSubmitting(true);
    try {
      await api.post<any>('/upgrade-requests', {
        requestedPlan: selectedPlan.name,
        reason: reason.trim(),
      });
      toast.success(`Upgrade request for ${selectedPlan.label} plan submitted successfully`);
      setSelectedPlan(null);
      setReason('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit upgrade request');
    } finally {
      setSubmitting(false);
    }
  }

  // Cancel upgrade request
  async function handleCancel(id: string) {
    setCancelling(id);
    try {
      await api.post<any>('/upgrade-requests/' + id + '/cancel');
      toast.success('Upgrade request cancelled');
      fetchRequests();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to cancel request');
    } finally {
      setCancelling(null);
    }
  }

  // Derived
  const isAdmin =
    user?.roles?.includes('HR_ADMIN') ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN');

  const currentPlanDef = PLANS.find((p) => p.name === currentPlan) ?? PLANS[0];
  const hasPendingRequest = requests.some((r) => r.status === 'PENDING');

  // Access guard
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldCheckIcon className="h-12 w-12 text-secondary-400 mb-4" />
        <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Access Denied</h2>
        <p className="text-secondary-500 dark:text-secondary-400 mt-2">
          You need admin permissions to manage subscription upgrades.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Upgrade Plan</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">Loading subscription information...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-secondary-900 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-1/3" />
                <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2" />
                <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-full" />
                <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Upgrade Plan</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Compare plans and request an upgrade for your organization
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="inline-flex items-center gap-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 shadow-sm hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Current Plan Card */}
      <div className={`relative overflow-hidden rounded-xl border ${currentPlanDef.borderColor} bg-gradient-to-br ${currentPlanDef.bgGradient} p-6`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80 dark:bg-secondary-800/80 shadow-sm">
              <currentPlanDef.icon className={`h-6 w-6 ${currentPlanDef.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Current Plan</p>
              <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">{currentPlanDef.label}</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">Level Limit</p>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">L1 &ndash; L{currentMaxLevel}</p>
          </div>
        </div>
        {hasPendingRequest && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2.5">
            <ClockIcon className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You have a pending upgrade request. You will be notified once it is reviewed.
            </p>
          </div>
        )}
      </div>

      {/* Plan Comparison Grid */}
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Compare Plans</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = plan.name === currentPlan;
            const isLower = PLAN_ORDER[plan.name] <= PLAN_ORDER[currentPlan];
            const isUpgrade = PLAN_ORDER[plan.name] > PLAN_ORDER[currentPlan];
            const PlanIcon = plan.icon;

            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl border ${
                  isCurrent
                    ? 'border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20 dark:ring-primary-400/20'
                    : plan.borderColor
                } bg-white dark:bg-secondary-900 shadow-sm transition-all hover:shadow-md`}
              >
                {/* Popular badge */}
                {plan.popular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <SparklesIcon className="h-3.5 w-3.5" />
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      Current Plan
                    </span>
                  </div>
                )}

                <div className="flex flex-col flex-1 p-6 pt-8">
                  {/* Plan icon + name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${plan.bgGradient}`}>
                      <PlanIcon className={`h-5 w-5 ${plan.color}`} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-secondary-900 dark:text-white">{plan.label}</h4>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${plan.badgeColor}`}>
                        L1 &ndash; L{plan.levelLimit}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-5">
                    <span className="text-3xl font-extrabold text-secondary-900 dark:text-white">{plan.price}</span>
                    {plan.price !== 'Custom' && (
                      <span className="ml-1 text-sm text-secondary-500 dark:text-secondary-400">/ {plan.period}</span>
                    )}
                    {plan.price === 'Custom' && (
                      <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">{plan.period}</p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-secondary-100 dark:border-secondary-800 mb-5" />

                  {/* Features */}
                  <ul className="flex-1 space-y-2.5 mb-6">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-secondary-600 dark:text-secondary-300">
                        <CheckIcon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isLower && !isCurrent ? 'text-secondary-300 dark:text-secondary-600' : plan.color}`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    disabled={isLower || hasPendingRequest}
                    onClick={() => {
                      if (isUpgrade) {
                        setSelectedPlan(plan);
                        setReason('');
                      }
                    }}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                      isCurrent
                        ? 'bg-secondary-100 dark:bg-secondary-800 text-secondary-500 dark:text-secondary-400 cursor-default'
                        : isLower
                          ? 'bg-secondary-50 dark:bg-secondary-800/50 text-secondary-400 dark:text-secondary-500 cursor-not-allowed'
                          : hasPendingRequest
                            ? 'bg-secondary-100 dark:bg-secondary-800 text-secondary-400 dark:text-secondary-500 cursor-not-allowed'
                            : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 text-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isCurrent
                      ? 'Current Plan'
                      : isLower
                        ? 'Included'
                        : hasPendingRequest
                          ? 'Request Pending'
                          : 'Request Upgrade'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Past Requests Table */}
      <div>
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Upgrade Request History</h3>
        <div className="overflow-hidden rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 shadow-sm">
          {requestsLoading ? (
            <div className="p-8 text-center">
              <ArrowPathIcon className="h-6 w-6 text-secondary-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Loading requests...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchRequests}
                className="mt-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowUpCircleIcon className="h-10 w-10 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-secondary-600 dark:text-secondary-400">No upgrade requests yet</p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                Select a plan above to submit your first upgrade request
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary-100 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-800/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
                      Requested Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
                      Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100 dark:divide-secondary-800">
                  {requests.map((req) => {
                    const planDef = PLANS.find((p) => p.name === req.requestedPlan);
                    const ReqPlanIcon = planDef?.icon;
                    return (
                      <tr
                        key={req.id}
                        className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {ReqPlanIcon && <ReqPlanIcon className={`h-4 w-4 ${planDef!.color}`} />}
                            <span className="text-sm font-medium text-secondary-900 dark:text-white">
                              {planDef?.label ?? req.requestedPlan}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${planDef?.badgeColor ?? 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'}`}>
                              L1&ndash;L{planDef?.levelLimit ?? '?'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-secondary-600 dark:text-secondary-300 max-w-xs truncate" title={req.reason}>
                            {req.reason || '—'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {statusBadge(req.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 dark:text-secondary-400">
                          {formatDate(req.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {req.status === 'PENDING' ? (
                            <button
                              disabled={cancelling === req.id}
                              onClick={() => handleCancel(req.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-secondary-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                              {cancelling === req.id ? (
                                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <XMarkIcon className="h-3.5 w-3.5" />
                              )}
                              Cancel
                            </button>
                          ) : (
                            <span className="text-xs text-secondary-400 dark:text-secondary-500">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={() => { if (!submitting) setSelectedPlan(null); }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 shadow-2xl">
            {/* Header */}
            <div className={`sticky top-0 z-10 flex items-center justify-between rounded-t-2xl border-b border-secondary-100 dark:border-secondary-800 bg-gradient-to-r ${selectedPlan.bgGradient} px-6 py-4`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/80 dark:bg-secondary-800/80">
                  <selectedPlan.icon className={`h-5 w-5 ${selectedPlan.color}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-secondary-900 dark:text-white">
                    Request Upgrade
                  </h3>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">
                    Upgrade to {selectedPlan.label} Plan
                  </p>
                </div>
              </div>
              <button
                onClick={() => { if (!submitting) setSelectedPlan(null); }}
                className="rounded-lg p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Plan summary */}
              <div className="flex items-center justify-between rounded-lg border border-secondary-100 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-800/50 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400">Upgrading from</p>
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white">
                    {currentPlanDef.label} (L1&ndash;L{currentMaxLevel})
                  </p>
                </div>
                <ArrowUpCircleIcon className={`h-6 w-6 mx-3 flex-shrink-0 ${selectedPlan.color}`} />
                <div className="text-right">
                  <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400">Upgrading to</p>
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white">
                    {selectedPlan.label} (L1&ndash;L{selectedPlan.levelLimit})
                  </p>
                </div>
              </div>

              {/* Pricing info */}
              <div className="text-center">
                <span className="text-3xl font-extrabold text-secondary-900 dark:text-white">{selectedPlan.price}</span>
                {selectedPlan.price !== 'Custom' && (
                  <span className="ml-1 text-sm text-secondary-500 dark:text-secondary-400">/ {selectedPlan.period}</span>
                )}
              </div>

              {/* New features gained */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400 mb-2">
                  What you will get
                </p>
                <ul className="space-y-1.5">
                  {selectedPlan.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-300">
                      <CheckIcon className={`h-4 w-4 flex-shrink-0 ${selectedPlan.color}`} />
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Reason textarea */}
              <div>
                <label
                  htmlFor="upgrade-reason"
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5"
                >
                  Reason for upgrade <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="upgrade-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why your organization needs this upgrade (e.g., headcount growth, need for additional levels, compliance requirements)..."
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-3.5 py-2.5 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-2 focus:ring-primary-500/20 dark:focus:ring-primary-400/20 outline-none transition-all resize-none"
                />
                <p className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">
                  This will be reviewed by the platform administrators.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-end gap-3 rounded-b-2xl border-t border-secondary-100 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-800/40 px-6 py-4">
              <button
                disabled={submitting}
                onClick={() => setSelectedPlan(null)}
                className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                disabled={submitting || !reason.trim()}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <ArrowUpCircleIcon className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
