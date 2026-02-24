import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FlagIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  ChartBarIcon,
  ShareIcon,
  MapIcon,
  ViewColumnsIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { goalsApi, type Goal } from '@/lib/api';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  OKRCheckinModal,
  OKRProgressRing,
  OKRDetailCardsView,
  OKRListView,
  OKRHierarchyView,
  OKRStrategyMapView,
  OKRTimelineView,
  OKRKanbanView,
  OKRBulkActions,
  OKRExportButton,
  OKRTemplatesModal,
} from '@/components/okr';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQuarter(date: string | undefined): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

function currentQuarterLabel(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="h-[72px] w-[72px] rounded-full bg-secondary-200 dark:bg-secondary-700" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-20 bg-secondary-200 dark:bg-secondary-700 rounded" />
          <div className="h-5 w-3/4 bg-secondary-200 dark:bg-secondary-700 rounded" />
          <div className="h-3 w-1/3 bg-secondary-200 dark:bg-secondary-700 rounded" />
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-full bg-secondary-200 dark:bg-secondary-700 rounded" />
        <div className="h-3 w-full bg-secondary-200 dark:bg-secondary-700 rounded" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type ViewMode = 'detail' | 'list' | 'kanban' | 'hierarchy' | 'strategy' | 'timeline';

const views: Array<{ id: ViewMode; label: string; icon: typeof Squares2X2Icon }> = [
  { id: 'detail', label: 'Detail Cards', icon: Squares2X2Icon },
  { id: 'list', label: 'List', icon: ListBulletIcon },
  { id: 'kanban', label: 'Kanban', icon: ViewColumnsIcon },
  { id: 'hierarchy', label: 'Hierarchy', icon: ShareIcon },
  { id: 'strategy', label: 'Strategy', icon: MapIcon },
  { id: 'timeline', label: 'Timeline', icon: ChartBarIcon },
];

// ── Mock Data (shown when API returns no OKR objectives) ──
const MOCK_OBJECTIVES: Partial<Goal>[] = [
  {
    id: 'mock-okr-1',
    title: 'Increase Platform Reliability to 99.9% Uptime',
    type: 'OKR_OBJECTIVE',
    status: 'ACTIVE',
    priority: 'HIGH',
    progress: 72,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    owner: { id: 'mock-o1', firstName: 'Prasina', lastName: 'Sathish' } as any,
    childGoals: [],
  },
  {
    id: 'mock-okr-2',
    title: 'Accelerate Customer Onboarding Experience',
    type: 'OKR_OBJECTIVE',
    status: 'ACTIVE',
    priority: 'HIGH',
    progress: 55,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    owner: { id: 'mock-o2', firstName: 'Danish', lastName: 'A G' } as any,
    childGoals: [],
  },
  {
    id: 'mock-okr-3',
    title: 'Build a World-Class Engineering Culture',
    type: 'OKR_OBJECTIVE',
    status: 'ACTIVE',
    priority: 'MEDIUM',
    progress: 40,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    owner: { id: 'mock-o1', firstName: 'Prasina', lastName: 'Sathish' } as any,
    childGoals: [],
  },
  {
    id: 'mock-okr-4',
    title: 'Expand Market Reach in APAC Region',
    type: 'OKR_OBJECTIVE',
    status: 'DRAFT',
    priority: 'MEDIUM',
    progress: 15,
    dueDate: '2026-06-30T00:00:00Z',
    startDate: '2026-04-01T00:00:00Z',
    owner: { id: 'mock-o3', firstName: 'Preethi', lastName: 'S' } as any,
    childGoals: [],
  },
];

const MOCK_KEY_RESULTS: Partial<Goal>[] = [
  // KRs for Objective 1: Platform Reliability
  {
    id: 'mock-kr-1a',
    title: 'Reduce average incident response time from 30min to 10min',
    type: 'OKR_KEY_RESULT',
    status: 'ACTIVE',
    progress: 80,
    parentGoal: { id: 'mock-okr-1' } as any,
    owner: { id: 'mock-o1', firstName: 'Prasina', lastName: 'Sathish' } as any,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    targetValue: 10,
    currentValue: 12,
    unit: 'minutes',
  },
  {
    id: 'mock-kr-1b',
    title: 'Achieve 99.9% uptime for all production services',
    type: 'OKR_KEY_RESULT',
    status: 'ACTIVE',
    progress: 85,
    parentGoal: { id: 'mock-okr-1' } as any,
    owner: { id: 'mock-o1', firstName: 'Prasina', lastName: 'Sathish' } as any,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    targetValue: 99.9,
    currentValue: 99.85,
    unit: '%',
  },
  {
    id: 'mock-kr-1c',
    title: 'Deploy automated rollback for 100% of critical services',
    type: 'OKR_KEY_RESULT',
    status: 'ACTIVE',
    progress: 50,
    parentGoal: { id: 'mock-okr-1' } as any,
    owner: { id: 'mock-o1', firstName: 'Prasina', lastName: 'Sathish' } as any,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    targetValue: 100,
    currentValue: 50,
    unit: '%',
  },
  // KRs for Objective 2: Customer Onboarding
  {
    id: 'mock-kr-2a',
    title: 'Reduce onboarding time from 14 days to 3 days',
    type: 'OKR_KEY_RESULT',
    status: 'ACTIVE',
    progress: 60,
    parentGoal: { id: 'mock-okr-2' } as any,
    owner: { id: 'mock-o2', firstName: 'Danish', lastName: 'A G' } as any,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    targetValue: 3,
    currentValue: 7,
    unit: 'days',
  },
  {
    id: 'mock-kr-2b',
    title: 'Achieve 90% customer activation rate within first week',
    type: 'OKR_KEY_RESULT',
    status: 'ACTIVE',
    progress: 45,
    parentGoal: { id: 'mock-okr-2' } as any,
    owner: { id: 'mock-o2', firstName: 'Danish', lastName: 'A G' } as any,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    targetValue: 90,
    currentValue: 72,
    unit: '%',
  },
  // KRs for Objective 3: Engineering Culture
  {
    id: 'mock-kr-3a',
    title: 'Launch internal tech talk series with 12 sessions per quarter',
    type: 'OKR_KEY_RESULT',
    status: 'ACTIVE',
    progress: 33,
    parentGoal: { id: 'mock-okr-3' } as any,
    owner: { id: 'mock-o1', firstName: 'Prasina', lastName: 'Sathish' } as any,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    targetValue: 12,
    currentValue: 4,
    unit: 'sessions',
  },
  {
    id: 'mock-kr-3b',
    title: 'Increase engineering satisfaction score from 7.2 to 9.0',
    type: 'OKR_KEY_RESULT',
    status: 'ACTIVE',
    progress: 50,
    parentGoal: { id: 'mock-okr-3' } as any,
    owner: { id: 'mock-o1', firstName: 'Prasina', lastName: 'Sathish' } as any,
    dueDate: '2026-03-31T00:00:00Z',
    startDate: '2026-01-01T00:00:00Z',
    targetValue: 9.0,
    currentValue: 8.1,
    unit: 'score',
  },
  // KRs for Objective 4: APAC Expansion
  {
    id: 'mock-kr-4a',
    title: 'Sign 5 enterprise clients in APAC by Q2',
    type: 'OKR_KEY_RESULT',
    status: 'DRAFT',
    progress: 20,
    parentGoal: { id: 'mock-okr-4' } as any,
    owner: { id: 'mock-o3', firstName: 'Preethi', lastName: 'S' } as any,
    dueDate: '2026-06-30T00:00:00Z',
    startDate: '2026-04-01T00:00:00Z',
    targetValue: 5,
    currentValue: 1,
    unit: 'clients',
  },
  {
    id: 'mock-kr-4b',
    title: 'Localize product for 3 APAC languages',
    type: 'OKR_KEY_RESULT',
    status: 'DRAFT',
    progress: 10,
    parentGoal: { id: 'mock-okr-4' } as any,
    owner: { id: 'mock-o3', firstName: 'Preethi', lastName: 'S' } as any,
    dueDate: '2026-06-30T00:00:00Z',
    startDate: '2026-04-01T00:00:00Z',
    targetValue: 3,
    currentValue: 0,
    unit: 'languages',
  },
];

export function OKRDashboardPage() {
  usePageTitle('OKRs');
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const [filterQuarter, setFilterQuarter] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [checkinKR, setCheckinKR] = useState<Goal | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const { data: objectivesData, isLoading: loadingObjectives } = useQuery({
    queryKey: ['okr-objectives'],
    queryFn: () => goalsApi.list({ type: 'OKR_OBJECTIVE', limit: 100 }),
    staleTime: 30_000,
  });

  const { data: keyResultsData, isLoading: loadingKRs } = useQuery({
    queryKey: ['okr-key-results'],
    queryFn: () => goalsApi.list({ type: 'OKR_KEY_RESULT', limit: 200 }),
    staleTime: 30_000,
  });

  const { data: treeData } = useQuery({
    queryKey: ['okr-tree'],
    queryFn: () => goalsApi.getTree(),
    enabled: viewMode === 'hierarchy' || viewMode === 'strategy',
    staleTime: 30_000,
  });

  const isLoading = loadingObjectives || loadingKRs;

  // -------------------------------------------------------------------------
  // Data processing
  // -------------------------------------------------------------------------

  const rawObjectives: Goal[] = objectivesData?.data || [];
  const rawKeyResults: Goal[] = keyResultsData?.data || [];
  const objectives = rawObjectives.length > 0 ? rawObjectives : (MOCK_OBJECTIVES as Goal[]);
  const keyResults = rawKeyResults.length > 0 ? rawKeyResults : (MOCK_KEY_RESULTS as Goal[]);

  const krByParent = useMemo(() => {
    const map = new Map<string, Goal[]>();
    keyResults.forEach((kr) => {
      const pid = kr.parentGoal?.id;
      if (pid) {
        const arr = map.get(pid) || [];
        arr.push(kr);
        map.set(pid, arr);
      }
    });
    return map;
  }, [keyResults]);

  const filteredObjectives = useMemo(() => {
    return objectives.filter((obj) => {
      if (filterQuarter !== 'all' && getQuarter(obj.dueDate) !== filterQuarter) return false;
      if (filterOwner !== 'all' && obj.owner?.id !== filterOwner) return false;
      if (filterStatus !== 'all' && obj.status !== filterStatus) return false;
      return true;
    });
  }, [objectives, filterQuarter, filterOwner, filterStatus]);

  const quarters = useMemo(() => {
    const set = new Set<string>();
    objectives.forEach((obj) => {
      const q = getQuarter(obj.dueDate);
      if (q !== 'N/A') set.add(q);
    });
    return Array.from(set).sort().reverse();
  }, [objectives]);

  const owners = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    objectives.forEach((obj) => {
      if (obj.owner) {
        map.set(obj.owner.id, { id: obj.owner.id, name: `${obj.owner.firstName} ${obj.owner.lastName}` });
      }
    });
    return Array.from(map.values());
  }, [objectives]);

  const statuses = useMemo(() => {
    const set = new Set<string>();
    objectives.forEach((obj) => set.add(obj.status));
    return Array.from(set).sort();
  }, [objectives]);

  const stats = useMemo(() => {
    const totalObj = filteredObjectives.length;
    const totalKR = filteredObjectives.reduce((sum, obj) => sum + (krByParent.get(obj.id)?.length || 0), 0);
    const allKRs = filteredObjectives.flatMap((obj) => krByParent.get(obj.id) || []);
    const avgProgress = allKRs.length > 0 ? Math.round(allKRs.reduce((s, kr) => s + kr.progress, 0) / allKRs.length) : 0;
    const onTrack = allKRs.filter((kr) => kr.progress >= 70).length;
    const onTrackPct = allKRs.length > 0 ? Math.round((onTrack / allKRs.length) * 100) : 0;
    return { totalObj, totalKR, avgProgress, onTrackPct };
  }, [filteredObjectives, krByParent]);

  // Filter tree to only OKR types for hierarchy/strategy views
  const okrTree = useMemo(() => {
    if (!treeData) return [];
    function filterOKR(goals: Goal[]): Goal[] {
      return goals
        .filter((g) => g.type === 'OKR_OBJECTIVE' || g.type === 'OKR_KEY_RESULT' || g.type === 'COMPANY' || g.type === 'DEPARTMENT' || g.type === 'TEAM' || (g.childGoals && g.childGoals.some((c) => ['OKR_OBJECTIVE', 'OKR_KEY_RESULT', 'COMPANY', 'DEPARTMENT', 'TEAM'].includes(c.type))))
        .map((g) => ({
          ...g,
          childGoals: g.childGoals ? filterOKR(g.childGoals) : [],
        }));
    }
    return filterOKR(treeData);
  }, [treeData]);

  const handleCheckin = useCallback((krId: string) => {
    const kr = keyResults.find((k) => k.id === krId);
    if (kr) setCheckinKR(kr);
  }, [keyResults]);

  const handleGoalSelect = useCallback((goal: Goal) => {
    window.open(`/goals/${goal.id}`, '_self');
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl glass-banner-okr p-6 text-secondary-900 dark:text-white shadow-xl">
        {/* Decorative gradient orbs — visible through the glass */}
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-br from-amber-500/30 to-orange-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-gradient-to-tr from-red-500/20 to-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">OKR Dashboard</h1>
            <p className="text-secondary-500 dark:text-white/80 text-sm mt-1">
              Objectives & Key Results — {currentQuarterLabel()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/15 dark:bg-white/20 backdrop-blur-sm text-amber-700 dark:text-white hover:bg-amber-500/25 dark:hover:bg-white/30 transition-colors border border-amber-500/25 dark:border-white/20"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              New from Template
            </button>
            <OKRExportButton filterType={filterStatus !== 'all' ? undefined : undefined} filterStatus={filterStatus !== 'all' ? filterStatus : undefined} />
          </div>
        </div>

        {/* View Toggle */}
        <div className="relative z-10 flex items-center gap-0.5 bg-secondary-100/60 dark:bg-white/15 backdrop-blur-sm p-1 rounded-xl border border-secondary-200/60 dark:border-white/20 mt-4 w-fit">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={clsx(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-all',
                viewMode === id
                  ? 'bg-white dark:bg-white text-orange-700 shadow-sm'
                  : 'text-secondary-500 dark:text-white/80 hover:text-secondary-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <FunnelIcon className="h-4 w-4 text-secondary-400" />
        <select
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Quarters</option>
          {quarters.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        <select
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Owners</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <FlagIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{stats.totalObj}</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Objectives</p>
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <FlagIcon className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{stats.totalKR}</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Key Results</p>
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 flex items-center gap-3">
          <OKRProgressRing progress={stats.avgProgress} size={44} strokeWidth={4} />
          <div>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{stats.avgProgress}%</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Average Progress</p>
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <FlagIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-secondary-900 dark:text-white">{stats.onTrackPct}%</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">On Track</p>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : viewMode === 'detail' ? (
        <OKRDetailCardsView objectives={filteredObjectives} krByParent={krByParent} onCheckin={handleCheckin} />
      ) : viewMode === 'list' ? (
        <OKRListView objectives={filteredObjectives} krByParent={krByParent} onCheckin={handleCheckin} />
      ) : viewMode === 'kanban' ? (
        <OKRKanbanView objectives={filteredObjectives} krByParent={krByParent} onCheckin={handleCheckin} />
      ) : viewMode === 'hierarchy' ? (
        <OKRHierarchyView treeData={okrTree} onSelect={handleGoalSelect} />
      ) : viewMode === 'strategy' ? (
        <OKRStrategyMapView treeData={okrTree} onSelect={handleGoalSelect} />
      ) : (
        <OKRTimelineView objectives={filteredObjectives} krByParent={krByParent} onCheckin={handleCheckin} />
      )}

      {/* Bulk Actions Bar */}
      <OKRBulkActions selectedIds={selectedIds} onClear={() => setSelectedIds([])} />

      {/* Templates Modal */}
      <OKRTemplatesModal open={showTemplates} onClose={() => setShowTemplates(false)} />

      {/* Check-in Modal */}
      <OKRCheckinModal
        open={!!checkinKR}
        onClose={() => setCheckinKR(null)}
        keyResult={checkinKR}
      />
    </div>
  );
}
