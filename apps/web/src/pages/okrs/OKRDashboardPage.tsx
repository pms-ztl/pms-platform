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

  const objectives: Goal[] = objectivesData?.data || [];
  const keyResults: Goal[] = keyResultsData?.data || [];

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 p-6 text-white shadow-xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">OKR Dashboard</h1>
            <p className="text-white/80 text-sm mt-1">
              Objectives & Key Results — {currentQuarterLabel()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors border border-white/20"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              New from Template
            </button>
            <OKRExportButton filterType={filterStatus !== 'all' ? undefined : undefined} filterStatus={filterStatus !== 'all' ? filterStatus : undefined} />
          </div>
        </div>

        {/* View Toggle */}
        <div className="relative z-10 flex items-center gap-0.5 bg-white/15 backdrop-blur-sm p-1 rounded-xl border border-white/20 mt-4 w-fit">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={clsx(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg inline-flex items-center gap-1.5 transition-all',
                viewMode === id
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
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
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Avg Progress</p>
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
