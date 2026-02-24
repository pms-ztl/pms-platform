import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  BeakerIcon,
  ArrowPathIcon,
  ChartBarIcon,
  UserIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { simulatorApi, type SimulationInput, type SimulationResult, type SimulationImpact } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── Scenario definitions ─────────────────────────────────────────────────────

const scenarios = [
  { id: 'rating_change', label: 'Rating Change', icon: ChartBarIcon, color: 'blue', desc: 'Model the impact of changing an employee\'s performance rating' },
  { id: 'promotion', label: 'Promotion', icon: ArrowTrendingUpIcon, color: 'emerald', desc: 'Simulate promotion impact on team dynamics and budget' },
  { id: 'career_paths', label: 'Career Paths', icon: UserIcon, color: 'violet', desc: 'Explore career trajectory options and readiness gaps' },
  { id: 'team_restructure', label: 'Team Restructure', icon: UsersIcon, color: 'amber', desc: 'Model team composition changes and performance impact' },
  { id: 'budget_allocation', label: 'Budget Allocation', icon: CurrencyDollarIcon, color: 'rose', desc: 'Optimize compensation and development budget distribution' },
] as const;

type ScenarioType = typeof scenarios[number]['id'];

const colorMap: Record<string, { bg: string; border: string; text: string; ring: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-500' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500' },
};

// ── Impact card ──────────────────────────────────────────────────────────────

function ImpactCard({ impact }: { impact: SimulationImpact }) {
  const severityColors = {
    low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    medium: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    high: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  };
  const directionIcons = {
    positive: <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />,
    negative: <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />,
    neutral: <ArrowPathIcon className="h-4 w-4 text-secondary-400" />,
  };

  return (
    <div className="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {directionIcons[impact.direction]}
          <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">{impact.area}</h4>
        </div>
        <span className={clsx('text-2xs font-bold px-2 py-0.5 rounded-full', severityColors[impact.severity])}>
          {impact.severity}
        </span>
      </div>
      <p className="text-xs text-secondary-600 dark:text-secondary-400">{impact.description}</p>
      {impact.value !== undefined && (
        <div className="mt-2 text-lg font-bold text-secondary-900 dark:text-white">
          {impact.direction === 'positive' ? '+' : impact.direction === 'negative' ? '-' : ''}{impact.value}%
        </div>
      )}
    </div>
  );
}

// ── Confidence ring ──────────────────────────────────────────────────────────

function ConfidenceRing({ confidence }: { confidence: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;
  const color = confidence >= 80 ? '#10b981' : confidence >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" className="text-secondary-200 dark:text-secondary-700" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ marginTop: 28 }}>
        <span className="text-2xl font-bold text-secondary-900 dark:text-white">{Math.round(confidence)}%</span>
        <span className="text-3xs text-secondary-500 tracking-wider">Confidence</span>
      </div>
    </div>
  );
}

// ── Scenario parameter forms ─────────────────────────────────────────────────

function ScenarioForm({
  scenario,
  params,
  setParams,
}: {
  scenario: ScenarioType;
  params: Record<string, any>;
  setParams: (p: Record<string, any>) => void;
}) {
  const inputCls = 'w-full text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:outline-none';
  const labelCls = 'block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1';

  switch (scenario) {
    case 'rating_change':
      return (
        <div className="space-y-4">
          <div><label className={labelCls}>Current Rating (1-5)</label><input type="number" min={1} max={5} value={params.currentRating || 3} onChange={(e) => setParams({ ...params, currentRating: +e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Proposed Rating (1-5)</label><input type="number" min={1} max={5} value={params.proposedRating || 4} onChange={(e) => setParams({ ...params, proposedRating: +e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Department Size</label><input type="number" min={1} value={params.departmentSize || 20} onChange={(e) => setParams({ ...params, departmentSize: +e.target.value })} className={inputCls} /></div>
        </div>
      );
    case 'promotion':
      return (
        <div className="space-y-4">
          <div><label className={labelCls}>Current Level</label><input type="text" value={params.currentLevel || 'IC3'} onChange={(e) => setParams({ ...params, currentLevel: e.target.value })} className={inputCls} placeholder="e.g. IC3" /></div>
          <div><label className={labelCls}>Target Level</label><input type="text" value={params.targetLevel || 'IC4'} onChange={(e) => setParams({ ...params, targetLevel: e.target.value })} className={inputCls} placeholder="e.g. IC4" /></div>
          <div><label className={labelCls}>Years in Current Role</label><input type="number" min={0} value={params.yearsInRole || 2} onChange={(e) => setParams({ ...params, yearsInRole: +e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Salary Increase Budget (%)</label><input type="number" min={0} max={50} value={params.salaryIncrease || 15} onChange={(e) => setParams({ ...params, salaryIncrease: +e.target.value })} className={inputCls} /></div>
        </div>
      );
    case 'career_paths':
      return (
        <div className="space-y-4">
          <div><label className={labelCls}>Target Role</label><input type="text" value={params.targetRole || ''} onChange={(e) => setParams({ ...params, targetRole: e.target.value })} className={inputCls} placeholder="e.g. Engineering Manager" /></div>
          <div><label className={labelCls}>Timeline (months)</label><input type="number" min={3} max={60} value={params.timeline || 18} onChange={(e) => setParams({ ...params, timeline: +e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Willing to Relocate?</label><select value={params.relocate || 'no'} onChange={(e) => setParams({ ...params, relocate: e.target.value })} className={inputCls}><option value="no">No</option><option value="yes">Yes</option></select></div>
        </div>
      );
    case 'team_restructure':
      return (
        <div className="space-y-4">
          <div><label className={labelCls}>Current Team Size</label><input type="number" min={2} value={params.currentSize || 8} onChange={(e) => setParams({ ...params, currentSize: +e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Proposed Team Size</label><input type="number" min={2} value={params.proposedSize || 10} onChange={(e) => setParams({ ...params, proposedSize: +e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Action</label><select value={params.action || 'add'} onChange={(e) => setParams({ ...params, action: e.target.value })} className={inputCls}><option value="add">Add Members</option><option value="remove">Remove Members</option><option value="split">Split Team</option><option value="merge">Merge Teams</option></select></div>
        </div>
      );
    case 'budget_allocation':
      return (
        <div className="space-y-4">
          <div><label className={labelCls}>Total Budget ($)</label><input type="number" min={0} value={params.totalBudget || 100000} onChange={(e) => setParams({ ...params, totalBudget: +e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Development Training (%)</label><input type="range" min={0} max={100} value={params.trainingPct || 30} onChange={(e) => setParams({ ...params, trainingPct: +e.target.value })} className="w-full accent-primary-500" /><span className="text-xs text-secondary-500">{params.trainingPct || 30}%</span></div>
          <div><label className={labelCls}>Compensation Pool (%)</label><input type="range" min={0} max={100} value={params.compPct || 50} onChange={(e) => setParams({ ...params, compPct: +e.target.value })} className="w-full accent-primary-500" /><span className="text-xs text-secondary-500">{params.compPct || 50}%</span></div>
          <div><label className={labelCls}>Recognition / Rewards (%)</label><input type="range" min={0} max={100} value={params.rewardsPct || 20} onChange={(e) => setParams({ ...params, rewardsPct: +e.target.value })} className="w-full accent-primary-500" /><span className="text-xs text-secondary-500">{params.rewardsPct || 20}%</span></div>
        </div>
      );
    default:
      return null;
  }
}

// ── Main page ────────────────────────────────────────────────────────────────

export function PerformanceSimulatorPage() {
  usePageTitle('Performance Simulator');

  const [activeScenario, setActiveScenario] = useState<ScenarioType>('rating_change');
  const [params, setParams] = useState<Record<string, any>>({ currentRating: 3, proposedRating: 4, departmentSize: 20 });
  const [result, setResult] = useState<SimulationResult | null>(null);

  const simulationMutation = useMutation({
    mutationFn: (input: SimulationInput) => simulatorApi.runSimulation(input),
    onSuccess: (data) => {
      setResult(data);
      toast.success('Simulation complete');
    },
    onError: () => toast.error('Simulation failed — try adjusting parameters'),
  });

  const handleScenarioChange = (id: ScenarioType) => {
    setActiveScenario(id);
    setParams({});
    setResult(null);
  };

  const handleRun = () => {
    simulationMutation.mutate({
      scenarioType: activeScenario,
      parameters: params,
    });
  };

  const currentScenario = scenarios.find((s) => s.id === activeScenario)!;
  const colors = colorMap[currentScenario.color];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
            <BeakerIcon className="h-7 w-7 text-primary-500" />
            Performance Simulator
          </h1>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
            Run what-if scenarios to model the impact of performance decisions
          </p>
        </div>
      </div>

      {/* Scenario selector cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {scenarios.map((s) => {
          const c = colorMap[s.color];
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleScenarioChange(s.id)}
              className={clsx(
                'relative rounded-xl border-2 p-4 text-left transition-all hover:shadow-md',
                isActive ? `${c.bg} ${c.border} ring-2 ${c.ring}` : 'border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 hover:border-secondary-300'
              )}
            >
              <s.icon className={clsx('h-6 w-6 mb-2', isActive ? c.text : 'text-secondary-400')} />
              <h3 className={clsx('text-sm font-semibold', isActive ? c.text : 'text-secondary-900 dark:text-white')}>{s.label}</h3>
              <p className="text-2xs text-secondary-500 dark:text-secondary-400 mt-1">{s.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Two-column: inputs + results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input panel */}
        <div className="lg:col-span-1 space-y-5">
          <div className={clsx('rounded-2xl border p-5', colors.bg, colors.border)}>
            <h3 className={clsx('text-sm font-semibold mb-4 flex items-center gap-2', colors.text)}>
              <currentScenario.icon className="h-5 w-5" />
              {currentScenario.label} Parameters
            </h3>
            <ScenarioForm scenario={activeScenario} params={params} setParams={setParams} />
            <button
              onClick={handleRun}
              disabled={simulationMutation.isPending}
              className="w-full mt-5 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-lg shadow-primary-500/20"
            >
              {simulationMutation.isPending ? (
                <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Running...</>
              ) : (
                <><BeakerIcon className="h-4 w-4" /> Run Simulation</>
              )}
            </button>
          </div>
        </div>

        {/* Results panel */}
        <div className="lg:col-span-2 space-y-5">
          {!result && !simulationMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <BeakerIcon className="h-16 w-16 text-secondary-300 dark:text-secondary-600 mb-4" />
              <h3 className="text-lg font-semibold text-secondary-500 dark:text-secondary-400">No simulation yet</h3>
              <p className="text-sm text-secondary-400 dark:text-secondary-500 mt-1">Select a scenario, configure parameters, and click "Run Simulation"</p>
            </div>
          )}

          {simulationMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin mb-4" />
              <p className="text-sm text-secondary-500 animate-pulse">Analyzing scenario impacts...</p>
            </div>
          )}

          {result && (
            <>
              {/* Confidence + scenario type */}
              <div className="flex items-center justify-between rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-5">
                <div>
                  <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">Simulation Results</h3>
                  <p className="text-xs text-secondary-500 mt-0.5">Scenario: {result.scenarioType.replace(/_/g, ' ')}</p>
                </div>
                <div className="relative">
                  <ConfidenceRing confidence={result.confidence} />
                </div>
              </div>

              {/* Impacts */}
              <div>
                <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3">Impact Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.impacts.map((impact, i) => (
                    <ImpactCard key={i} impact={impact} />
                  ))}
                </div>
              </div>

              {/* Cascading effects */}
              {result.cascadingEffects.length > 0 && (
                <div className="rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-5">
                  <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3">Cascading Effects</h3>
                  <div className="space-y-3">
                    {result.cascadingEffects.map((ce, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                          <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-secondary-900 dark:text-white">{ce.trigger}</p>
                          <p className="text-xs text-secondary-500">{ce.effect}</p>
                        </div>
                        <span className="text-xs font-bold text-secondary-400">{Math.round(ce.probability * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-5">
                  <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3 flex items-center gap-1.5">
                    <LightBulbIcon className="h-4 w-4 text-amber-500" /> Recommendations
                  </h3>
                  <div className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
                        <SparklesIcon className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-secondary-900 dark:text-white">{rec.title}</p>
                          <p className="text-xs text-secondary-500 mt-0.5">{rec.description}</p>
                        </div>
                        <span className={clsx(
                          'text-3xs font-bold px-2 py-0.5 rounded-full shrink-0',
                          rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                          rec.priority === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                        )}>{rec.priority}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Constraints */}
              {result.constraints.length > 0 && (
                <div className="rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-5">
                  <h3 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 tracking-wider mb-3">Constraint Checks</h3>
                  <div className="space-y-2">
                    {result.constraints.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {c.violated ? (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500 shrink-0" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <span className={clsx('text-xs', c.violated ? 'text-red-600 dark:text-red-400 font-medium' : 'text-secondary-600 dark:text-secondary-400')}>
                          {c.name}: {c.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
