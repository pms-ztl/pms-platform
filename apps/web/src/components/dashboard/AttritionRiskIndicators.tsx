import { useQuery } from '@tanstack/react-query';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis,
} from 'recharts';
import { engagementApi } from '@/lib/api/engagement';
import { useChartColors } from '@/hooks/useChartColors';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface AttritionRiskIndicatorsProps {
  className?: string;
}

const RISK_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#22c55e',
};

export default function AttritionRiskIndicators({ className = '' }: AttritionRiskIndicatorsProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data } = useQuery({
    queryKey: ['engagement-at-risk'],
    queryFn: () => engagementApi.getAtRisk({ limit: 100 }),
    staleTime: 120_000,
    refetchInterval: pollingInterval || undefined,
  });

  const employees = (data?.employees ?? []).map((e) => ({
    name: `${e.firstName} ${e.lastName}`,
    engagement: e.overallScore ?? 0,
    risk: e.riskLevel ?? 'LOW',
    department: e.department ?? 'Unknown',
    color: RISK_COLORS[e.riskLevel ?? 'LOW'] ?? RISK_COLORS.LOW,
  }));

  const highRisk = employees.filter((e) => e.risk === 'HIGH').length;
  const medRisk = employees.filter((e) => e.risk === 'MEDIUM').length;

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Attrition Risk Map</h3>
        <div className="flex gap-2">
          {highRisk > 0 && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
              {highRisk} High
            </span>
          )}
          {medRisk > 0 && (
            <span className="text-2xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
              {medRisk} Medium
            </span>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ left: 0, right: 12, top: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={cc.gridColor} />
          <XAxis
            type="number"
            dataKey="engagement"
            name="Engagement"
            domain={[0, 100]}
            tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }}
            label={{ value: 'Engagement Score', position: 'bottom', fontSize: 10, fill: cc.tickColor }}
          />
          <YAxis
            type="category"
            dataKey="risk"
            name="Risk"
            tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }}
            width={60}
          />
          <ZAxis range={[40, 120]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="glass-deep rounded-lg px-3 py-2 text-xs shadow-lg border border-white/10">
                  <p className="font-semibold text-slate-800 dark:text-white">{d.name}</p>
                  <p className="text-slate-500 dark:text-slate-400">{d.department}</p>
                  <p className="mt-1">
                    Engagement: <span className="font-semibold">{d.engagement}</span>
                  </p>
                  <p>
                    Risk: <span className="font-semibold" style={{ color: d.color }}>{d.risk}</span>
                  </p>
                </div>
              );
            }}
          />
          {['HIGH', 'MEDIUM', 'LOW'].map((risk) => (
            <Scatter
              key={risk}
              name={risk}
              data={employees.filter((e) => e.risk === risk)}
              fill={RISK_COLORS[risk]}
              opacity={0.8}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
