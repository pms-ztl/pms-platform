// ============================================================================
// Phase 4 — AI Development Plan Generator
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  PlusIcon,
  AcademicCapIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  BookOpenIcon,
  FlagIcon,
  BriefcaseIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  UserIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts';
import { actionableInsightsApi, type GeneratedDevPlan } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { EmployeePicker, MasterDetail, SafeGrid, ChartTooltip as SharedChartTooltip } from '@/components/ui';
import { useChartColors } from '@/hooks/useChartColors';

/* ── helpers ─────────────────────────────────────────────────────────── */

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  CAREER_GROWTH:            { label: 'Career Growth',            color: 'text-blue-400',   bg: 'bg-blue-500/20' },
  SKILL_DEVELOPMENT:        { label: 'Skill Development',        color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  LEADERSHIP:               { label: 'Leadership',               color: 'text-purple-400', bg: 'bg-purple-500/20' },
  PERFORMANCE_IMPROVEMENT:  { label: 'Performance Improvement',  color: 'text-amber-400',  bg: 'bg-amber-500/20' },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:     { label: 'Active',     color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  COMPLETED:  { label: 'Completed',  color: 'text-blue-400',    bg: 'bg-blue-500/20' },
  DRAFT:      { label: 'Draft',      color: 'text-gray-400',    bg: 'bg-gray-500/20' },
  ON_HOLD:    { label: 'On Hold',    color: 'text-amber-400',   bg: 'bg-amber-500/20' },
  CANCELLED:  { label: 'Cancelled',  color: 'text-red-400',     bg: 'bg-red-500/20' },
};

function badge(map: Record<string, { label: string; color: string; bg: string }>, key?: string) {
  const cc = useChartColors();
  const CHART_COLORS = cc.palette(2);
  const m = map[(key ?? '').toUpperCase()] ?? { label: key ?? '—', color: 'text-gray-400', bg: 'bg-gray-500/20' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>{m.label}</span>;
}

function pct(v?: number) { return typeof v === 'number' ? `${Math.round(v)}%` : '—'; }
function money(v?: number) { return typeof v === 'number' ? `$${v.toLocaleString()}` : '—'; }

// Chart colors derived from accent palette inside component

/* ── component ───────────────────────────────────────────────────────── */

export function AIDevPlanPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();

  // ── state ──
  const [userId, setUserId] = useState(currentUser?.id ?? '');
  const [lookupId, setLookupId] = useState(currentUser?.id ?? '');
  const [selectedPlan, setSelectedPlan] = useState<GeneratedDevPlan | null>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({ userId: '', planType: 'CAREER_GROWTH', careerGoal: '', targetRole: '', targetLevel: '', duration: 6 });

  // ── queries ──
  const { data: plansRaw, isLoading } = useQuery({
    queryKey: ['dev-plans', lookupId],
    queryFn: () => actionableInsightsApi.getUserDevelopmentPlans(lookupId),
    enabled: !!lookupId,
    staleTime: 60_000,
  });
  const plans: GeneratedDevPlan[] = useMemo(() => {
    if (!plansRaw) return [];
    const raw = (plansRaw as any)?.data ?? plansRaw;
    return Array.isArray(raw) ? raw : [];
  }, [plansRaw]);

  // ── mutations ──
  const generateMut = useMutation({
    mutationFn: (d: typeof genForm) => actionableInsightsApi.generateDevelopmentPlan({
      userId: d.userId, planType: d.planType, careerGoal: d.careerGoal,
      targetRole: d.targetRole || undefined, targetLevel: d.targetLevel || undefined,
      duration: d.duration,
    }),
    onSuccess: () => { toast.success('Development plan generated'); setShowGenModal(false); qc.invalidateQueries({ queryKey: ['dev-plans'] }); },
    onError: (err: any) => toast.error(err?.message || 'Failed to generate plan'),
  });

  const progressMut = useMutation({
    mutationFn: (id: string) => actionableInsightsApi.updatePlanProgress(id),
    onSuccess: () => { toast.success('Progress updated'); qc.invalidateQueries({ queryKey: ['dev-plans'] }); },
    onError: () => toast.error('Failed to update progress'),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => actionableInsightsApi.completePlan(id),
    onSuccess: () => { toast.success('Plan marked complete'); qc.invalidateQueries({ queryKey: ['dev-plans'] }); },
    onError: () => toast.error('Failed to complete plan'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => actionableInsightsApi.deletePlan(id),
    onSuccess: () => { toast.success('Plan deleted'); setSelectedPlan(null); qc.invalidateQueries({ queryKey: ['dev-plans'] }); },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete plan'),
  });

  // ── derived stats ──
  const stats = useMemo(() => {
    const total = plans.length;
    const active = plans.filter(p => (p.status ?? '').toUpperCase() === 'ACTIVE').length;
    const avgProgress = total ? Math.round(plans.reduce((s, p) => s + (p.progressPercentage ?? 0), 0) / total) : 0;
    const totalBudget = plans.reduce((s, p) => s + (p.budget ?? 0), 0);
    return { total, active, avgProgress, totalBudget };
  }, [plans]);

  const handleLookup = () => { if (userId.trim()) setLookupId(userId.trim()); };

  // ── skill gap chart data ──
  const skillGapData = useMemo(() => {
    if (!selectedPlan?.skillGapAnalysis) return [];
    return Object.entries(selectedPlan.skillGapAnalysis).map(([skill, val]: [string, any]) => ({
      skill: skill,
      current: val?.currentLevel ?? val?.current ?? 0,
      required: val?.requiredLevel ?? val?.required ?? val?.targetLevel ?? 0,
    }));
  }, [selectedPlan]);

  // auto-select first plan when plans load
  useEffect(() => {
    if (plans.length > 0 && !selectedPlan) setSelectedPlan(plans[0]);
  }, [plans]);

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <SparklesIcon className="h-7 w-7 text-purple-400" /> AI Development Plans
          </h1>
          <p className="text-sm text-gray-400 mt-1">AI-generated development plans with skill gap analysis, competency mapping &amp; learning paths</p>
        </div>
        <button onClick={() => setShowGenModal(true)} className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors">
          <PlusIcon className="h-4 w-4" /> Generate Plan
        </button>
      </div>

      {/* ── User lookup ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <EmployeePicker
            value={userId}
            onChange={(id) => { setUserId(id); if (id) setLookupId(id); }}
            placeholder="Search employees..."
            label="Look up development plans for"
            dark
            accent="purple"
            className="flex-1 sm:max-w-sm"
          />
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────── */}
      {lookupId && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Plans',   value: stats.total,                     icon: BookOpenIcon,        color: 'text-blue-400' },
            { label: 'Active Plans',  value: stats.active,                    icon: RocketLaunchIcon,    color: 'text-emerald-400' },
            { label: 'Average Progress',  value: pct(stats.avgProgress),          icon: ChartBarIcon,        color: 'text-amber-400' },
            { label: 'Total Budget',  value: money(stats.totalBudget),        icon: CurrencyDollarIcon,  color: 'text-purple-400' },
          ].map(c => (
            <div key={c.label} className="rounded-xl border border-gray-700 bg-gray-800/60 p-4">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><c.icon className={`h-4 w-4 ${c.color}`} />{c.label}</div>
              <p className="text-xl font-bold text-white">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Loading / empty ─────────────────────────────────────────── */}
      {isLoading && lookupId && (
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="h-8 w-8 text-purple-400 animate-spin" />
        </div>
      )}

      {!isLoading && !lookupId && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6 text-center">
          <SparklesIcon className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-300 mb-2">AI Development Plan Generator</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Generate personalized development plans powered by AI. Select an employee above to view existing plans, or click <strong>Generate Plan</strong> to create a new one.
          </p>
        </div>
      )}

      {!isLoading && lookupId && plans.length === 0 && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6 text-center">
          <AcademicCapIcon className="h-8 w-8 text-gray-600 mx-auto mb-2" />
          <p className="text-gray-400">No development plans found for this user.</p>
          <button onClick={() => { setGenForm(f => ({ ...f, userId: lookupId })); setShowGenModal(true); }} className="mt-2 text-sm text-purple-400 hover:text-purple-300">Generate one now &rarr;</button>
        </div>
      )}

      {/* ── Plans master-detail ─────────────────────────────────────── */}
      {plans.length > 0 && (
        <MasterDetail<GeneratedDevPlan>
          items={plans}
          selectedItem={selectedPlan}
          onClearSelection={() => setSelectedPlan(null)}
          detailTitle={selectedPlan?.planName ?? 'Plan Details'}
          detailWidth={520}
          renderList={(items) => (
            <SafeGrid minWidth={280} gap="gap-3">
              {items.map(plan => {
                const isSelected = selectedPlan?.id === plan.id;
                return (
                  <button key={plan.id} onClick={() => setSelectedPlan(isSelected ? null : plan)} className={`text-left rounded-xl border p-4 transition-all ${isSelected ? 'border-purple-500 bg-purple-500/10' : 'border-gray-700 bg-gray-800/60 hover:border-gray-600'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-white truncate min-w-0">{plan.planName || 'Untitled Plan'}</h4>
                      <span className="flex-shrink-0">{badge(STATUS_META, plan.status)}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {badge(TYPE_META, plan.planType)}
                      {plan.targetRole && <span className="text-xs text-secondary-700 dark:text-secondary-300 flex items-center gap-1"><BriefcaseIcon className="h-3 w-3" />{plan.targetRole}</span>}
                      {plan.duration && <span className="text-xs text-secondary-700 dark:text-secondary-300 flex items-center gap-1"><ClockIcon className="h-3 w-3" />{plan.duration} mo</span>}
                    </div>

                    {/* progress bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-secondary-700 dark:text-secondary-300 mb-1">
                        <span>Progress</span><span>{pct(plan.progressPercentage)}</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${plan.progressPercentage ?? 0}%` }} />
                      </div>
                    </div>

                    <p className="text-xs text-secondary-700 dark:text-secondary-300 mb-3">{plan.careerGoal}</p>

                    <div className="flex items-center gap-2 text-xs text-secondary-700 dark:text-secondary-300">
                      <span>{plan.totalActivities ?? 0} activities</span>
                      <span>&middot;</span>
                      <span>{money(plan.budget)}</span>
                    </div>

                    {/* quick actions */}
                    <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                      <button onClick={() => progressMut.mutate(plan.id)} disabled={progressMut.isPending} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-gray-600 px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50">
                        <ArrowPathIcon className="h-3 w-3" /> Update
                      </button>
                      <button onClick={() => completeMut.mutate(plan.id)} disabled={completeMut.isPending || (plan.status ?? '').toUpperCase() === 'COMPLETED'} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-emerald-600/40 px-2 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50">
                        <CheckCircleIcon className="h-3 w-3" /> Complete
                      </button>
                      <button onClick={() => { if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) deleteMut.mutate(plan.id); }} disabled={deleteMut.isPending} className="flex items-center justify-center gap-1 rounded-lg border border-red-600/40 px-2 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50" title="Delete plan">
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </button>
                );
              })}
            </SafeGrid>
          )}
          renderDetail={(plan) => (
            <div className="space-y-4">
              {/* meta row */}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="text-gray-400 flex items-center gap-1"><UserIcon className="h-3.5 w-3.5" /> {plan.userId}</span>
                <span className="text-gray-400 flex items-center gap-1"><BriefcaseIcon className="h-3.5 w-3.5" /> {plan.currentLevel}</span>
                {plan.targetRole && <span className="text-gray-400 flex items-center gap-1"><FlagIcon className="h-3.5 w-3.5" /> Target: {plan.targetRole}</span>}
                <span className="text-gray-400 flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5" /> {plan.duration} months</span>
                <span className="text-gray-400 flex items-center gap-1"><CurrencyDollarIcon className="h-3.5 w-3.5" /> {money(plan.budget)}</span>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Overall Progress</span><span>{pct(plan.progressPercentage)}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${plan.progressPercentage ?? 0}%` }} />
                </div>
              </div>

              {/* Strengths / Development areas */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 mb-2">Strengths Assessed</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(plan.strengthsAssessed ?? []).map((s, i) => (
                      <span key={i} className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                    {(plan.strengthsAssessed ?? []).length === 0 && <p className="text-xs text-gray-500">None assessed</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 mb-2">Development Areas</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(plan.developmentAreas ?? []).map((d, i) => (
                      <span key={i} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{d}</span>
                    ))}
                    {(plan.developmentAreas ?? []).length === 0 && <p className="text-xs text-gray-500">None identified</p>}
                  </div>
                </div>
              </div>

              {/* Skill Gap Chart */}
              {skillGapData.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white mb-3">Skill Gap Analysis</h4>
                  <ResponsiveContainer width="100%" height={Math.max(180, skillGapData.length * 34)}>
                    <BarChart layout="vertical" data={skillGapData} margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={cc.primaryExtraDark} />
                      <XAxis type="number" domain={[0, 10]} tick={{  fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} />
                      <YAxis type="category" dataKey="skill" width={100} tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }} />
                      <Tooltip isAnimationActive={false} cursor={{ fill: cc.cursorFill }} content={<SharedChartTooltip />} />
                      <Legend />
                      <Bar dataKey="current" name="Current" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar dataKey="required" name="Required" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Competency Gaps */}
              {plan.competencyGaps && Object.keys(plan.competencyGaps).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white mb-2">Competency Gaps</h4>
                  <div className="space-y-2">
                    {Object.entries(plan.competencyGaps).map(([comp, val]: [string, any]) => {
                      const current = val?.currentLevel ?? val?.current ?? 0;
                      const required = val?.requiredLevel ?? val?.required ?? 0;
                      const gap = Math.max(0, required - current);
                      return (
                        <div key={comp} className="rounded-lg border border-gray-600 bg-gray-700/40 p-2.5">
                          <p className="text-xs font-medium text-white mb-1">{comp}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>Current: {current}</span>
                            <span>&rarr;</span>
                            <span>Required: {required}</span>
                            <span className={`ml-auto font-semibold ${gap > 2 ? 'text-red-400' : gap > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              Gap: {gap}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Milestones Timeline */}
              {(plan.milestones ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white mb-3">Career Path Milestones</h4>
                  <div className="relative pl-6 space-y-3">
                    <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gray-600" />
                    {(plan.milestones as any[]).map((ms, i) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-3.5 top-1 h-5 w-5 rounded-full border-2 flex items-center justify-center text-2xs font-bold ${ms.completed || ms.status === 'COMPLETED' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-gray-700 border-gray-500 text-gray-400'}`}>
                          {i + 1}
                        </div>
                        <div className="ml-4 rounded-lg border border-gray-600 bg-gray-700/40 p-2.5">
                          <p className="text-xs font-medium text-white">{ms.title ?? ms.name ?? `Milestone ${i + 1}`}</p>
                          {ms.description && <p className="text-xs text-gray-400 mt-1">{ms.description}</p>}
                          <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-gray-500">
                            {ms.targetDate && <span>Target: {ms.targetDate}</span>}
                            {ms.dueDate && <span>Due: {ms.dueDate}</span>}
                            {ms.status && badge(STATUS_META, ms.status)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activities */}
              {(plan.activities ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white mb-2">Development Activities ({plan.totalActivities ?? plan.activities.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-700 text-xs text-gray-400">
                          <th className="pb-1.5 pr-3">Type</th>
                          <th className="pb-1.5 pr-3">Title</th>
                          <th className="pb-1.5 pr-3">Priority</th>
                          <th className="pb-1.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(plan.activities as any[]).map((act, i) => (
                          <tr key={i} className="border-b border-gray-700/50">
                            <td className="py-1.5 pr-3"><span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">{act.type ?? act.activityType ?? '—'}</span></td>
                            <td className="py-1.5 pr-3 text-white">{act.title ?? act.name ?? '—'}</td>
                            <td className="py-1.5 pr-3">
                              <span className={`text-xs font-medium ${
                                (act.priority ?? '').toUpperCase() === 'HIGH' ? 'text-red-400'
                                : (act.priority ?? '').toUpperCase() === 'MEDIUM' ? 'text-amber-400'
                                : 'text-gray-400'
                              }`}>
                                {act.priority ?? '—'}
                              </span>
                            </td>
                            <td className="py-1.5">{badge(STATUS_META, act.status)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Success Metrics */}
              {(plan.successMetrics ?? []).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-white mb-2">Success Metrics</h4>
                  <div className="space-y-2">
                    {(plan.successMetrics as any[]).map((m, i) => (
                      <div key={i} className="rounded-lg border border-gray-600 bg-gray-700/40 p-2.5">
                        <p className="text-xs font-medium text-white mb-1">{m.name ?? m.metric ?? `Metric ${i + 1}`}</p>
                        <div className="flex items-end justify-between text-xs">
                          <div>
                            <span className="text-gray-500">Target: </span>
                            <span className="font-bold text-blue-400">{m.target ?? '—'} {m.unit ?? ''}</span>
                          </div>
                          {m.current != null && (
                            <div>
                              <span className="text-gray-500">Current: </span>
                              <span className="font-bold text-emerald-400">{m.current} {m.unit ?? ''}</span>
                            </div>
                          )}
                        </div>
                        {m.target != null && m.current != null && (
                          <div className="mt-1.5">
                            <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        />
      )}

      {/* ── Generate Plan Modal ─────────────────────────────────────── */}
      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowGenModal(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Generate AI Development Plan</h2>
              <button onClick={() => setShowGenModal(false)} className="text-gray-400 hover:text-white"><XMarkIcon className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Employee *</label>
                <EmployeePicker
                  value={genForm.userId}
                  onChange={(id) => setGenForm(f => ({ ...f, userId: id }))}
                  placeholder="Search for an employee..."
                  dark
                  accent="purple"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Plan Type *</label>
                <select value={genForm.planType} onChange={e => setGenForm(f => ({ ...f, planType: e.target.value }))} className="w-full rounded-lg border border-secondary-200 dark:border-secondary-700/50 bg-white dark:bg-secondary-800 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-500/50 backdrop-blur-sm transition-all duration-300">
                  <option value="CAREER_GROWTH">Career Growth</option>
                  <option value="SKILL_DEVELOPMENT">Skill Development</option>
                  <option value="LEADERSHIP">Leadership</option>
                  <option value="PERFORMANCE_IMPROVEMENT">Performance Improvement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Career Goal *</label>
                <textarea value={genForm.careerGoal} onChange={e => setGenForm(f => ({ ...f, careerGoal: e.target.value }))} rows={3} placeholder="Describe the career goal…" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Target Role</label>
                  <input value={genForm.targetRole} onChange={e => setGenForm(f => ({ ...f, targetRole: e.target.value }))} placeholder="e.g. Senior Engineer" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Target Level</label>
                  <input value={genForm.targetLevel} onChange={e => setGenForm(f => ({ ...f, targetLevel: e.target.value }))} placeholder="e.g. L5" className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Duration (months): {genForm.duration}</label>
                <input type="range" min={1} max={24} value={genForm.duration} onChange={e => setGenForm(f => ({ ...f, duration: Number(e.target.value) }))} className="w-full accent-purple-500" />
                <div className="flex justify-between text-xs text-gray-500 mt-1"><span>1 mo</span><span>24 mo</span></div>
              </div>
            </div>

            {/* Validation hints */}
            {genForm.careerGoal.length > 0 && genForm.careerGoal.length < 10 && (
              <p className="text-xs text-amber-400">Career goal must be at least 10 characters ({10 - genForm.careerGoal.length} more needed)</p>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowGenModal(false)} className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Cancel</button>
              <button onClick={() => {
                if (!genForm.userId.trim()) { toast.error('Please select an employee'); return; }
                if (genForm.careerGoal.trim().length < 10) { toast.error('Career goal must be at least 10 characters'); return; }
                generateMut.mutate(genForm);
              }} disabled={generateMut.isPending || !genForm.userId.trim() || genForm.careerGoal.trim().length < 10} className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition-colors">
                {generateMut.isPending && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
                Generate Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
