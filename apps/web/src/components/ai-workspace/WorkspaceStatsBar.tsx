/**
 * WorkspaceStatsBar - Compact top stats bar for the AI Workspace.
 *
 * Displays a single-line row of key AI usage metrics:
 * - Conversations today
 * - Insights generated
 * - Total tokens used
 *
 * Data comes from aiApi.getUsage().
 */

import { useQuery } from '@tanstack/react-query';
import {
  ChatBubbleLeftRightIcon,
  LightBulbIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { aiApi } from '@/lib/api';

export function WorkspaceStatsBar() {
  const { data: usage } = useQuery({
    queryKey: ['ai', 'usage'],
    queryFn: () => aiApi.getUsage(),
    refetchInterval: 60_000,
  });

  const stats = [
    {
      icon: ChatBubbleLeftRightIcon,
      label: 'Conversations',
      value: usage?.conversations ?? 0,
    },
    {
      icon: LightBulbIcon,
      label: 'Insights',
      value: usage?.insights ?? 0,
    },
    {
      icon: BoltIcon,
      label: 'Messages',
      value: usage?.messages ?? 0,
    },
  ];

  return (
    <div className="flex items-center gap-6 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 px-5 py-2.5">
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center gap-2">
          <stat.icon className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-400">{stat.label}</span>
          <span className="text-sm font-semibold text-white tabular-nums">
            {stat.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
