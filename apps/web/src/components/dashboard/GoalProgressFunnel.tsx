import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useChartColors } from '@/hooks/useChartColors';
import { ChartTooltip } from '@/components/ui';

interface Goal {
  id: string;
  status: string;
  progress?: number;
  [key: string]: unknown;
}

interface GoalProgressFunnelProps {
  goals: Goal[];
  className?: string;
}

const STAGE_ORDER = ['NOT_STARTED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'] as const;

const STAGE_LABELS: Record<string, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  AT_RISK: 'At Risk',
  COMPLETED: 'Completed',
};

export default function GoalProgressFunnel({ goals, className = '' }: GoalProgressFunnelProps) {
  const cc = useChartColors();

  const STAGE_COLORS: Record<string, string> = {
    NOT_STARTED: cc.semantic.neutral,
    IN_PROGRESS: cc.primary,
    AT_RISK: cc.semantic.warning,
    COMPLETED: cc.semantic.success,
  };

  const data = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGE_ORDER.forEach((s) => (counts[s] = 0));

    (goals ?? []).forEach((g) => {
      const status = g.status?.toUpperCase().replace(/\s+/g, '_') ?? 'NOT_STARTED';
      if (status in counts) counts[status]++;
      else if (status === 'OVERDUE' || status === 'DELAYED') counts['AT_RISK']++;
      else counts['IN_PROGRESS']++;
    });

    return STAGE_ORDER.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: counts[stage],
    }));
  }, [goals]);

  const total = goals?.length ?? 0;

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Goal Progress Funnel</h3>
        <span className="text-2xs text-slate-500 dark:text-slate-400">{total} goals</span>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={cc.gridColor} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }}
            width={80}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
          <Bar dataKey="count" name="Goals" radius={[0, 4, 4, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
