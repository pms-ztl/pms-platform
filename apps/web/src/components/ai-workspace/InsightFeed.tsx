/**
 * InsightFeed - Right panel showing live AI insight cards.
 * Theme-aware: adapts colors based on light/dark/deep-dark.
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
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import * as T from './ai-theme';
import { ProactivePopout } from './FuturisticEffects';
import { getAgentIcon } from './agentIconMap';

// ── Priority Config ───────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { badge: string; badgeText: string; dotColor: string }> = {
  critical: { badge: 'bg-red-500/20 text-red-300 border-red-500/30', badgeText: 'Critical', dotColor: 'bg-red-500' },
  high: { badge: 'bg-orange-500/20 text-orange-300 border-orange-500/30', badgeText: 'High', dotColor: 'bg-orange-500' },
  medium: { badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30', badgeText: 'Warning', dotColor: 'bg-yellow-500' },
  low: { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', badgeText: 'Info', dotColor: 'bg-emerald-500' },
};

const PRIORITY_CONFIG_LIGHT: Record<string, { badge: string; badgeText: string; dotColor: string }> = {
  critical: { badge: 'bg-red-100 text-red-700 border-red-200', badgeText: 'Critical', dotColor: 'bg-red-500' },
  high: { badge: 'bg-orange-100 text-orange-700 border-orange-200', badgeText: 'High', dotColor: 'bg-orange-500' },
  medium: { badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', badgeText: 'Warning', dotColor: 'bg-yellow-500' },
  low: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', badgeText: 'Info', dotColor: 'bg-emerald-500' },
};

function timeAgo(dateStr: string): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

const entryKeyframes = `
@keyframes ai-insight-slide-in {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
`;

interface InsightFeedProps { className?: string; }

export function InsightFeed({ className = '' }: InsightFeedProps) {
  const [collapsed, setCollapsed] = useState(false);
  const queryClient = useQueryClient();
  const { theme } = useAIWorkspaceStore();

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
      await queryClient.cancelQueries({ queryKey: ['ai', 'insights'] });
      const prev = queryClient.getQueryData<AIInsightCard[]>(['ai', 'insights']);
      queryClient.setQueryData<AIInsightCard[]>(['ai', 'insights'], (old) => old?.filter((i) => i.id !== id) ?? []);
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(['ai', 'insights'], context.prev);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ai', 'insights'] }),
  });

  const insights: AIInsightCard[] = Array.isArray(data) ? data : [];
  const priorityMap = theme === 'light' ? PRIORITY_CONFIG_LIGHT : PRIORITY_CONFIG;

  if (collapsed) {
    return (
      <div className={`flex flex-col items-center py-3 ${className}`}>
        <button
          onClick={() => setCollapsed(false)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
            theme === 'light' ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
          }`}
          title="Expand insights"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        {insights.length > 0 && (
          <div className={`mt-2 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${T.accentBg(theme)} ${T.accentText(theme)}`}>
            {insights.length}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      <style>{entryKeyframes}</style>

      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className={`h-4 w-4 ${T.accentText(theme)}`} />
          <h2 className={`text-sm font-semibold ${T.textPrimary(theme)}`}>Insights</h2>
          {insights.length > 0 && (
            <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${T.accentBg(theme)} ${T.accentText(theme)}`}>
              {insights.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
            theme === 'light' ? 'text-gray-400 hover:bg-gray-100' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
          }`}
          title="Collapse panel"
        >
          <ChevronRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className={`flex-1 overflow-y-auto px-3 pb-3 space-y-2 ${T.scrollbar(theme)}`}>
        {isLoading && [1, 2, 3].map((i) => (
          <div key={i} className={`h-24 animate-pulse rounded-xl ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'} border ${T.borderLight(theme)}`} />
        ))}

        {!isLoading && insights.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme === 'light' ? 'bg-gray-100' : 'bg-white/5'} mb-3`}>
              <SparklesIcon className={`h-6 w-6 ${T.textMuted(theme)}`} />
            </div>
            <p className={`text-xs ${T.textMuted(theme)}`}>No insights right now</p>
            <p className={`text-[10px] ${T.textMuted(theme)} mt-1`}>Everything looks good!</p>
          </div>
        )}

        {insights.map((insight, index) => {
          const priority = priorityMap[insight.priority] ?? priorityMap.low;
          const AgentIcon = getAgentIcon(insight.agentType);
          const isCritical = insight.priority === 'critical' || insight.priority === 'high';

          return (
            <ProactivePopout key={insight.id} from="right" delay={index * 80}>
            <div
              className={`group relative rounded-xl border p-3 transition-all duration-300 ${
                isCritical ? 'holo-shimmer-ai' : ''
              } ${
                theme === 'light'
                  ? `border-gray-200 bg-white ${!insight.isRead ? 'ring-1 ring-blue-200' : ''} hover:bg-gray-50`
                  : `border-white/10 bg-white/[0.04] ${!insight.isRead ? 'ring-1 ring-purple-500/20' : ''} hover:bg-white/[0.07]`
              } ${isCritical && !insight.isRead ? 'bioluminescent-subtle' : ''}`}
            >
              <div className="flex items-start gap-2">
                <AgentIcon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${T.accentText(theme)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h4 className={`text-xs font-semibold break-words ${T.textPrimary(theme)}`}>{insight.title}</h4>
                    <span className={`flex-shrink-0 rounded-full border px-1.5 py-0 text-[9px] font-medium ${priority.badge}`}>
                      {priority.badgeText}
                    </span>
                  </div>
                  <p className={`text-[11px] leading-relaxed ${T.textSecondary(theme)}`}>{insight.description}</p>
                </div>
              </div>

              <div className={`flex items-center justify-between mt-2 pt-1.5 border-t ${T.borderLight(theme)}`}>
                <span className={`text-[10px] ${T.textMuted(theme)}`}>{timeAgo(insight.createdAt)}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {!insight.isRead && (
                    <button
                      onClick={() => markReadMutation.mutate(insight.id)}
                      className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                        theme === 'light' ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600' : 'text-gray-500 hover:bg-white/10 hover:text-gray-300'
                      }`}
                      title="Mark as read"
                    >
                      <EyeIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => dismissMutation.mutate(insight.id)}
                    className={`flex h-6 w-6 items-center justify-center rounded-md transition-colors ${
                      theme === 'light' ? 'text-gray-400 hover:bg-red-50 hover:text-red-500' : 'text-gray-500 hover:bg-white/10 hover:text-red-400'
                    }`}
                    title="Dismiss"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {!insight.isRead && (
                <div className={`absolute top-2 right-2 h-2 w-2 rounded-full ${priority.dotColor} animate-pulse`} />
              )}
            </div>
            </ProactivePopout>
          );
        })}
      </div>
    </div>
  );
}
