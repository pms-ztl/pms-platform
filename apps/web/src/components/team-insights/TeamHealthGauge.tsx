import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
} from 'recharts';
import clsx from 'clsx';

interface TeamHealthGaugeProps {
  score: number;
  flightRiskCount: number;
  turnoverRate: number;
  retentionRate: number;
  className?: string;
}

function getHealthColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

function getHealthLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Attention';
}

export function TeamHealthGauge({ score, flightRiskCount, turnoverRate, retentionRate, className }: TeamHealthGaugeProps) {
  const fillColor = getHealthColor(score);
  const label = getHealthLabel(score);

  const gaugeData = [{ value: score, fill: fillColor }];

  const stats = [
    { label: 'Flight Risk', value: flightRiskCount, color: flightRiskCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400' },
    { label: 'Turnover', value: `${Number(turnoverRate ?? 0).toFixed(1)}%`, color: Number(turnoverRate) > 15 ? 'text-amber-600 dark:text-amber-400' : 'text-secondary-700 dark:text-secondary-300' },
    { label: 'Retention', value: `${Number(retentionRate ?? 0).toFixed(1)}%`, color: Number(retentionRate) >= 85 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400' },
  ];

  return (
    <div className={clsx('bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Team Health</h3>
      <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Organization health contribution</p>

      {/* Gauge */}
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            barSize={18}
            data={gaugeData}
            startAngle={225}
            endAngle={-45}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              background={{ fill: 'rgba(148,163,184,0.15)' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color: fillColor }}>{Math.round(score)}</span>
          <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">{label}</span>
        </div>
      </div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center p-2 rounded-lg bg-secondary-50 dark:bg-secondary-700/40">
            <p className={clsx('text-lg font-bold', stat.color)}>{stat.value}</p>
            <p className="text-2xs text-secondary-500 dark:text-secondary-400 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
