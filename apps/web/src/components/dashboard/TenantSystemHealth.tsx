import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { healthApi } from '@/lib/api/health';
import { useChartColors } from '@/hooks/useChartColors';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface TenantSystemHealthProps {
  className?: string;
}

interface HealthMetric {
  label: string;
  value: number;
  color: string;
}

export default function TenantSystemHealth({ className = '' }: TenantSystemHealthProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data: health } = useQuery({
    queryKey: ['health-latest'],
    queryFn: () => healthApi.getLatest(),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  function scoreColor(score: number): string {
    if (score >= 80) return cc.semantic.success;
    if (score >= 60) return cc.semantic.info;
    if (score >= 40) return cc.semantic.warning;
    return cc.semantic.danger;
  }

  const n = (v: unknown) => Number(v ?? 0) || 0;

  const metrics: HealthMetric[] = health
    ? [
        { label: 'Overall', value: n(health.overallHealthScore), color: scoreColor(n(health.overallHealthScore)) },
        { label: 'Engagement', value: n(health.engagementScore), color: scoreColor(n(health.engagementScore)) },
        { label: 'Performance', value: n(health.performanceScore), color: scoreColor(n(health.performanceScore)) },
        { label: 'Culture', value: n(health.cultureScore), color: scoreColor(n(health.cultureScore)) },
        { label: 'Leadership', value: n(health.leadershipScore), color: scoreColor(n(health.leadershipScore)) },
        { label: 'Wellbeing', value: n(health.wellbeingScore), color: scoreColor(n(health.wellbeingScore)) },
      ]
    : [];

  const level = health?.healthLevel ?? 'N/A';
  const trend = health?.trendDirection;

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">System Health Overview</h3>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-2xs font-medium ${
              trend === 'IMPROVING' ? 'text-emerald-600 dark:text-emerald-400' :
              trend === 'DECLINING' ? 'text-red-600 dark:text-red-400' :
              'text-slate-500'
            }`}>
              {trend === 'IMPROVING' ? '↑' : trend === 'DECLINING' ? '↓' : '→'} {trend}
            </span>
          )}
          <span
            className="text-2xs px-1.5 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: `${metrics[0]?.color ?? cc.primary}20`,
              color: metrics[0]?.color ?? cc.primary,
            }}
          >
            {level}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <MiniGauge key={m.label} metric={m} gridColor={cc.gridColor} />
        ))}
      </div>
      {health && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{health.headcount}</p>
            <p className="text-2xs text-slate-500">Headcount</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{n(health.retentionRate).toFixed(1)}%</p>
            <p className="text-2xs text-slate-500">Retention</p>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{health.flightRiskCount}</p>
            <p className="text-2xs text-slate-500">Flight Risk</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniGauge({ metric, gridColor }: { metric: HealthMetric; gridColor: string }) {
  const data = [{ value: metric.value, fill: metric.color }];

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full" style={{ height: 64 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="100%"
            innerRadius="60%"
            outerRadius="90%"
            startAngle={180}
            endAngle={0}
            barSize={6}
            data={data}
          >
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: gridColor }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-end justify-center pb-0">
          <span className="text-xs font-bold text-slate-800 dark:text-white">{Math.round(metric.value)}</span>
        </div>
      </div>
      <span className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">{metric.label}</span>
    </div>
  );
}
