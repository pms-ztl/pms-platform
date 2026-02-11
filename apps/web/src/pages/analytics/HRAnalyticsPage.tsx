import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarSquareIcon,
  ScaleIcon,
  AdjustmentsHorizontalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import {
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { api } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types (matching backend API response shapes)
// ---------------------------------------------------------------------------

interface CompEmployee {
  id: string;
  name: string;
  department: string;
  rating: number;
  compensation: number;
  expectedComp: number;
}

interface CompTier {
  label: string;
  avgComp: number;
}

interface DeptCompRatio {
  department: string;
  avgComp: number;
  ratio: string;
  count: number;
}

interface CompensationData {
  employees: CompEmployee[];
  medianComp: number;
  trendLine: { slope: number; intercept: number };
  tiers: CompTier[];
  deptRatios: DeptCompRatio[];
}

interface DeptRatingDist {
  department: string;
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
  mean: number;
  stdDev: number;
}

interface ManagerRating {
  manager: string;
  avgRating: number;
  reviewCount: number;
  label: 'lenient' | 'neutral' | 'severe';
}

interface DemographicRow {
  grouping: string;
  category: string;
  count: number;
  avgRating: number;
  stdDev: number;
}

interface BiasData {
  deptDistribution: DeptRatingDist[];
  managerRatings: ManagerRating[];
  demographic: DemographicRow[];
  overallMean: number;
}

interface NormEmployee {
  id: string;
  name: string;
  department: string;
  originalRating: number;
  zScore: number;
  normalizedRating: number;
  adjustment: number;
}

interface DistBucket {
  rating: string;
  original: number;
  normalized: number;
}

interface NormalizationData {
  employees: NormEmployee[];
  distribution: DistBucket[];
  bellCurveMetrics: {
    rSquared: number;
    skewness: number;
    kurtosis: number;
  };
}

// ---------------------------------------------------------------------------
// Department color palette
// ---------------------------------------------------------------------------

const DEPT_COLORS: Record<string, string> = {
  Engineering: '#3b82f6',
  Marketing: '#8b5cf6',
  Sales: '#f59e0b',
  Finance: '#10b981',
  'Human Resources': '#ec4899',
  Product: '#06b6d4',
  Design: '#f97316',
  Operations: '#6366f1',
};

const RATING_BAR_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

const getDeptColor = (dept: string): string => DEPT_COLORS[dept] ?? '#6b7280';

// ---------------------------------------------------------------------------
// Custom Scatter Tooltip
// ---------------------------------------------------------------------------

function CompScatterTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-secondary-900 text-white text-xs rounded-lg shadow-lg p-3 border border-secondary-700">
      <p className="font-semibold text-sm mb-1">{d.name}</p>
      <p className="text-secondary-300">{d.department}</p>
      <div className="mt-2 space-y-1">
        <p>Rating: <span className="font-medium text-primary-400">{d.rating}</span></p>
        <p>Compensation: <span className="font-medium text-green-400">${d.compensation.toLocaleString()}</span></p>
        <p>% from Median: <span className={clsx('font-medium', Number(d.pctFromMedian) >= 0 ? 'text-green-400' : 'text-red-400')}>{d.pctFromMedian}%</span></p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Scatter Dot renderer (colored by department)
// ---------------------------------------------------------------------------

function DeptScatterDot(props: any) {
  const { cx, cy, payload } = props;
  const color = getDeptColor(payload.department);
  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={color}
      fillOpacity={0.8}
      stroke={color}
      strokeWidth={1.5}
      className="cursor-pointer hover:opacity-100 transition-opacity"
    />
  );
}

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon,
  color = 'primary',
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  subtitle?: string;
}) {
  const iconBg: Record<string, string> = {
    primary: 'bg-primary-100 dark:bg-primary-900/30',
    success: 'bg-green-100 dark:bg-green-900/30',
    warning: 'bg-amber-100 dark:bg-amber-900/30',
    danger: 'bg-red-100 dark:bg-red-900/30',
  };
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{label}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">{subtitle}</p>}
        </div>
        <div className={clsx('p-3 rounded-lg', iconBg[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function LoadingState({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-secondary-400 dark:text-secondary-500">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-500 border-t-transparent mb-4" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function ErrorState({ message = 'Failed to load data' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-secondary-400 dark:text-secondary-500">
      <ExclamationTriangleIcon className="h-10 w-10 mb-3 opacity-40 text-danger-400" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-1">Please try again later</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ message = 'No data available' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-secondary-400 dark:text-secondary-500">
      <ChartBarSquareIcon className="h-10 w-10 mb-3 opacity-40" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-1">Data will appear here once reviews and compensation records are available</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recharts dark-mode axis tick style
// ---------------------------------------------------------------------------
const AXIS_STYLE = { fill: '#9ca3af', fontSize: 12 };
const GRID_STYLE = { strokeDasharray: '3 3', stroke: '#374151' };
const TOOLTIP_STYLE = { backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' };

// ---------------------------------------------------------------------------
// HRAnalyticsPage
// ---------------------------------------------------------------------------

type TabKey = 'compensation' | 'bias' | 'normalization';

export function HRAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('compensation');
  const [showNormConfirm, setShowNormConfirm] = useState(false);

  // ─── Data Queries ─────────────────────────────────────────────────────

  const { data: compData, isLoading: loadingComp, isError: errorComp } = useQuery({
    queryKey: ['hr-analytics', 'compensation'],
    queryFn: () => api.get<CompensationData>('/analytics/compensation'),
    staleTime: 120_000,
  });

  const { data: biasData, isLoading: loadingBias, isError: errorBias } = useQuery({
    queryKey: ['hr-analytics', 'bias'],
    queryFn: () => api.get<BiasData>('/analytics/bias'),
    staleTime: 120_000,
  });

  const { data: normData, isLoading: loadingNorm, isError: errorNorm } = useQuery({
    queryKey: ['hr-analytics', 'normalization'],
    queryFn: () => api.get<NormalizationData>('/analytics/normalization'),
    staleTime: 120_000,
  });

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'compensation', label: 'Compensation Modeling', icon: <CurrencyDollarIcon className="h-4 w-4" /> },
    { key: 'bias', label: 'Bias Analysis', icon: <ScaleIcon className="h-4 w-4" /> },
    { key: 'normalization', label: 'Rating Normalization', icon: <AdjustmentsHorizontalIcon className="h-4 w-4" /> },
  ];

  // =========================================================================
  // Tab 1: Compensation Modeling
  // =========================================================================

  const renderCompensation = () => {
    if (loadingComp) return <LoadingState message="Loading compensation data..." />;
    if (errorComp) return <ErrorState message="Failed to load compensation data" />;
    if (!compData || compData.employees.length === 0) return <EmptyState message="No compensation data available" />;

    const { employees, medianComp, trendLine, tiers, deptRatios } = compData;

    // Derive gap data (employees >10% off expected)
    const compGapData = employees
      .map((e) => ({
        ...e,
        gapPct: e.expectedComp > 0 ? ((e.compensation - e.expectedComp) / e.expectedComp) * 100 : 0,
      }))
      .filter((e) => Math.abs(e.gapPct) > 10)
      .sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

    // Scatter data augmented with median-distance
    const scatterData = employees.map((e) => ({
      ...e,
      pctFromMedian: medianComp > 0 ? (((e.compensation - medianComp) / medianComp) * 100).toFixed(1) : '0.0',
    }));

    // Trend line points
    const trendLineData = [
      { rating: 2.0, compensation: trendLine.slope * 2.0 + trendLine.intercept },
      { rating: 5.0, compensation: trendLine.slope * 5.0 + trendLine.intercept },
    ];

    // Unique departments for legend
    const departments = Array.from(new Set(employees.map((e) => e.department)));

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Median Compensation"
            value={`$${medianComp.toLocaleString()}`}
            icon={<CurrencyDollarIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
            color="primary"
          />
          {tiers.map((tier) => (
            <StatCard
              key={tier.label}
              label={`Avg Comp: ${tier.label}`}
              value={`$${tier.avgComp.toLocaleString()}`}
              icon={<ChartBarSquareIcon className="h-6 w-6 text-green-600 dark:text-green-400" />}
              color="success"
            />
          ))}
        </div>

        {/* Scatter Plot */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
            Performance vs Compensation
          </h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
            Each dot represents an employee, colored by department. Trend line shows expected compensation for a given performance rating.
          </p>

          {/* Department legend */}
          <div className="flex flex-wrap gap-3 mb-4">
            {departments.map((dept) => (
              <div key={dept} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getDeptColor(dept) }} />
                <span className="text-xs text-secondary-500 dark:text-secondary-400">{dept}</span>
              </div>
            ))}
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis
                  type="number"
                  dataKey="rating"
                  name="Rating"
                  domain={[2, 5.2]}
                  tick={AXIS_STYLE}
                  label={{ value: 'Performance Rating', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  dataKey="compensation"
                  name="Compensation"
                  tick={AXIS_STYLE}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                  label={{ value: 'Compensation ($)', angle: -90, position: 'insideLeft', offset: 10, fill: '#9ca3af', fontSize: 12 }}
                />
                <Tooltip content={<CompScatterTooltip />} />
                {/* Trend line */}
                <Scatter name="Trend" data={trendLineData} fill="none" line={{ stroke: '#6b7280', strokeWidth: 2, strokeDasharray: '8 4' }} shape={() => null as any} legendType="none" />
                {/* Employee dots */}
                <Scatter name="Employees" data={scatterData} shape={<DeptScatterDot />} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gap Analysis Card */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
              Compensation Gap Analysis
            </h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
              Employees with compensation more than 10% above or below the expected trend line
            </p>
          </div>
          {compGapData.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-10 w-10 text-green-500" />
              <p className="mt-2 text-secondary-500 dark:text-secondary-400">No significant compensation gaps detected.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    {['Name', 'Department', 'Rating', 'Current Comp', 'Expected Comp', 'Gap %', 'Action Needed'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {compGapData.map((emp) => (
                    <tr key={emp.id || emp.name} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-secondary-900 dark:text-white whitespace-nowrap">{emp.name}</td>
                      <td className="px-6 py-4 text-sm text-secondary-500 dark:text-secondary-400">{emp.department}</td>
                      <td className="px-6 py-4 text-sm text-center font-semibold text-primary-600 dark:text-primary-400">{emp.rating}</td>
                      <td className="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-300">${emp.compensation.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-300">${emp.expectedComp.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-center">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
                            emp.gapPct > 0
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          )}
                        >
                          {emp.gapPct > 0 ? (
                            <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                          )}
                          {emp.gapPct > 0 ? '+' : ''}{emp.gapPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={clsx(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            emp.gapPct > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          )}
                        >
                          {emp.gapPct > 0 ? 'Review for Overpayment' : 'Consider Increase'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Comp Ratio by Department */}
        {deptRatios.length > 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
              Compensation Ratio by Department
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    {['Department', 'Employees', 'Avg Compensation', 'Comp Ratio (vs Median)'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {deptRatios.map((d) => (
                    <tr key={d.department} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                      <td className="px-6 py-3 text-sm font-medium text-secondary-900 dark:text-white">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getDeptColor(d.department) }} />
                          {d.department}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-secondary-500 dark:text-secondary-400">{d.count}</td>
                      <td className="px-6 py-3 text-sm text-secondary-700 dark:text-secondary-300">${d.avgComp.toLocaleString()}</td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={clsx(
                            'font-semibold',
                            Number(d.ratio) > 1.1
                              ? 'text-red-600 dark:text-red-400'
                              : Number(d.ratio) < 0.9
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-secondary-700 dark:text-secondary-300'
                          )}
                        >
                          {d.ratio}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // Tab 2: Bias Analysis
  // =========================================================================

  const renderBias = () => {
    if (loadingBias) return <LoadingState message="Loading bias analysis..." />;
    if (errorBias) return <ErrorState message="Failed to load bias data" />;
    if (!biasData) return <EmptyState message="No bias analysis data available" />;

    const { deptDistribution, managerRatings, demographic, overallMean } = biasData;
    const stdDevThreshold = 1.0;

    // Build chart data for department rating distribution
    const biasDistChartData = deptDistribution.map((d) => ({
      department: d.department,
      'Rating 1': d['1'],
      'Rating 2': d['2'],
      'Rating 3': d['3'],
      'Rating 4': d['4'],
      'Rating 5': d['5'],
    }));

    return (
      <div className="space-y-6">
        {/* Info banner */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-5">
          <div className="flex items-start gap-3">
            <ScaleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-primary-900 dark:text-primary-100">About Bias Analysis</h3>
              <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                These metrics identify potential rating bias across departments and managers.
                High standard deviations or significant disparities may warrant further review.
                Data is shown only for groups with 5+ members to protect individual privacy.
              </p>
            </div>
          </div>
        </div>

        {/* Rating Distribution by Department */}
        {deptDistribution.length > 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
              Rating Distribution by Department
            </h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
              Grouped bars show the count of each rating (1-5) per department
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={biasDistChartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="department" tick={AXIS_STYLE} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={AXIS_STYLE} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={{ color: '#e5e7eb' }} labelStyle={{ color: '#fff', fontWeight: 600 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Rating 1" fill={RATING_BAR_COLORS[0]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Rating 2" fill={RATING_BAR_COLORS[1]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Rating 3" fill={RATING_BAR_COLORS[2]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Rating 4" fill={RATING_BAR_COLORS[3]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Rating 5" fill={RATING_BAR_COLORS[4]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Statistical Indicators */}
        {deptDistribution.length > 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">
              Statistical Indicators by Department
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    {['Department', 'Mean Rating', 'Std Deviation', 'Significance'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {deptDistribution.map((d) => {
                    const significant = d.stdDev > stdDevThreshold;
                    return (
                      <tr key={d.department} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                        <td className="px-6 py-3 text-sm font-medium text-secondary-900 dark:text-white">
                          <span className="inline-flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getDeptColor(d.department) }} />
                            {d.department}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-primary-600 dark:text-primary-400">{d.mean.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm text-secondary-700 dark:text-secondary-300">{d.stdDev.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm">
                          {significant ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                              Significant Difference Detected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                              Within Normal Range
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manager Comparison Chart */}
        {managerRatings.length > 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
              Manager Rating Comparison
            </h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
              Average rating per manager. Red line shows the organization-wide mean ({overallMean.toFixed(2)}).
              Managers significantly above are flagged as lenient; below as severe.
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={managerRatings} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="manager" tick={AXIS_STYLE} />
                  <YAxis domain={[0, 5]} tick={AXIS_STYLE} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: '#fff', fontWeight: 600 }}
                    formatter={(value: number, _: string, entry: any) => [
                      `${value.toFixed(2)} (${entry.payload.reviewCount} reviews)`,
                      'Avg Rating',
                    ]}
                  />
                  <ReferenceLine y={overallMean} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Mean: ${overallMean.toFixed(2)}`, position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }} />
                  <Bar dataKey="avgRating" radius={[4, 4, 0, 0]}>
                    {managerRatings.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={
                          entry.label === 'lenient'
                            ? '#f59e0b'
                            : entry.label === 'severe'
                            ? '#8b5cf6'
                            : '#3b82f6'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-secondary-500 dark:text-secondary-400">Lenient</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-xs text-secondary-500 dark:text-secondary-400">Neutral</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-violet-500" />
                <span className="text-xs text-secondary-500 dark:text-secondary-400">Severe</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 border-t-2 border-red-500 border-dashed" />
                <span className="text-xs text-secondary-500 dark:text-secondary-400">Org Mean</span>
              </div>
            </div>
          </div>
        )}

        {/* Demographic Parity Check */}
        {demographic.length > 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
                Demographic Parity Check
              </h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
                Average ratings by various groupings to identify potential disparities
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
                <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                  <tr>
                    {['Grouping', 'Category', 'Count', 'Avg Rating', 'Std Dev', 'Status'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                  {demographic.map((row, i) => {
                    const gap = Math.abs(row.avgRating - overallMean);
                    const flagged = gap > 0.3;
                    return (
                      <tr key={i} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                        <td className="px-6 py-3 text-sm font-medium text-secondary-900 dark:text-white">{row.grouping}</td>
                        <td className="px-6 py-3 text-sm text-secondary-700 dark:text-secondary-300">{row.category}</td>
                        <td className="px-6 py-3 text-sm text-secondary-500 dark:text-secondary-400">{row.count}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-primary-600 dark:text-primary-400">{row.avgRating.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm text-secondary-500 dark:text-secondary-400">{row.stdDev.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm">
                          {flagged ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                              Review Needed
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty state if all sections are empty */}
        {deptDistribution.length === 0 && managerRatings.length === 0 && demographic.length === 0 && (
          <EmptyState message="Not enough review data for bias analysis. Requires finalized reviews with ratings." />
        )}
      </div>
    );
  };

  // =========================================================================
  // Tab 3: Rating Normalization
  // =========================================================================

  const handleApplyNormalization = () => {
    setShowNormConfirm(false);
    toast.success('Normalization applied successfully. Ratings have been updated.');
  };

  const renderNormalization = () => {
    if (loadingNorm) return <LoadingState message="Loading normalization data..." />;
    if (errorNorm) return <ErrorState message="Failed to load normalization data" />;
    if (!normData || normData.employees.length === 0) return <EmptyState message="No normalization data available. Requires finalized reviews." />;

    const { employees, distribution, bellCurveMetrics } = normData;

    // Sort by largest adjustment
    const sortedEmployees = [...employees].sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));
    const adjustedCount = sortedEmployees.filter((e) => Math.abs(e.adjustment) >= 0.03).length;

    return (
      <div className="space-y-6">
        {/* Bell Curve Fit Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="R-Squared (Fit)"
            value={bellCurveMetrics.rSquared.toFixed(3)}
            icon={<ChartBarSquareIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
            color="primary"
            subtitle="1.0 = perfect bell curve"
          />
          <StatCard
            label="Skewness"
            value={bellCurveMetrics.skewness.toFixed(2)}
            icon={<ScaleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />}
            color="warning"
            subtitle="0 = perfectly symmetric"
          />
          <StatCard
            label="Kurtosis"
            value={bellCurveMetrics.kurtosis.toFixed(2)}
            icon={<AdjustmentsHorizontalIcon className="h-6 w-6 text-green-600 dark:text-green-400" />}
            color="success"
            subtitle="3.0 = normal (mesokurtic)"
          />
        </div>

        {/* Before/After Visualization */}
        {distribution.length > 0 && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
              Before / After Distribution
            </h3>
            <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
              Original distribution (light) vs normalized distribution (dark) overlaid on the same chart
            </p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={distribution} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                  <defs>
                    <linearGradient id="colorOrig" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6b7280" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="colorNorm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...GRID_STYLE} />
                  <XAxis dataKey="rating" tick={AXIS_STYLE} label={{ value: 'Rating', position: 'insideBottom', offset: -5, fill: '#9ca3af', fontSize: 12 }} />
                  <YAxis tick={AXIS_STYLE} label={{ value: 'Count', angle: -90, position: 'insideLeft', fill: '#9ca3af', fontSize: 12 }} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#fff', fontWeight: 600 }} itemStyle={{ color: '#e5e7eb' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="original"
                    name="Original Distribution"
                    stroke="#6b7280"
                    strokeWidth={2}
                    fill="url(#colorOrig)"
                    dot={{ fill: '#6b7280', r: 3 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="normalized"
                    name="Normalized Distribution"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorNorm)"
                    dot={{ fill: '#2563eb', r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Normalization Preview Table */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
                Normalization Preview
              </h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
                Sorted by largest adjustment. Green = adjusted up, Red = adjusted down.
              </p>
            </div>
            <button
              onClick={() => setShowNormConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-secondary-800"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Apply Normalization
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
              <thead className="bg-secondary-50 dark:bg-secondary-900/50">
                <tr>
                  {['Employee', 'Department', 'Original Rating', 'Z-Score', 'Normalized Rating', 'Adjustment'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-secondary-800 divide-y divide-secondary-200 dark:divide-secondary-700">
                {sortedEmployees.map((emp) => {
                  const isUp = emp.adjustment > 0;
                  const isNeutral = Math.abs(emp.adjustment) < 0.03;
                  return (
                    <tr key={emp.id || emp.name} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                      <td className="px-6 py-3 text-sm font-medium text-secondary-900 dark:text-white whitespace-nowrap">{emp.name}</td>
                      <td className="px-6 py-3 text-sm text-secondary-500 dark:text-secondary-400">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getDeptColor(emp.department) }} />
                          {emp.department}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-secondary-700 dark:text-secondary-300">{emp.originalRating.toFixed(1)}</td>
                      <td className="px-6 py-3 text-sm text-secondary-500 dark:text-secondary-400 font-mono">{emp.zScore >= 0 ? '+' : ''}{emp.zScore.toFixed(2)}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-primary-600 dark:text-primary-400">{emp.normalizedRating.toFixed(2)}</td>
                      <td className="px-6 py-3 text-sm">
                        {isNeutral ? (
                          <span className="text-secondary-500 dark:text-secondary-400 font-mono text-xs">0.00</span>
                        ) : (
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold font-mono',
                              isUp
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                            )}
                          >
                            {isUp ? (
                              <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                            )}
                            {isUp ? '+' : ''}{emp.adjustment.toFixed(2)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Apply Normalization Confirmation Modal */}
        {showNormConfirm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNormConfirm(false)} />
              <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-secondary-200 dark:border-secondary-700">
                <div className="text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                    Apply Rating Normalization?
                  </h2>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-1">
                    This will adjust <span className="font-semibold text-secondary-700 dark:text-secondary-200">{adjustedCount}</span> employee ratings based on the normalization model.
                  </p>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-6">
                    This action can be reverted from the audit log.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setShowNormConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApplyNormalization}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      Confirm & Apply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // Main Layout
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">HR Analytics & Bias Analysis</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">
          Compensation modeling, rating bias detection, and normalization tools
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'compensation' && renderCompensation()}
      {activeTab === 'bias' && renderBias()}
      {activeTab === 'normalization' && renderNormalization()}
    </div>
  );
}
