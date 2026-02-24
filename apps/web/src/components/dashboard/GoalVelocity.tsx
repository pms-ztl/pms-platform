import { BoltIcon } from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

import type { GoalRiskResult } from '@/lib/api/analytics';

interface GoalVelocityProps {
  goals: Array<{ id: string; title: string; progress: number }> | undefined;
  goalRisks: GoalRiskResult[] | undefined;
}

function GoalVelocity({ goals, goalRisks }: GoalVelocityProps) {
  if (!goals?.length || !goalRisks?.length) return null;

  // Merge goal titles with risk data
  const chartData = goalRisks.slice(0, 6).map((risk) => {
    const goal = goals.find((g) => g.id === risk.goalId);
    const title = goal?.title ?? risk.goalTitle;
    return {
      name: title,
      fullTitle: title,
      current: Math.round(risk.currentVelocity * 100) / 100,
      required: Math.round(risk.requiredVelocity * 100) / 100,
      onTrack: risk.currentVelocity >= risk.requiredVelocity,
      daysRemaining: risk.daysRemaining,
      riskLevel: risk.riskLevel,
    };
  });

  const onTrackCount = chartData.filter((d) => d.onTrack).length;
  const totalCount = chartData.length;

  return (
    <div className="glass-deep rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-cyan-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Goal Velocity</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${onTrackCount === totalCount ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {onTrackCount}/{totalCount}
          </span>
          <span className="text-xs text-secondary-500 dark:text-secondary-400">on track</span>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
            barGap={2}
            barSize={8}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #94a3b8)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              tick={{ fontSize: 10, fill: 'var(--color-secondary-500, #64748b)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.80)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                borderRadius: '0.75rem',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                fontSize: '0.75rem',
                color: '#f1f5f9',
              }}
              labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(value: number, name: string) => [
                `${value}%/day`,
                name === 'current' ? 'Current Velocity' : 'Required Velocity',
              ]}
              labelFormatter={(label) => {
                const item = chartData.find((d) => d.name === label);
                return item?.fullTitle ?? label;
              }}
            />
            <ReferenceLine x={0} stroke="var(--color-secondary-300, #cbd5e1)" strokeOpacity={0.3} />
            <Bar dataKey="required" name="required" radius={[0, 4, 4, 0]} opacity={0.3}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.onTrack ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
            <Bar dataKey="current" name="current" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.onTrack ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2 text-[11px] text-secondary-400 dark:text-secondary-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          On Track
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          Behind
        </div>
        <span className="ml-auto">Solid = current, Faded = required velocity</span>
      </div>
    </div>
  );
}

export default GoalVelocity;
