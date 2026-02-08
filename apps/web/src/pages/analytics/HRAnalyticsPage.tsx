import { useState, useMemo } from 'react';
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CompEmployee {
  name: string;
  department: string;
  rating: number;
  compensation: number;
  expectedComp: number;
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

interface NormEmployee {
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
// Mock Data: Compensation
// ---------------------------------------------------------------------------

const mockCompData: CompEmployee[] = [
  { name: 'Alice Chen', department: 'Engineering', rating: 4.5, compensation: 142000, expectedComp: 135000 },
  { name: 'Bob Martinez', department: 'Marketing', rating: 3.5, compensation: 72000, expectedComp: 82000 },
  { name: 'Carol Nguyen', department: 'Engineering', rating: 4.8, compensation: 155000, expectedComp: 148000 },
  { name: 'Dave Wilson', department: 'Sales', rating: 3.0, compensation: 89000, expectedComp: 74000 },
  { name: 'Eve Johnson', department: 'Finance', rating: 4.2, compensation: 105000, expectedComp: 110000 },
  { name: 'Frank Patel', department: 'Engineering', rating: 3.8, compensation: 118000, expectedComp: 115000 },
  { name: 'Grace Kim', department: 'Product', rating: 4.6, compensation: 138000, expectedComp: 140000 },
  { name: 'Hank Brown', department: 'Marketing', rating: 2.8, compensation: 68000, expectedComp: 62000 },
  { name: 'Iris Davis', department: 'Human Resources', rating: 3.9, compensation: 84000, expectedComp: 88000 },
  { name: 'Jack Lee', department: 'Sales', rating: 4.1, compensation: 97000, expectedComp: 95000 },
  { name: 'Kate Miller', department: 'Design', rating: 4.3, compensation: 112000, expectedComp: 118000 },
  { name: 'Leo Thompson', department: 'Engineering', rating: 3.2, compensation: 102000, expectedComp: 90000 },
  { name: 'Mia Garcia', department: 'Finance', rating: 4.0, compensation: 98000, expectedComp: 100000 },
  { name: 'Noah White', department: 'Operations', rating: 3.6, compensation: 76000, expectedComp: 78000 },
  { name: 'Olivia Scott', department: 'Product', rating: 3.4, compensation: 95000, expectedComp: 85000 },
  { name: 'Paul Adams', department: 'Marketing', rating: 4.7, compensation: 110000, expectedComp: 105000 },
  { name: 'Quinn Harris', department: 'Design', rating: 2.5, compensation: 72000, expectedComp: 68000 },
  { name: 'Rachel Clark', department: 'Engineering', rating: 4.9, compensation: 162000, expectedComp: 155000 },
  { name: 'Sam Turner', department: 'Sales', rating: 3.7, compensation: 83000, expectedComp: 86000 },
  { name: 'Tina Baker', department: 'Human Resources', rating: 4.4, compensation: 91000, expectedComp: 95000 },
];

// Derive gap data (employees >10% off expected)
const compGapData = mockCompData
  .map((e) => ({
    ...e,
    gapPct: ((e.compensation - e.expectedComp) / e.expectedComp) * 100,
  }))
  .filter((e) => Math.abs(e.gapPct) > 10)
  .sort((a, b) => Math.abs(b.gapPct) - Math.abs(a.gapPct));

// Scatter data augmented with median-distance
const medianComp = [...mockCompData].sort((a, b) => a.compensation - b.compensation)[Math.floor(mockCompData.length / 2)].compensation;

const scatterData = mockCompData.map((e) => ({
  ...e,
  pctFromMedian: (((e.compensation - medianComp) / medianComp) * 100).toFixed(1),
}));

// Trend line points (linear regression)
function linearRegression(data: CompEmployee[]) {
  const n = data.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  data.forEach(({ rating, compensation }) => {
    sumX += rating;
    sumY += compensation;
    sumXY += rating * compensation;
    sumX2 += rating * rating;
  });
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

const { slope: trendSlope, intercept: trendIntercept } = linearRegression(mockCompData);
const trendLineData = [
  { rating: 2.0, compensation: trendSlope * 2.0 + trendIntercept },
  { rating: 5.0, compensation: trendSlope * 5.0 + trendIntercept },
];

// Summary stats by tier
const performanceTiers = [
  { label: 'Low (1-2.5)', min: 1, max: 2.5 },
  { label: 'Mid (2.6-3.5)', min: 2.6, max: 3.5 },
  { label: 'High (3.6-4.5)', min: 3.6, max: 4.5 },
  { label: 'Top (4.6-5.0)', min: 4.6, max: 5.0 },
];

function avgCompByTier(tier: { min: number; max: number }) {
  const emps = mockCompData.filter((e) => e.rating >= tier.min && e.rating <= tier.max);
  if (emps.length === 0) return 0;
  return Math.round(emps.reduce((s, e) => s + e.compensation, 0) / emps.length);
}

// Dept comp ratios
const deptCompRatios = Object.keys(DEPT_COLORS).map((dept) => {
  const emps = mockCompData.filter((e) => e.department === dept);
  if (emps.length === 0) return null;
  const avg = emps.reduce((s, e) => s + e.compensation, 0) / emps.length;
  return { department: dept, avgComp: Math.round(avg), ratio: (avg / medianComp).toFixed(2), count: emps.length };
}).filter(Boolean) as { department: string; avgComp: number; ratio: string; count: number }[];

// ---------------------------------------------------------------------------
// Mock Data: Bias Analysis
// ---------------------------------------------------------------------------

const mockDeptRatingDist: DeptRatingDist[] = [
  { department: 'Engineering', '1': 1, '2': 3, '3': 8, '4': 12, '5': 6, mean: 3.63, stdDev: 0.91 },
  { department: 'Marketing', '1': 0, '2': 2, '3': 5, '4': 8, '5': 5, mean: 3.80, stdDev: 0.88 },
  { department: 'Sales', '1': 2, '2': 4, '3': 6, '4': 5, '5': 3, mean: 3.15, stdDev: 1.12 },
  { department: 'Finance', '1': 0, '2': 1, '3': 4, '4': 7, '5': 3, mean: 3.80, stdDev: 0.78 },
  { department: 'Human Resources', '1': 0, '2': 1, '3': 3, '4': 5, '5': 2, mean: 3.73, stdDev: 0.83 },
  { department: 'Product', '1': 0, '2': 2, '3': 3, '4': 6, '5': 4, mean: 3.80, stdDev: 0.94 },
  { department: 'Design', '1': 1, '2': 2, '3': 4, '4': 3, '5': 2, mean: 3.25, stdDev: 1.08 },
  { department: 'Operations', '1': 0, '2': 3, '3': 5, '4': 4, '5': 1, mean: 3.23, stdDev: 0.86 },
];

const biasDistChartData = mockDeptRatingDist.map((d) => ({
  department: d.department,
  'Rating 1': d['1'],
  'Rating 2': d['2'],
  'Rating 3': d['3'],
  'Rating 4': d['4'],
  'Rating 5': d['5'],
}));

const overallMean = 3.55;
const stdDevThreshold = 1.0;

const mockManagerRatings: ManagerRating[] = [
  { manager: 'S. Ramirez', avgRating: 4.35, reviewCount: 8, label: 'lenient' },
  { manager: 'J. Park', avgRating: 3.52, reviewCount: 12, label: 'neutral' },
  { manager: 'L. Zhang', avgRating: 2.85, reviewCount: 6, label: 'severe' },
  { manager: 'A. Ivanova', avgRating: 3.90, reviewCount: 10, label: 'lenient' },
  { manager: 'R. Johnson', avgRating: 3.48, reviewCount: 9, label: 'neutral' },
  { manager: 'T. Nakamura', avgRating: 3.10, reviewCount: 7, label: 'severe' },
  { manager: 'M. Williams', avgRating: 4.10, reviewCount: 11, label: 'lenient' },
  { manager: 'D. Okafor', avgRating: 3.60, reviewCount: 8, label: 'neutral' },
];

const mockDemographic: DemographicRow[] = [
  { grouping: 'Tenure', category: '< 1 year', count: 15, avgRating: 3.42, stdDev: 0.82 },
  { grouping: 'Tenure', category: '1-3 years', count: 28, avgRating: 3.58, stdDev: 0.91 },
  { grouping: 'Tenure', category: '3-5 years', count: 22, avgRating: 3.72, stdDev: 0.78 },
  { grouping: 'Tenure', category: '5+ years', count: 12, avgRating: 3.85, stdDev: 0.65 },
  { grouping: 'Level', category: 'L1-L2', count: 20, avgRating: 3.35, stdDev: 0.95 },
  { grouping: 'Level', category: 'L3-L4', count: 35, avgRating: 3.62, stdDev: 0.85 },
  { grouping: 'Level', category: 'L5+', count: 22, avgRating: 3.88, stdDev: 0.72 },
  { grouping: 'Department Type', category: 'Revenue', count: 30, avgRating: 3.48, stdDev: 0.98 },
  { grouping: 'Department Type', category: 'Cost Center', count: 47, avgRating: 3.65, stdDev: 0.82 },
];

// ---------------------------------------------------------------------------
// Mock Data: Normalization
// ---------------------------------------------------------------------------

const mockNormEmployees: NormEmployee[] = [
  { name: 'Leo Thompson', department: 'Engineering', originalRating: 3.2, zScore: -0.38, normalizedRating: 3.45, adjustment: 0.25 },
  { name: 'Dave Wilson', department: 'Sales', originalRating: 3.0, zScore: -0.60, normalizedRating: 3.20, adjustment: 0.20 },
  { name: 'Olivia Scott', department: 'Product', originalRating: 3.4, zScore: -0.16, normalizedRating: 3.50, adjustment: 0.10 },
  { name: 'Hank Brown', department: 'Marketing', originalRating: 2.8, zScore: -0.82, normalizedRating: 3.05, adjustment: 0.25 },
  { name: 'Rachel Clark', department: 'Engineering', originalRating: 4.9, zScore: 1.48, normalizedRating: 4.65, adjustment: -0.25 },
  { name: 'Paul Adams', department: 'Marketing', originalRating: 4.7, zScore: 1.26, normalizedRating: 4.50, adjustment: -0.20 },
  { name: 'Carol Nguyen', department: 'Engineering', originalRating: 4.8, zScore: 1.37, normalizedRating: 4.55, adjustment: -0.25 },
  { name: 'Alice Chen', department: 'Engineering', originalRating: 4.5, zScore: 1.04, normalizedRating: 4.38, adjustment: -0.12 },
  { name: 'Grace Kim', department: 'Product', originalRating: 4.6, zScore: 1.15, normalizedRating: 4.42, adjustment: -0.18 },
  { name: 'Quinn Harris', department: 'Design', originalRating: 2.5, zScore: -1.15, normalizedRating: 2.80, adjustment: 0.30 },
  { name: 'Bob Martinez', department: 'Marketing', originalRating: 3.5, zScore: -0.05, normalizedRating: 3.52, adjustment: 0.02 },
  { name: 'Eve Johnson', department: 'Finance', originalRating: 4.2, zScore: 0.71, normalizedRating: 4.10, adjustment: -0.10 },
  { name: 'Frank Patel', department: 'Engineering', originalRating: 3.8, zScore: 0.27, normalizedRating: 3.75, adjustment: -0.05 },
  { name: 'Iris Davis', department: 'Human Resources', originalRating: 3.9, zScore: 0.38, normalizedRating: 3.82, adjustment: -0.08 },
  { name: 'Jack Lee', department: 'Sales', originalRating: 4.1, zScore: 0.60, normalizedRating: 4.02, adjustment: -0.08 },
  { name: 'Kate Miller', department: 'Design', originalRating: 4.3, zScore: 0.82, normalizedRating: 4.18, adjustment: -0.12 },
  { name: 'Mia Garcia', department: 'Finance', originalRating: 4.0, zScore: 0.49, normalizedRating: 3.92, adjustment: -0.08 },
  { name: 'Noah White', department: 'Operations', originalRating: 3.6, zScore: 0.05, normalizedRating: 3.58, adjustment: -0.02 },
  { name: 'Sam Turner', department: 'Sales', originalRating: 3.7, zScore: 0.16, normalizedRating: 3.65, adjustment: -0.05 },
  { name: 'Tina Baker', department: 'Human Resources', originalRating: 4.4, zScore: 0.93, normalizedRating: 4.25, adjustment: -0.15 },
].sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));

// Distribution buckets for area chart
const mockDistBuckets: DistBucket[] = [
  { rating: '1.0', original: 2, normalized: 1 },
  { rating: '1.5', original: 3, normalized: 2 },
  { rating: '2.0', original: 4, normalized: 3 },
  { rating: '2.5', original: 6, normalized: 5 },
  { rating: '3.0', original: 12, normalized: 10 },
  { rating: '3.5', original: 18, normalized: 22 },
  { rating: '4.0', original: 20, normalized: 24 },
  { rating: '4.5', original: 15, normalized: 18 },
  { rating: '5.0', original: 8, normalized: 5 },
];

// Bell curve fit metrics
const bellCurveMetrics = {
  rSquared: 0.934,
  skewness: -0.21,
  kurtosis: 2.87,
};

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

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'compensation', label: 'Compensation Modeling', icon: <CurrencyDollarIcon className="h-4 w-4" /> },
    { key: 'bias', label: 'Bias Analysis', icon: <ScaleIcon className="h-4 w-4" /> },
    { key: 'normalization', label: 'Rating Normalization', icon: <AdjustmentsHorizontalIcon className="h-4 w-4" /> },
  ];

  // =========================================================================
  // Tab 1: Compensation Modeling
  // =========================================================================

  const renderCompensation = () => {
    // Unique departments for legend
    const departments = Array.from(new Set(mockCompData.map((e) => e.department)));

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
          {performanceTiers.map((tier) => (
            <StatCard
              key={tier.label}
              label={`Avg Comp: ${tier.label}`}
              value={`$${avgCompByTier(tier).toLocaleString()}`}
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
                  domain={[50000, 180000]}
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
                    <tr key={emp.name} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
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
                {deptCompRatios.map((d) => (
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
      </div>
    );
  };

  // =========================================================================
  // Tab 2: Bias Analysis
  // =========================================================================

  const renderBias = () => (
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

      {/* Statistical Indicators */}
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
              {mockDeptRatingDist.map((d) => {
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

      {/* Manager Comparison Chart */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
          Manager Rating Comparison
        </h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          Average rating per manager. Red line shows the organization-wide mean ({overallMean}).
          Managers significantly above are flagged as lenient; below as severe.
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockManagerRatings} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
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
              <ReferenceLine y={overallMean} stroke="#ef4444" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Mean: ${overallMean}`, position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }} />
              <Bar dataKey="avgRating" radius={[4, 4, 0, 0]}>
                {mockManagerRatings.map((entry, index) => (
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

      {/* Demographic Parity Check */}
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
              {mockDemographic.map((row, i) => {
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
    </div>
  );

  // =========================================================================
  // Tab 3: Rating Normalization
  // =========================================================================

  const handleApplyNormalization = () => {
    setShowNormConfirm(false);
    toast.success('Normalization applied successfully. Ratings have been updated.');
  };

  const renderNormalization = () => (
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
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-1">
          Before / After Distribution
        </h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          Original distribution (light) vs normalized distribution (dark) overlaid on the same chart
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockDistBuckets} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
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
              {mockNormEmployees.map((emp) => {
                const isUp = emp.adjustment > 0;
                const isNeutral = Math.abs(emp.adjustment) < 0.03;
                return (
                  <tr key={emp.name} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
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
                  This will adjust <span className="font-semibold text-secondary-700 dark:text-secondary-200">{mockNormEmployees.filter((e) => Math.abs(e.adjustment) >= 0.03).length}</span> employee ratings based on the normalization model.
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
