import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  PuzzlePieceIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  UserGroupIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';
import { skillsApi } from '@/lib/api';

// ── Local Types (API returns `any`) ─────────────────────────────────────────

interface SkillGap {
  skillName: string;
  category: string;
  avgRating: number;
  targetLevel: number;
  gap: number;
  employeesAffected: number;
}

interface HeatmapCell {
  departmentName: string;
  category: string;
  avgRating: number;
  count: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function heatmapColor(rating: number): string {
  if (rating >= 4.5) return 'bg-emerald-600 text-white';
  if (rating >= 3.5) return 'bg-emerald-400 text-white';
  if (rating >= 2.5) return 'bg-yellow-400 text-secondary-900';
  if (rating >= 1.5) return 'bg-orange-400 text-white';
  if (rating > 0) return 'bg-red-500 text-white';
  return 'bg-secondary-100 dark:bg-secondary-700 text-secondary-400';
}

function gapColor(gap: number): string {
  // Color by magnitude — larger absolute values are worse deficits
  const abs = Math.abs(gap);
  if (abs >= 2) return '#ef4444';    // Critical gap
  if (abs >= 1) return '#f59e0b';    // Moderate gap
  if (abs >= 0.5) return '#eab308';  // Minor gap
  if (abs > 0.1) return '#84cc16';   // Near target
  return '#22c55e';                  // On target
}

const SEVERITY_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e'];
const SEVERITY_LABELS = ['Critical (>2)', 'Moderate (1-2)', 'Minor (0.5-1)', 'On Target (<0.5)'];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
      <p className="font-medium text-slate-300">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
        </p>
      ))}
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-5 h-24">
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-20 mb-3" />
            <div className="h-8 bg-secondary-200 dark:bg-secondary-700 rounded w-14" />
          </div>
        ))}
      </div>
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-6 h-80">
        <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-40 mb-4" />
        <div className="h-60 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-6 h-72">
            <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-36 mb-4" />
            <div className="h-52 bg-secondary-100 dark:bg-secondary-700/50 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function SkillGapHeatmapPage() {
  usePageTitle('Skill Gap Analytics');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: gaps = [], isLoading: loadingGaps } = useQuery<SkillGap[]>({
    queryKey: ['skill-gaps-page', 'gaps'],
    queryFn: () => skillsApi.getSkillGaps(),
    staleTime: 60_000,
  });

  const { data: heatmap = [], isLoading: loadingHeatmap } = useQuery<HeatmapCell[]>({
    queryKey: ['skill-gaps-page', 'heatmap'],
    queryFn: () => skillsApi.getOrgSkillHeatmap(),
    staleTime: 60_000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['skill-gaps-page', 'categories'],
    queryFn: () => skillsApi.listCategories(),
    staleTime: 60_000,
  });

  const isLoading = loadingGaps || loadingHeatmap;

  // ── Computed ───────────────────────────────────────────────────────────────

  const filteredGaps = useMemo(() => {
    if (!selectedCategory) return gaps;
    return gaps.filter((g) => g.category === selectedCategory);
  }, [gaps, selectedCategory]);

  const stats = useMemo(() => {
    const totalSkills = gaps.length;
    const criticalGaps = gaps.filter((g) => g.gap > 2).length;
    const avgLevel = gaps.length > 0 ? gaps.reduce((s, g) => s + g.avgRating, 0) / gaps.length : 0;
    const mostCommon = gaps.length > 0
      ? [...gaps].sort((a, b) => b.employeesAffected - a.employeesAffected)[0]?.skillName ?? '-'
      : '-';
    return { totalSkills, criticalGaps, avgLevel, mostCommon };
  }, [gaps]);

  // Heatmap lookup
  const { departments, heatmapCategories, lookup } = useMemo(() => {
    const depts = [...new Set(heatmap.map((h) => h.departmentName))].sort();
    const cats = [...new Set(heatmap.map((h) => h.category))].sort();
    const map = new Map<string, HeatmapCell>();
    heatmap.forEach((h) => map.set(`${h.departmentName}|${h.category}`, h));
    return { departments: depts, heatmapCategories: cats, lookup: map };
  }, [heatmap]);

  // Bar chart data (top 15 gaps)
  const barData = useMemo(() => {
    return [...filteredGaps]
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 15)
      .map((g) => ({ ...g, displayName: g.skillName }));
  }, [filteredGaps]);

  // Severity distribution
  const severityData = useMemo(() => {
    const counts = [0, 0, 0, 0]; // critical, moderate, minor, onTarget
    gaps.forEach((g) => {
      if (g.gap > 2) counts[0]++;
      else if (g.gap > 1) counts[1]++;
      else if (g.gap > 0.5) counts[2]++;
      else counts[3]++;
    });
    return SEVERITY_LABELS.map((name, i) => ({ name, value: counts[i] }));
  }, [gaps]);

  // Radar data for selected department
  const radarData = useMemo(() => {
    if (!selectedDept) {
      // Org-wide averages per category
      const catMap = new Map<string, { total: number; count: number }>();
      heatmap.forEach((h) => {
        const e = catMap.get(h.category) || { total: 0, count: 0 };
        e.total += h.avgRating;
        e.count += 1;
        catMap.set(h.category, e);
      });
      return Array.from(catMap.entries()).map(([cat, { total, count }]) => ({
        category: cat,
        value: count > 0 ? total / count : 0,
      }));
    }
    return heatmapCategories.map((cat) => {
      const cell = lookup.get(`${selectedDept}|${cat}`);
      return { category: cat, value: cell?.avgRating ?? 0 };
    });
  }, [selectedDept, heatmap, heatmapCategories, lookup]);

  const uniqueCategories = useMemo(() => [...new Set(gaps.map((g) => g.category))].sort(), [gaps]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Skill Gap Analytics</h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Loading skill data...</p>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  if (gaps.length === 0 && heatmap.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-6">Skill Gap Analytics</h1>
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-12 text-center">
          <PuzzlePieceIcon className="h-12 w-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">No Skill Data Available</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 max-w-md mx-auto">
            Skill gap analytics will appear here once skill assessments are created. Start by visiting the Skills Matrix page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Skill Gap Analytics"
        subtitle="Organization-wide skill gap analysis and department heatmap"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FunnelIcon className="h-4 w-4 text-secondary-400 flex-shrink-0" />
          <select
            value={selectedCategory ?? ''}
            onChange={(e) => setSelectedCategory(e.target.value || null)}
            className="text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg px-2 sm:px-3 py-1.5 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 max-w-[160px] sm:max-w-none truncate"
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-3 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 w-fit">
              <ChartBarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Total Skills</p>
              <p className="text-xl md:text-2xl font-bold text-secondary-900 dark:text-white">{stats.totalSkills}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-3 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 w-fit">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Critical Gaps</p>
              <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">{stats.criticalGaps}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-3 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 w-fit">
              <PuzzlePieceIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Avg Skill Level</p>
              <p className="text-xl md:text-2xl font-bold text-secondary-900 dark:text-white">{(stats.avgLevel ?? 0).toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl border border-secondary-200/60 dark:border-white/[0.06] p-3 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 w-fit">
              <UserGroupIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Most Common Gap</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white truncate" title={stats.mostCommon}>{stats.mostCommon}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Table */}
      {departments.length > 0 && heatmapCategories.length > 0 && (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Department × Skill Category Heatmap</h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">Click a department to view its radar chart</p>
            </div>
            {selectedDept && (
              <button
                onClick={() => setSelectedDept(null)}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>
          <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0" style={{ scrollbarWidth: 'thin' }}>
            <table className="min-w-[600px] w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 font-medium text-secondary-500 dark:text-secondary-400 sticky left-0 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl z-10">Department</th>
                  {heatmapCategories.map((cat) => (
                    <th key={cat} className="text-center py-2 px-2 font-medium text-secondary-500 dark:text-secondary-400 whitespace-nowrap">{cat}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
                {departments.map((dept) => (
                  <tr
                    key={dept}
                    className={clsx(
                      'cursor-pointer transition-colors',
                      selectedDept === dept
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/30'
                    )}
                    onClick={() => setSelectedDept(selectedDept === dept ? null : dept)}
                  >
                    <td className="py-2 px-3 font-medium text-secondary-900 dark:text-white whitespace-nowrap sticky left-0 bg-inherit z-10">{dept}</td>
                    {heatmapCategories.map((cat) => {
                      const cell = lookup.get(`${dept}|${cat}`);
                      return (
                        <td key={cat} className="py-2 px-2 text-center">
                          {cell ? (
                            <span className={clsx('inline-block w-12 py-1 rounded text-2xs font-bold', heatmapColor(cell.avgRating))}>
                              {(cell.avgRating ?? 0).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-secondary-300 dark:text-secondary-600">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 text-2xs">
            <span className="text-secondary-500 dark:text-secondary-400 font-medium">Legend:</span>
            {[
              { label: '4.5+', cls: 'bg-emerald-600' },
              { label: '3.5-4.5', cls: 'bg-emerald-400' },
              { label: '2.5-3.5', cls: 'bg-yellow-400' },
              { label: '1.5-2.5', cls: 'bg-orange-400' },
              { label: '<1.5', cls: 'bg-red-500' },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1">
                <span className={clsx('w-3 h-3 rounded', l.cls)} />
                <span className="text-secondary-500 dark:text-secondary-400">{l.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top Skill Gaps Bar Chart */}
      {barData.length > 0 && (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Top Skill Gaps</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
            {selectedCategory ? `Filtered by: ${selectedCategory}` : 'All categories'} — top {barData.length} gaps by severity
          </p>
          <div className="h-[320px] md:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                <XAxis
                  type="number"
                  domain={[0, 'auto']}
                  tick={{ fontSize: 10, fill: 'var(--color-secondary-400, #9ca3af)' }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Gap Magnitude', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#9ca3af' }}
                />
                <YAxis
                  type="category"
                  dataKey="displayName"
                  tick={{ fontSize: 9, fill: 'var(--color-secondary-500, #6b7280)' }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ zIndex: 50, maxWidth: '90vw' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as SkillGap;
                    return (
                      <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1 max-w-[260px]">
                        <p className="font-semibold text-white break-words">{d.skillName}</p>
                        <p className="text-slate-300">Category: {d.category}</p>
                        <p className="text-slate-300">Avg: {(d.avgRating ?? 0).toFixed(2)} / Target: {(d.targetLevel ?? 0).toFixed(1)}</p>
                        <p style={{ color: gapColor(d.gap) }}>Gap: {(d.gap ?? 0).toFixed(2)}</p>
                        <p className="text-slate-300">Affected: {d.employeesAffected}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="gap" name="Gap" radius={[0, 6, 6, 0]} maxBarSize={20}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={gapColor(entry.gap)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Radar + Severity Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Skill Radar */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">
            {selectedDept ? `${selectedDept} — Skill Profile` : 'Organization Average Skill Profile'}
          </h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">
            {selectedDept ? 'Click another department in the heatmap to compare' : 'Select a department from the heatmap above'}
          </p>
          {radarData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="var(--color-secondary-300, #d1d5db)" />
                  <PolarAngleAxis
                    dataKey="category"
                    tick={{ fontSize: 10, fill: 'var(--color-secondary-500, #6b7280)' }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 5]}
                    tick={{ fontSize: 9, fill: 'var(--color-secondary-400, #9ca3af)' }}
                    axisLine={false}
                  />
                  <Radar
                    name="Skill Level"
                    dataKey="value"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={ChartTooltip} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-16">No radar data available.</p>
          )}
        </div>

        {/* Gap Severity Distribution */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">Gap Severity Distribution</h3>
          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">Breakdown of skill gaps by severity level</p>
          {gaps.length > 0 ? (
            <div className="relative h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {severityData.map((_, i) => (
                      <Cell key={i} fill={SEVERITY_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      return (
                        <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs">
                          <p className="font-semibold" style={{ color: d.payload.fill }}>{d.name}</p>
                          <p className="text-slate-300">{d.value} skills</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-secondary-900 dark:text-white">{gaps.length}</span>
                <span className="text-2xs text-secondary-500 dark:text-secondary-400">Total Skills</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary-400 text-center py-16">No data available.</p>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {severityData.map((d, i) => (
              <span key={d.name} className="inline-flex items-center gap-1.5 text-2xs text-secondary-600 dark:text-secondary-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[i] }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
