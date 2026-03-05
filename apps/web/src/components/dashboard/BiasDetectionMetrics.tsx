import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { analyticsApi } from '@/lib/api/analytics';
import { useChartColors } from '@/hooks/useChartColors';
import { ChartTooltip } from '@/components/ui';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';

interface BiasDetectionMetricsProps {
  cycleId?: string;
  className?: string;
}

export default function BiasDetectionMetrics({ cycleId, className = '' }: BiasDetectionMetricsProps) {
  const cc = useChartColors();
  const { pollingInterval } = useLiveDashboard();

  const { data: metrics } = useQuery({
    queryKey: ['bias-metrics', cycleId],
    queryFn: () => analyticsApi.getBiasMetrics(cycleId),
    staleTime: 300_000,
    refetchInterval: pollingInterval || undefined,
  });

  // Group by dimension, show avg rating per category within each dimension
  const dimensions = new Map<string, { category: string; avgRating: number; count: number }[]>();
  (metrics ?? []).forEach((m) => {
    if (!dimensions.has(m.dimension)) dimensions.set(m.dimension, []);
    dimensions.get(m.dimension)!.push({
      category: m.category,
      avgRating: m.avgRating,
      count: m.count,
    });
  });

  // Flatten to chart data: one row per dimension with category bars
  const allCategories = new Set<string>();
  (metrics ?? []).forEach((m) => allCategories.add(m.category));
  const categories = Array.from(allCategories).slice(0, 5); // Max 5 categories

  const palette = cc.palette(categories.length);

  const chartData = Array.from(dimensions.entries()).map(([dimension, items]) => {
    const row: Record<string, unknown> = { dimension };
    items.forEach((item) => {
      row[item.category] = Number(Number(item.avgRating ?? 0).toFixed(2));
    });
    return row;
  });

  return (
    <div className={`glass-deep rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Bias Detection Metrics</h3>
        <span className="text-2xs text-slate-500 dark:text-slate-400">{dimensions.size} dimensions</span>
      </div>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={cc.gridColor} />
            <XAxis
              dataKey="dimension"
              tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis
              domain={[0, 5]}
              tick={{ fontSize: 11, fontWeight: 600, fill: cc.tickColor }}
              label={{ value: 'Avg Rating', angle: -90, position: 'insideLeft', fontSize: 10, fill: cc.tickColor }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: cc.cursorFill }} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span className="text-2xs text-slate-600 dark:text-slate-300">{value}</span>
              )}
            />
            {categories.map((cat, i) => (
              <Bar
                key={cat}
                dataKey={cat}
                name={cat}
                fill={palette[i]}
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">
          No bias metrics available
        </div>
      )}
    </div>
  );
}
