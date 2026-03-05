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
import { ChartTooltip } from '@/components/ui';
import { useChartColors } from '@/hooks/useChartColors';

interface GoalVelocityProps {
  goals: Array<{ id: string; title: string; progress: number }> | undefined;
  goalRisks: GoalRiskResult[] | undefined;
}

function GoalVelocity({ goals, goalRisks }: GoalVelocityProps) {
  const cc = useChartColors();
  if (!goals?.length || !goalRisks?.length) return null;

  // Merge goal titles with risk data — truncate long names for Y-axis readability
  const chartData = goalRisks.slice(0, 6).map((risk) => {
    const goal = goals.find((g) => g.id === risk.goalId);
    const fullTitle = goal?.title ?? risk.goalTitle;
    const name = fullTitle.length > 38 ? fullTitle.slice(0, 36) + '…' : fullTitle;
    return {
      name,
      fullTitle,
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
    <div className="glass-deep rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BoltIcon className="w-5 h-5 text-cyan-500" />
          <h3 className="text-sm font-bold text-secondary-700 dark:text-secondary-300">Goal Velocity</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-bold ${onTrackCount === totalCount ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {onTrackCount}/{totalCount}
          </span>
          <span className="text-xs text-secondary-500 dark:text-secondary-400">on track</span>
        </div>
      </div>

      <div style={{ height: Math.max(120, chartData.length * 60 + 30) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 16, bottom: 10 }}
            barGap={4}
            barSize={18}
          >
            <XAxis
              type="number"
              tick={{   fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={180}
              tick={{   fontSize: 11, fontWeight: 600, fill: 'var(--color-secondary-300, #cbd5e1)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip isAnimationActive={false} content={<ChartTooltip unit="%/day" />} cursor={{ fill: cc.cursorFill }} />
            <ReferenceLine x={0} stroke="var(--color-secondary-300, #cbd5e1)" strokeOpacity={0.3} />
            <Bar dataKey="required" name="Required" radius={[0, 4, 4, 0]} opacity={0.3}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.onTrack ? cc.semantic.success : cc.semantic.danger} />
              ))}
            </Bar>
            <Bar dataKey="current" name="Current" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.onTrack ? cc.semantic.success : cc.semantic.danger} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm font-medium">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cc.semantic.success }} />
          <span style={{ color: cc.semantic.success }}>On Track</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cc.semantic.danger }} />
          <span style={{ color: cc.semantic.danger }}>Behind</span>
        </div>
        <span className="ml-auto text-secondary-600 dark:text-secondary-300">Solid = current, Faded = required velocity</span>
      </div>
    </div>
  );
}

export default GoalVelocity;
