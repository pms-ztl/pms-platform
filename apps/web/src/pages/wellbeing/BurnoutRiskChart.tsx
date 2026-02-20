import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import clsx from 'clsx';

interface BurnoutDataPoint {
  date: string;
  energy: number;
  stress: number;
}

interface BurnoutRiskChartProps {
  data: BurnoutDataPoint[];
  className?: string;
}

function riskColor(energy: number, stress: number): string {
  if (stress >= 3.5 && energy <= 2.5) return '#ef4444'; // High risk
  if (stress >= 3 && energy <= 3) return '#f59e0b'; // Moderate risk
  return '#22c55e'; // Low risk
}

export function BurnoutRiskChart({ data, className }: BurnoutRiskChartProps) {
  if (data.length === 0) {
    return (
      <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Burnout Risk Indicator</h3>
        <p className="text-sm text-secondary-400 text-center py-16">No trend data available for burnout analysis.</p>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Burnout Risk Indicator</h3>
      <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Stress vs Energy — high stress + low energy = burnout risk</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
            <XAxis
              type="number"
              dataKey="energy"
              domain={[1, 5]}
              tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
              axisLine={false}
              tickLine={false}
              label={{ value: 'Energy Level →', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#9ca3af' }}
            />
            <YAxis
              type="number"
              dataKey="stress"
              domain={[1, 5]}
              tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
              axisLine={false}
              tickLine={false}
              label={{ value: '← Stress Level', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fill: '#9ca3af' }}
            />
            {/* Danger zone: high stress + low energy */}
            <ReferenceArea x1={1} x2={2.5} y1={3.5} y2={5} fill="#ef4444" fillOpacity={0.08} />
            {/* Caution zone */}
            <ReferenceArea x1={1} x2={3} y1={3} y2={3.5} fill="#f59e0b" fillOpacity={0.06} />
            <ReferenceArea x1={2.5} x2={3} y1={3.5} y2={5} fill="#f59e0b" fillOpacity={0.06} />
            {/* Safe zone: low stress + high energy */}
            <ReferenceArea x1={3.5} x2={5} y1={1} y2={2.5} fill="#22c55e" fillOpacity={0.06} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as BurnoutDataPoint;
                const risk = d.stress >= 3.5 && d.energy <= 2.5 ? 'High' : d.stress >= 3 && d.energy <= 3 ? 'Moderate' : 'Low';
                return (
                  <div className="rounded-lg border border-secondary-200 bg-white px-3 py-2 shadow-lg dark:border-secondary-700 dark:bg-secondary-800 text-xs space-y-1">
                    <p className="font-semibold text-secondary-900 dark:text-white">{d.date}</p>
                    <p className="text-secondary-500 dark:text-secondary-400">Energy: {(d.energy ?? 0).toFixed(1)}</p>
                    <p className="text-secondary-500 dark:text-secondary-400">Stress: {(d.stress ?? 0).toFixed(1)}</p>
                    <p style={{ color: riskColor(d.energy, d.stress) }}>Risk: {risk}</p>
                  </div>
                );
              }}
            />
            <Scatter
              data={data}
              fill="#6366f1"
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                const color = riskColor(payload.energy, payload.stress);
                return <circle cx={cx} cy={cy} r={5} fill={color} stroke={color} strokeWidth={1} fillOpacity={0.7} />;
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px]">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />High Risk</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />Moderate</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />Low Risk</span>
      </div>
    </div>
  );
}
