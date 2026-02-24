import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  LightBulbIcon,
  PlusIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  actionableInsightsApi,
  type PromotionRecommendation,
  type SuccessionPlan,
} from '@/lib/api/actionable-insights';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── constants ────────────────────────────────────────────────────────────────

const READINESS_BADGE: Record<string, { label: string; cls: string }> = {
  READY_NOW: { label: 'Ready Now', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  READY_1_YEAR: { label: '1 Year', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  READY_2_YEARS: { label: '2 Years', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  NEEDS_DEVELOPMENT: { label: 'Needs Dev', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
};

const CRITICALITY_BADGE: Record<string, { cls: string }> = {
  CRITICAL: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  HIGH: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  MEDIUM: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  LOW: { cls: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300' },
};

// ── component ────────────────────────────────────────────────────────────────

export function TalentIntelligencePage() {
  usePageTitle('Talent Intelligence');
  const queryClient = useQueryClient();

  const [selectedRec, setSelectedRec] = useState<PromotionRecommendation | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showSuccessionModal, setShowSuccessionModal] = useState(false);
  const [genForm, setGenForm] = useState({ userId: '', targetRole: '', targetLevel: '', targetDepartment: '' });
  const [succForm, setSuccForm] = useState({ positionId: '', positionTitle: '', currentIncumbent: '', criticality: 'HIGH' });
  const [recUserId, setRecUserId] = useState('');

  // ── queries ─────────────────────────────────────────────────────────────

  const { data: recsRaw, isLoading: loadingRecs } = useQuery({
    queryKey: ['talent', 'recommendations', recUserId],
    queryFn: () => recUserId ? actionableInsightsApi.getUserPromotionRecommendations(recUserId) : Promise.resolve([]),
    enabled: !!recUserId,
    staleTime: 60_000,
  });

  const { data: plansRaw, isLoading: loadingPlans } = useQuery({
    queryKey: ['talent', 'succession-plans'],
    queryFn: () => actionableInsightsApi.getSuccessionPlans(),
    staleTime: 60_000,
  });

  const isLoading = loadingRecs || loadingPlans;

  // ── normalize ───────────────────────────────────────────────────────────

  const recommendations: PromotionRecommendation[] = useMemo(() => {
    const raw = (recsRaw as any)?.data ?? recsRaw;
    return Array.isArray(raw) ? raw : [];
  }, [recsRaw]);

  const successionPlans: SuccessionPlan[] = useMemo(() => {
    const raw = (plansRaw as any)?.data ?? plansRaw;
    return Array.isArray(raw) ? raw : [];
  }, [plansRaw]);

  // ── stats ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const readyNow = recommendations.filter((r) => r.readinessLevel === 'READY_NOW').length;
    const avgConf = recommendations.length
      ? Math.round(recommendations.reduce((s, r) => s + r.confidenceScore, 0) / recommendations.length)
      : 0;
    return {
      totalRecs: recommendations.length,
      readyNow,
      successionCount: successionPlans.length,
      avgConfidence: avgConf,
    };
  }, [recommendations, successionPlans]);

  // ── radar data ──────────────────────────────────────────────────────────

  const radarData = useMemo(() => {
    if (!selectedRec) return [];
    return [
      { dimension: 'Performance', score: selectedRec.performanceScore },
      { dimension: 'Potential', score: selectedRec.potentialScore },
      { dimension: 'Skills Match', score: selectedRec.skillsMatchScore },
      { dimension: 'Leadership', score: selectedRec.leadershipScore },
      { dimension: 'Tenure', score: selectedRec.tenureScore },
      { dimension: 'Engagement', score: selectedRec.engagementScore },
    ];
  }, [selectedRec]);

  // ── mutations ─────────────────────────────────────────────────────────

  const generateMutation = useMutation({
    mutationFn: (data: { userId: string; targetRole: string; targetLevel?: string; targetDepartment?: string }) =>
      actionableInsightsApi.generatePromotionRecommendation(data),
    onSuccess: () => {
      toast.success('Recommendation generated');
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      setShowGenerateModal(false);
      setGenForm({ userId: '', targetRole: '', targetLevel: '', targetDepartment: '' });
    },
    onError: () => toast.error('Failed to generate recommendation'),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => actionableInsightsApi.approveRecommendation(id),
    onSuccess: () => { toast.success('Recommendation approved'); queryClient.invalidateQueries({ queryKey: ['talent'] }); },
    onError: () => toast.error('Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => actionableInsightsApi.rejectRecommendation(id),
    onSuccess: () => { toast.success('Recommendation rejected'); queryClient.invalidateQueries({ queryKey: ['talent'] }); },
    onError: () => toast.error('Failed to reject'),
  });

  const successionMutation = useMutation({
    mutationFn: (data: { positionId: string; positionTitle: string; currentIncumbent?: string; criticality: string }) =>
      actionableInsightsApi.createSuccessionPlan(data),
    onSuccess: () => {
      toast.success('Succession plan created');
      queryClient.invalidateQueries({ queryKey: ['talent'] });
      setShowSuccessionModal(false);
      setSuccForm({ positionId: '', positionTitle: '', currentIncumbent: '', criticality: 'HIGH' });
    },
    onError: () => toast.error('Failed to create succession plan'),
  });

  // ── tooltip ───────────────────────────────────────────────────────────

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-xl px-3 py-2 shadow-2xl text-xs space-y-1">
        <p className="font-semibold text-white">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value?.toFixed(1)}</p>
        ))}
      </div>
    );
  };

  // ── skeleton ──────────────────────────────────────────────────────────

  if (isLoading && recUserId) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-72 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
      </div>
    );
  }

  // ── main ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <LightBulbIcon className="w-6 h-6 text-amber-500" />
            Talent Intelligence
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            AI-powered promotion recommendations and succession planning
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowGenerateModal(true)} className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">
            <PlusIcon className="w-4 h-4 flex-shrink-0" /> <span className="hidden sm:inline">Generate</span> Recommendation
          </button>
          <button onClick={() => setShowSuccessionModal(true)} className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
            <UserGroupIcon className="w-4 h-4 flex-shrink-0" /> Succession Plan
          </button>
        </div>
      </div>

      {/* User lookup */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Lookup recommendations for:</label>
          <input
            type="text"
            value={recUserId}
            onChange={(e) => setRecUserId(e.target.value)}
            placeholder="Enter User ID"
            className="flex-1 sm:max-w-xs rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-1.5 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Recommendations', value: stats.totalRecs, icon: LightBulbIcon, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Ready Now', value: stats.readyNow, icon: CheckCircleIcon, color: 'text-green-600 dark:text-green-400' },
          { label: 'Succession Plans', value: stats.successionCount, icon: UserGroupIcon, color: 'text-indigo-600 dark:text-indigo-400' },
          { label: 'Average Confidence', value: `${stats.avgConfidence}%`, icon: ShieldCheckIcon, color: 'text-blue-600 dark:text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs sm:text-sm text-secondary-500 dark:text-secondary-400 leading-tight min-w-0">{s.label}</p>
              <s.icon className={clsx('w-4 h-4 flex-shrink-0 mt-0.5', s.color)} />
            </div>
            <p className={clsx('text-xl sm:text-2xl font-bold mt-1 whitespace-nowrap', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recommendations table + radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Promotion Recommendations</h3>
          {recommendations.length === 0 ? (
            <div className="text-center py-16 text-secondary-400 text-sm">
              {recUserId ? 'No recommendations found for this user.' : 'Enter a User ID above to view promotion recommendations.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-secondary-200/60 dark:border-white/[0.06]">
                    {['Target Role', 'Overall', 'Readiness', 'Confidence', 'Success Prob.', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 pb-2 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((r) => {
                    const badge = READINESS_BADGE[r.readinessLevel] || READINESS_BADGE.NEEDS_DEVELOPMENT;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedRec(r)}
                        className={clsx(
                          'border-b border-secondary-100 dark:border-secondary-700/50 last:border-0 cursor-pointer transition-colors',
                          selectedRec?.id === r.id ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/30'
                        )}
                      >
                        <td className="py-2.5 pr-3 text-xs font-medium text-secondary-900 dark:text-white">{r.targetRole}</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-secondary-200 dark:bg-secondary-600 overflow-hidden">
                              <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(r.overallScore, 100)}%` }} />
                            </div>
                            <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">{(r.overallScore ?? 0).toFixed(0)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={clsx('px-2 py-0.5 rounded-full text-2xs font-medium', badge.cls)}>{badge.label}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-secondary-600 dark:text-secondary-400">{(r.confidenceScore ?? 0).toFixed(0)}%</td>
                        <td className="py-2.5 pr-3 text-xs text-secondary-600 dark:text-secondary-400">{(r.successProbability ?? 0).toFixed(0)}%</td>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); approveMutation.mutate(r.id); }}
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                              title="Approve"
                            >
                              <CheckCircleIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(r.id); }}
                              className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Reject"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Radar chart */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-2">Score Breakdown</h3>
          {selectedRec ? (
            <>
              <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-3">{selectedRec.targetRole}</p>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--color-secondary-300, #d1d5db)" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 9, fill: 'var(--color-secondary-500, #6b7280)' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 8, fill: 'var(--color-secondary-400, #9ca3af)' }} />
                    <Radar name="Score" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                    <Tooltip cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* Skill gaps */}
              {selectedRec.skillGaps && Object.keys(selectedRec.skillGaps).length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">Skill Gaps</h4>
                  {Object.entries(selectedRec.skillGaps).slice(0, 5).map(([skill, gap]: [string, any]) => (
                    <div key={skill} className="flex items-center gap-2 text-xs">
                      <span className="w-24 break-words text-secondary-600 dark:text-secondary-400">{skill}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-secondary-200 dark:bg-secondary-600 overflow-hidden">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${((gap.current || 0) / (gap.required || 5)) * 100}%` }} />
                      </div>
                      <span className="text-secondary-500">{gap.current ?? 0}/{gap.required ?? 5}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Development actions */}
              {selectedRec.developmentActions?.length > 0 && (
                <div className="mt-4 space-y-1">
                  <h4 className="text-xs font-semibold text-secondary-700 dark:text-secondary-300">Dev Actions</h4>
                  {selectedRec.developmentActions.slice(0, 4).map((a: any, i: number) => (
                    <p key={i} className="text-xs text-secondary-500 dark:text-secondary-400 flex items-start gap-1">
                      <ArrowTrendingUpIcon className="w-3 h-3 mt-0.5 text-amber-500 shrink-0" />
                      {typeof a === 'string' ? a : a.description || a.action || JSON.stringify(a)}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-56 text-secondary-400 text-xs">
              Select a recommendation to see the score breakdown
            </div>
          )}
        </div>
      </div>

      {/* Succession Plans */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Succession Plans</h3>
        {successionPlans.length === 0 ? (
          <div className="text-center py-12 text-secondary-400 text-sm">
            No succession plans yet. Create one to track critical position backups.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {successionPlans.map((plan) => {
              const crit = CRITICALITY_BADGE[plan.criticality] || CRITICALITY_BADGE.MEDIUM;
              return (
                <div key={plan.id} className="border border-secondary-200/60 dark:border-white/[0.06] rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-secondary-900 dark:text-white break-words">{plan.positionTitle}</h4>
                    <span className={clsx('px-2 py-0.5 rounded-full text-2xs font-medium', crit.cls)}>{plan.criticality}</span>
                  </div>
                  {plan.currentIncumbent && (
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Incumbent: {plan.currentIncumbent}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-secondary-500">Bench: <strong className="text-secondary-700 dark:text-secondary-300">{plan.benchStrength}</strong></span>
                    <span className="text-secondary-500">Risk: <strong className={plan.turnoverRisk === 'HIGH' ? 'text-red-600' : plan.turnoverRisk === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'}>{plan.turnoverRisk}</strong></span>
                  </div>
                  {Array.isArray(plan.successors) && plan.successors.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-2xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">Successors</p>
                      {plan.successors.slice(0, 3).map((s: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-secondary-700 dark:text-secondary-300">{s.name || s.userId || `Candidate ${i + 1}`}</span>
                          {s.readiness && (
                            <span className={clsx('px-1.5 py-0.5 rounded text-3xs font-medium', READINESS_BADGE[s.readiness]?.cls || 'bg-secondary-100 text-secondary-600')}>
                              {READINESS_BADGE[s.readiness]?.label || s.readiness}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Recommendation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200/60 dark:border-white/[0.06]">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Generate Promotion Recommendation</h3>
              <button onClick={() => setShowGenerateModal(false)} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { label: 'User ID', key: 'userId' as const, required: true, placeholder: 'Employee user ID' },
                { label: 'Target Role', key: 'targetRole' as const, required: true, placeholder: 'e.g. Senior Engineer' },
                { label: 'Target Level', key: 'targetLevel' as const, required: false, placeholder: 'e.g. L5 (optional)' },
                { label: 'Target Department', key: 'targetDepartment' as const, required: false, placeholder: 'e.g. Engineering (optional)' },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={genForm[field.key]}
                    onChange={(e) => setGenForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200/60 dark:border-white/[0.06]">
              <button onClick={() => setShowGenerateModal(false)} className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if (!genForm.userId.trim() || !genForm.targetRole.trim()) { toast.error('User ID and Target Role are required'); return; }
                  generateMutation.mutate({
                    userId: genForm.userId.trim(),
                    targetRole: genForm.targetRole.trim(),
                    targetLevel: genForm.targetLevel.trim() || undefined,
                    targetDepartment: genForm.targetDepartment.trim() || undefined,
                  });
                }}
                disabled={generateMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Succession Plan Modal */}
      {showSuccessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200/60 dark:border-white/[0.06]">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Create Succession Plan</h3>
              <button onClick={() => setShowSuccessionModal(false)} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Position Title <span className="text-red-500">*</span></label>
                <input type="text" value={succForm.positionTitle} onChange={(e) => setSuccForm((p) => ({ ...p, positionTitle: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. VP Engineering" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Position ID <span className="text-red-500">*</span></label>
                <input type="text" value={succForm.positionId} onChange={(e) => setSuccForm((p) => ({ ...p, positionId: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. POS-001" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Current Incumbent <span className="text-secondary-400">(optional)</span></label>
                <input type="text" value={succForm.currentIncumbent} onChange={(e) => setSuccForm((p) => ({ ...p, currentIncumbent: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Name of current role holder" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Criticality</label>
                <select value={succForm.criticality} onChange={(e) => setSuccForm((p) => ({ ...p, criticality: e.target.value }))}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200/60 dark:border-white/[0.06]">
              <button onClick={() => setShowSuccessionModal(false)} className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors">Cancel</button>
              <button
                onClick={() => {
                  if (!succForm.positionTitle.trim() || !succForm.positionId.trim()) { toast.error('Position title and ID are required'); return; }
                  successionMutation.mutate({
                    positionId: succForm.positionId.trim(),
                    positionTitle: succForm.positionTitle.trim(),
                    currentIncumbent: succForm.currentIncumbent.trim() || undefined,
                    criticality: succForm.criticality,
                  });
                }}
                disabled={successionMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {successionMutation.isPending ? 'Creating...' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
