import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  actionableInsightsApi,
  type TeamOptimizationResult,
  type TeamCompositionAnalysis,
} from '@/lib/api/actionable-insights';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── constants ────────────────────────────────────────────────────────────────

const OPT_TYPES = ['NEW_TEAM', 'RESTRUCTURE', 'EXPANSION', 'REBALANCE'] as const;
const RISK_COLORS: Record<string, string> = { HIGH: 'text-red-600', MEDIUM: 'text-amber-600', LOW: 'text-green-600' };
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#7c3aed', '#4f46e5'];

// ── component ────────────────────────────────────────────────────────────────

export function TeamOptimizerPage() {
  usePageTitle('Team Optimizer');

  const [optimization, setOptimization] = useState<TeamOptimizationResult | null>(null);
  const [analysis, setAnalysis] = useState<TeamCompositionAnalysis | null>(null);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [optForm, setOptForm] = useState({ optimizationType: 'NEW_TEAM' as string, teamName: '', department: '', teamSize: '6', requiredSkills: '', objectives: '' });
  const [analyzeTeamId, setAnalyzeTeamId] = useState('');

  // ── mutations ─────────────────────────────────────────────────────────

  const optimizeMutation = useMutation({
    mutationFn: (data: Parameters<typeof actionableInsightsApi.optimizeTeamComposition>[0]) =>
      actionableInsightsApi.optimizeTeamComposition(data),
    onSuccess: (raw) => {
      const res = (raw as any)?.data ?? raw;
      setOptimization(res);
      toast.success('Team optimization complete');
      setShowOptimizeModal(false);
    },
    onError: () => toast.error('Optimization failed'),
  });

  const analyzeMutation = useMutation({
    mutationFn: (teamId: string) => actionableInsightsApi.analyzeTeamComposition(teamId),
    onSuccess: (raw) => {
      const res = (raw as any)?.data ?? raw;
      setAnalysis(res);
      toast.success('Team analysis complete');
      setShowAnalyzeModal(false);
    },
    onError: () => toast.error('Analysis failed'),
  });

  // ── chart data ────────────────────────────────────────────────────────

  const radarData = useMemo(() => {
    if (!optimization) return [];
    return [
      { dimension: 'Skills', score: optimization.skillCoverageScore },
      { dimension: 'Diversity', score: optimization.diversityScore },
      { dimension: 'Collaboration', score: optimization.collaborationScore },
      { dimension: 'Performance', score: optimization.performanceScore },
      { dimension: 'Chemistry', score: optimization.chemistryScore },
    ];
  }, [optimization]);

  const seniorityData = useMemo(() => {
    if (!analysis?.seniorityMix) return [];
    return Object.entries(analysis.seniorityMix).map(([level, count]) => ({ name: level, value: count }));
  }, [analysis]);

  const skillDistData = useMemo(() => {
    if (!analysis?.skillDistribution) return [];
    return Object.entries(analysis.skillDistribution)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [analysis]);

  // ── tooltip ───────────────────────────────────────────────────────────

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</p>
        ))}
      </div>
    );
  };

  // ── stats from optimization + analysis ────────────────────────────────

  const stats = useMemo(() => ({
    optimizationsRun: optimization ? 1 : 0,
    skillCoverage: optimization?.skillCoverageScore?.toFixed(0) ?? '—',
    diversityScore: optimization?.diversityScore?.toFixed(0) ?? '—',
    chemistryScore: optimization?.chemistryScore?.toFixed(0) ?? '—',
  }), [optimization]);

  const hasData = optimization || analysis;

  // ── main ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <UserGroupIcon className="w-6 h-6 text-indigo-500" />
            Team Optimizer
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            AI-driven team composition optimization and analysis
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowOptimizeModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
            <PlusIcon className="w-4 h-4" /> Optimize Team
          </button>
          <button onClick={() => setShowAnalyzeModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-lg transition-colors">
            <MagnifyingGlassIcon className="w-4 h-4" /> Analyze Team
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Optimizations Run', value: stats.optimizationsRun, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Skill Coverage', value: stats.skillCoverage, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Diversity Score', value: stats.diversityScore, color: 'text-purple-600 dark:text-purple-400' },
          { label: 'Chemistry Score', value: stats.chemistryScore, color: 'text-green-600 dark:text-green-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
            <p className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</p>
            <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center py-24">
          <UserGroupIcon className="w-16 h-16 text-secondary-300 dark:text-secondary-600 mb-4" />
          <h3 className="text-lg font-semibold text-secondary-700 dark:text-secondary-300 mb-2">No optimizations yet</h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center max-w-md">
            Use "Optimize Team" to generate AI-driven team composition recommendations, or "Analyze Team" to assess an existing team.
          </p>
        </div>
      )}

      {/* Optimization result */}
      {optimization && (
        <>
          {/* Overall + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-1">{optimization.teamName}</h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-4">{optimization.optimizationType} &middot; {optimization.teamSize} members</p>
              <div className="text-center mb-4">
                <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">{(optimization.overallScore ?? 0).toFixed(0)}</p>
                <p className="text-xs text-secondary-500">Overall Score</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--color-secondary-300, #d1d5db)" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: 'var(--color-secondary-500, #6b7280)' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-secondary-400 text-center mt-2">Confidence: {((optimization.confidence ?? 0) * 100).toFixed(0)}%</p>
            </div>

            {/* Recommended members */}
            <div className="lg:col-span-2 bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Recommended Members</h3>
              {Array.isArray(optimization.recommendedMembers) && optimization.recommendedMembers.length > 0 ? (
                <div className="space-y-2">
                  {optimization.recommendedMembers.map((m: any, i: number) => (
                    <div key={i} className="flex items-center justify-between border border-secondary-100 dark:border-secondary-700 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-secondary-900 dark:text-white">{m.name || m.userId || `Member ${i + 1}`}</p>
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">{m.role || m.department || ''}</p>
                      </div>
                      {m.score != null && (
                        <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{typeof m.score === 'number' ? m.score.toFixed(0) : m.score}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-secondary-400">No member details available.</p>
              )}
              {/* Alternatives toggle */}
              {Array.isArray(optimization.alternativeOptions) && optimization.alternativeOptions.length > 0 && (
                <div className="mt-4">
                  <button onClick={() => setShowAlternatives(!showAlternatives)} className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                    {showAlternatives ? 'Hide' : 'Show'} {optimization.alternativeOptions.length} alternative option(s)
                  </button>
                  {showAlternatives && (
                    <div className="mt-2 space-y-3">
                      {optimization.alternativeOptions.map((alt: any, idx: number) => (
                        <div key={idx} className="border border-secondary-200 dark:border-secondary-700 rounded-lg p-3 space-y-1">
                          <p className="text-xs font-medium text-secondary-700 dark:text-secondary-300">Option {idx + 2} — Score: {alt.overallScore?.toFixed(0) ?? '—'}</p>
                          {Array.isArray(alt.members) && alt.members.map((m: any, mi: number) => (
                            <p key={mi} className="text-xs text-secondary-500">{m.name || m.userId || `Member ${mi + 1}`}</p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Strengths & Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-green-700 dark:text-green-400 mb-3">Strengths</h3>
              {optimization.strengthsAnalysis?.length ? (
                <ul className="space-y-2">
                  {optimization.strengthsAnalysis.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-secondary-400">No strengths data.</p>}
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-red-700 dark:text-red-400 mb-3">Risks</h3>
              {optimization.risks?.length ? (
                <ul className="space-y-2">
                  {optimization.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                      <ExclamationTriangleIcon className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      {r}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-secondary-400">No risks identified.</p>}
            </div>
          </div>

          {/* Skill Gaps & Redundancies */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-3">Skill Gaps</h3>
              {optimization.skillGaps && Object.keys(optimization.skillGaps).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(optimization.skillGaps).slice(0, 6).map(([skill, gap]: [string, any]) => (
                    <div key={skill} className="flex items-center gap-2 text-xs">
                      <span className="w-28 break-words text-secondary-600 dark:text-secondary-400">{skill}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary-200 dark:bg-secondary-600 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-500" style={{ width: `${((gap.current || 0) / (gap.required || 5)) * 100}%` }} />
                      </div>
                      <span className="text-secondary-500 w-8 text-right">{gap.current ?? 0}/{gap.required ?? 5}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-secondary-400">No skill gaps identified.</p>}
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-3">Redundancies</h3>
              {optimization.redundancies?.length ? (
                <div className="flex flex-wrap gap-2">
                  {optimization.redundancies.map((r, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{r}</span>
                  ))}
                </div>
              ) : <p className="text-xs text-secondary-400">No redundancies found.</p>}
            </div>
          </div>

          {/* Implementation Steps */}
          {Array.isArray(optimization.implementationSteps) && optimization.implementationSteps.length > 0 && (
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Implementation Steps</h3>
              <div className="space-y-3">
                {optimization.implementationSteps.map((step: any, i: number) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">{step.action || step.title || step.step || `Step ${i + 1}`}</p>
                      {step.owner && <p className="text-xs text-secondary-500 dark:text-secondary-400">Owner: {step.owner}</p>}
                      {step.timeline && <p className="text-xs text-secondary-400">{step.timeline}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Team Analysis */}
      {analysis && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Team Composition Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center"><p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{analysis.teamSize}</p><p className="text-xs text-secondary-500">Team Size</p></div>
              <div className="text-center"><p className="text-xl font-bold text-blue-600 dark:text-blue-400">{analysis.avgTenure?.toFixed(1) ?? '—'}</p><p className="text-xs text-secondary-500">Average Tenure (yrs)</p></div>
              <div className="text-center"><p className="text-xl font-bold text-purple-600 dark:text-purple-400">{analysis.avgPerformanceScore?.toFixed(1) ?? '—'}</p><p className="text-xs text-secondary-500">Average Performance</p></div>
              <div className="text-center"><p className="text-xl font-bold text-green-600 dark:text-green-400">{analysis.productivityScore?.toFixed(0) ?? '—'}</p><p className="text-xs text-secondary-500">Productivity</p></div>
            </div>

            {/* Health indicators */}
            <div className="flex flex-wrap gap-3 mb-6">
              <span className={clsx('px-2 py-1 rounded-lg text-xs font-medium', RISK_COLORS[analysis.turnoverRisk] || 'text-secondary-600')}>
                Turnover: {analysis.turnoverRisk}
              </span>
              <span className={clsx('px-2 py-1 rounded-lg text-xs font-medium', RISK_COLORS[analysis.burnoutRisk] || 'text-secondary-600')}>
                Burnout: {analysis.burnoutRisk}
              </span>
              <span className="px-2 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400">
                Engagement: {analysis.engagementLevel}
              </span>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {seniorityData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">Seniority Mix</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={seniorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={35} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                          {seniorityData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
              {skillDistData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-2">Skill Distribution</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={skillDistData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-secondary-200, #e5e7eb)" opacity={0.5} />
                        <XAxis dataKey="skill" tick={{ fontSize: 9, fill: 'var(--color-secondary-400, #9ca3af)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                        <Bar dataKey="count" name="Count" fill="#6366f1" barSize={20} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strengths & Vulnerabilities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">Key Strengths</h3>
              <ul className="space-y-1">
                {(analysis.keyStrengths || []).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                    <CheckCircleIcon className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />{s}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Vulnerabilities</h3>
              <ul className="space-y-1">
                {(analysis.vulnerabilities || []).map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />{v}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Priority Actions */}
          {analysis.priorityActions?.length > 0 && (
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Priority Actions</h3>
              <div className="space-y-2">
                {analysis.priorityActions.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                    <ArrowPathIcon className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />{a}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Optimize Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Optimize Team Composition</h3>
              <button onClick={() => setShowOptimizeModal(false)} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Optimization Type</label>
                <select value={optForm.optimizationType} onChange={(e) => setOptForm((p) => ({ ...p, optimizationType: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  {OPT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Team Name <span className="text-red-500">*</span></label>
                <input type="text" value={optForm.teamName} onChange={(e) => setOptForm((p) => ({ ...p, teamName: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Platform Engineering" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Department <span className="text-secondary-400">(optional)</span></label>
                <input type="text" value={optForm.department} onChange={(e) => setOptForm((p) => ({ ...p, department: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Engineering" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Team Size</label>
                <input type="number" value={optForm.teamSize} onChange={(e) => setOptForm((p) => ({ ...p, teamSize: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min={2} max={50} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Required Skills <span className="text-secondary-400">(comma-separated)</span></label>
                <input type="text" value={optForm.requiredSkills} onChange={(e) => setOptForm((p) => ({ ...p, requiredSkills: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. React, Node.js, DevOps" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Objectives <span className="text-secondary-400">(optional)</span></label>
                <textarea value={optForm.objectives} onChange={(e) => setOptForm((p) => ({ ...p, objectives: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={3} placeholder="What should this team achieve?" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200 dark:border-secondary-700">
              <button onClick={() => setShowOptimizeModal(false)} className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if (!optForm.teamName.trim()) { toast.error('Team name is required'); return; }
                  const skills = optForm.requiredSkills.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ skillName: s, minLevel: 3 }));
                  optimizeMutation.mutate({
                    optimizationType: optForm.optimizationType,
                    teamName: optForm.teamName.trim(),
                    department: optForm.department.trim() || undefined,
                    teamSize: Number(optForm.teamSize) || 6,
                    requiredSkills: skills,
                    requiredCompetencies: [],
                    objectives: optForm.objectives ? [{ description: optForm.objectives }] : undefined,
                  });
                }}
                disabled={optimizeMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {optimizeMutation.isPending ? 'Optimizing...' : 'Optimize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analyze Modal */}
      {showAnalyzeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Analyze Team</h3>
              <button onClick={() => setShowAnalyzeModal(false)} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Team ID <span className="text-red-500">*</span></label>
              <input type="text" value={analyzeTeamId} onChange={(e) => setAnalyzeTeamId(e.target.value)}
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Enter team ID" />
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200 dark:border-secondary-700">
              <button onClick={() => setShowAnalyzeModal(false)} className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if (!analyzeTeamId.trim()) { toast.error('Team ID is required'); return; }
                  analyzeMutation.mutate(analyzeTeamId.trim());
                }}
                disabled={analyzeMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {analyzeMutation.isPending ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
