/**
 * AI Insight Cards — dashboard widget showing prioritized AI insights.
 *
 * Card types with distinct colors:
 * - warning (amber), opportunity (blue), recommendation (green),
 *   achievement (purple), alert (red)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExclamationTriangleIcon,
  LightBulbIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  SparklesIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { aiApi, type AIInsightCard } from '../../lib/api';

// ── Insight Type Config ────────────────────────────────────

const INSIGHT_CONFIG: Record<
  string,
  { icon: typeof SparklesIcon; bgClass: string; borderClass: string; iconColor: string }
> = {
  warning: {
    icon: ExclamationTriangleIcon,
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
    borderClass: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  opportunity: {
    icon: LightBulbIcon,
    bgClass: 'bg-blue-50 dark:bg-blue-950/30',
    borderClass: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  recommendation: {
    icon: SparklesIcon,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderClass: 'border-emerald-200 dark:border-emerald-800',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  achievement: {
    icon: CheckCircleIcon,
    bgClass: 'bg-purple-50 dark:bg-purple-950/30',
    borderClass: 'border-purple-200 dark:border-purple-800',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  alert: {
    icon: ShieldExclamationIcon,
    bgClass: 'bg-red-50 dark:bg-red-950/30',
    borderClass: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  low: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

// ── Component ──────────────────────────────────────────────

interface AIInsightCardsProps {
  maxItems?: number;
  className?: string;
}

export function AIInsightCards({ maxItems = 5, className = '' }: AIInsightCardsProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: () => aiApi.getInsights({ limit: maxItems }),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => aiApi.markInsightRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => aiApi.dismissInsight(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }),
  });

  const insights: AIInsightCard[] = (data as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="h-5 w-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Insights</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
          ))}
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon className="h-5 w-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Insights</h3>
        </div>
        <p className="text-center text-xs text-gray-400 py-6">
          No insights at the moment. Everything looks good!
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary-500" />
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">AI Insights</h3>
          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {insights.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {insights.map((insight) => {
          const config = INSIGHT_CONFIG[insight.insightType] ?? INSIGHT_CONFIG.recommendation;
          const Icon = config.icon;

          return (
            <div
              key={insight.id}
              className={`relative rounded-lg border p-3 transition-all ${config.bgClass} ${config.borderClass} ${
                !insight.isRead ? 'ring-1 ring-primary-300 dark:ring-primary-600' : ''
              }`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${config.iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-xs font-semibold text-gray-800 dark:text-gray-200 break-words">
                      {insight.title}
                    </h4>
                    <span
                      className={`flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        PRIORITY_BADGE[insight.priority] ?? PRIORITY_BADGE.medium
                      }`}
                    >
                      {insight.priority}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-400">
                    {insight.description}
                  </p>
                  {insight.actionUrl && insight.actionLabel && (
                    <a
                      href={insight.actionUrl}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                    >
                      {insight.actionLabel}
                      <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-0.5">
                  {!insight.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(insight.id)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200/50 hover:text-gray-600 dark:hover:bg-gray-600/50"
                      title="Mark as read"
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => dismissMutation.mutate(insight.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200/50 hover:text-gray-600 dark:hover:bg-gray-600/50"
                    title="Dismiss"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
