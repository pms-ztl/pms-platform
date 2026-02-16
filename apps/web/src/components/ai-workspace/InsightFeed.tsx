/**
 * InsightFeed - Right panel showing live AI insight cards.
 *
 * Each card has a priority badge (Critical / Warning / Info), icon, title,
 * brief description, relative timestamp, and dismiss button. Cards animate
 * in from the right on mount. Data is fetched from aiApi.getInsights() and
 * refreshed every 2 minutes.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  XMarkIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { aiApi, type AIInsightCard } from '@/lib/api';

// ── Priority Config ───────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  string,
  { badge: string; badgeText: string; dotColor: string }
> = {
  critical: {
    badge: 'bg-red-500/20 text-red-300 border-red-500/30',
    badgeText: 'Critical',
    dotColor: 'bg-red-500',
  },
  high: {
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    badgeText: 'High',
    dotColor: 'bg-orange-500',
  },
  medium: {
    badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    badgeText: 'Warning',
    dotColor: 'bg-yellow-500',
  },
  low: {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    badgeText: 'Info',
    dotColor: 'bg-emerald-500',
  },
};

// ── Agent Icons ───────────────────────────────────────────────

const AGENT_ICONS: Record<string, string> = {
  performance: '\uD83C\uDFAF',
  analytics: '\uD83D\uDCCA',
  feedback: '\uD83D\uDCAC',
  hr: '\uD83D\uDC65',
  report: '\uD83D\uDCCB',
  goals: '\uD83C\uDFC6',
  onboarding: '\uD83C\uDF93',
  security: '\uD83D\uDD12',
  notification: '\uD83D\uDD14',
};

// ── Relative Timestamp ────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// ── Keyframes for entry animation ─────────────────────────────

const entryKeyframes = `
@keyframes ai-insight-slide-in {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
`;

// ── Props ─────────────────────────────────────────────────────

interface InsightFeedProps {
  className?: string;
}

// ── Component ─────────────────────────────────────────────────

export function InsightFeed({ className = '' }: InsightFeedProps) {
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['ai', 'insights'],
    queryFn: () => aiApi.getInsights({ limit: 20 }),
    refetchInterval: 2 * 60_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => aiApi.markInsightRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }),
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => aiApi.dismissInsight(id),
    onMutate: async (id) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['ai', 'insights'] });
      const prev = queryClient.getQueryData<AIInsightCard[]>(['ai', 'insights']);
      queryClient.setQueryData<AIInsightCard[]>(
        ['ai', 'insights'],
        (old) => old?.filter((i) => i.id !== id) ?? [],
      );
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['ai', 'insights'], context.prev);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }),
  });

  const insights: AIInsightCard[] = Array.isArray(data) ? data : [];

  if (collapsed) {
    return (
      <div className={`flex flex-col items-center py-3 ${className}`}>
        <button
          onClick={() => setCollapsed(false)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all duration-200"
          title="Expand insights"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {insights.length > 0 && (
          <div className="mt-2 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500/20 text-xs font-bold text-purple-300">
            {insights.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <style>{entryKeyframes}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Insights</h2>
          {insights.length > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-purple-500/20 px-1.5 text-xs font-bold text-purple-300">
              {insights.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-colors"
          title="Collapse panel"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Insight Cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-white/5 border border-white/5"
              />
            ))}
          </>
        )}

        {!isLoading && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 mb-3">
              <SparklesIcon className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-xs text-gray-500">No insights right now</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Everything looks good!
            </p>
          </div>
        )}

        {insights.map((insight, index) => {
          const priority =
            PRIORITY_CONFIG[insight.priority] ?? PRIORITY_CONFIG.low;
          const agentIcon =
            AGENT_ICONS[insight.agentType] ?? '\u2728';

          return (
            <div
              key={insight.id}
              className={`group relative rounded-xl border border-white/10 bg-white/[0.04] p-3 transition-all duration-300 hover:bg-white/[0.07] hover:border-white/15 ${
                !insight.isRead ? 'ring-1 ring-purple-500/20' : ''
              }`}
              style={{
                animation: `ai-insight-slide-in 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              {/* Top row: agent icon + title + priority badge */}
              <div className="flex items-start gap-2">
                <span className="text-base flex-shrink-0 mt-0.5">{agentIcon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h4 className="text-xs font-semibold text-white truncate">
                      {insight.title}
                    </h4>
                    <span
                      className={`flex-shrink-0 rounded-full border px-1.5 py-0 text-[9px] font-medium ${priority.badge}`}
                    >
                      {priority.badgeText}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-2">
                    {insight.description}
                  </p>
                </div>
              </div>

              {/* Bottom row: timestamp + actions */}
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                <span className="text-[10px] text-gray-600">
                  {timeAgo(insight.createdAt)}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {!insight.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(insight.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white/10 hover:text-gray-300 transition-colors"
                      title="Mark as read"
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => dismissMutation.mutate(insight.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:bg-white/10 hover:text-red-400 transition-colors"
                    title="Dismiss"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Unread dot */}
              {!insight.isRead && (
                <div
                  className={`absolute top-2 right-2 h-2 w-2 rounded-full ${priority.dotColor} animate-pulse`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
