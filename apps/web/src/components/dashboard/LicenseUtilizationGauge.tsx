import { useQuery } from '@tanstack/react-query';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { licenseApi } from '@/lib/api/admin';
import { useChartColors } from '@/hooks/useChartColors';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface LicenseUtilizationGaugeProps {
  className?: string;
}

export default function LicenseUtilizationGauge({ className = '' }: LicenseUtilizationGaugeProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data: usage } = useQuery({
    queryKey: ['license-usage'],
    queryFn: () => licenseApi.getUsage(),
    staleTime: 300_000,
    refetchInterval: pollingInterval || undefined,
  });

  const pct = usage?.usagePercent ?? 0;
  const active = usage?.activeUsers ?? 0;
  const total = usage?.licenseCount ?? 0;
  const remaining = usage?.remaining ?? 0;

  // Color based on utilization
  let gaugeColor = cc.semantic.success;
  let statusLabel = 'Healthy';
  if (pct >= 90) {
    gaugeColor = cc.semantic.danger;
    statusLabel = 'Critical';
  } else if (pct >= 75) {
    gaugeColor = cc.semantic.warning;
    statusLabel = 'High Usage';
  } else if (pct >= 50) {
    gaugeColor = cc.primary;
    statusLabel = 'Moderate';
  }

  const data = [{ value: pct, fill: gaugeColor }];

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">License Utilization</h3>
        <span
          className="text-2xs px-1.5 py-0.5 rounded-full font-medium"
          style={{
            backgroundColor: `${gaugeColor}20`,
            color: gaugeColor,
          }}
        >
          {statusLabel}
        </span>
      </div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={160}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="85%"
            startAngle={180}
            endAngle={0}
            barSize={12}
            data={data}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: cc.gridColor }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '-10%' }}>
          <span className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(pct)}%</span>
          <span className="text-2xs text-slate-500 dark:text-slate-400">utilization</span>
        </div>
      </div>
      <div className="flex justify-around mt-1 text-center">
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{active}</p>
          <p className="text-2xs text-slate-500">Active</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{total}</p>
          <p className="text-2xs text-slate-500">Total</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{remaining}</p>
          <p className="text-2xs text-slate-500">Available</p>
        </div>
      </div>
    </div>
  );
}
