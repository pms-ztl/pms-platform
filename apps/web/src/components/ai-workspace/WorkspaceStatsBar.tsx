/**
 * WorkspaceStatsBar - Compact top stats bar for the AI Workspace.
 * Theme-aware.
 */

import { useQuery } from '@tanstack/react-query';
import {
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { aiApi } from '@/lib/api';
import { useAIWorkspaceStore } from '@/store/ai-workspace';
import * as T from './ai-theme';

export function WorkspaceStatsBar() {
  const { data: usage } = useQuery({
    queryKey: ['ai', 'usage'],
    queryFn: () => aiApi.getUsage(),
    refetchInterval: 60_000,
  });

  const { theme } = useAIWorkspaceStore();

  const stats = [
    { icon: ChatBubbleLeftRightIcon, label: 'Conversations', value: usage?.conversations ?? 0 },
    { icon: LightBulbIcon, label: 'Insights', value: usage?.insights ?? 0 },
    { icon: BoltIcon, label: 'Messages', value: usage?.messages ?? 0 },
  ];

  return (
    <div className={`flex items-center gap-6 rounded-xl border px-5 py-2.5 glass-refraction ${T.surface(theme)}`}>
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <stat.icon className={`h-4 w-4 ${T.textSecondary(theme)}`} />
          <span className={`text-xs ${T.textSecondary(theme)}`}>{stat.label}</span>
          <span className={`text-sm font-semibold tabular-nums ${T.textPrimary(theme)} counter-reveal`}>
            {stat.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
