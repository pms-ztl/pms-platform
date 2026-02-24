import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FunnelIcon, ChevronRightIcon, ChevronDownIcon, XMarkIcon,
  ArrowTopRightOnSquareIcon, CalendarIcon, ListBulletIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { goalsApi, type Goal } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { PageHeader } from '@/components/ui';

// ── Constants ────────────────────────────────────────────────────────────────
const GOAL_TYPES = ['STRATEGIC', 'DEPARTMENTAL', 'TEAM', 'INDIVIDUAL'] as const;
const STATUSES = ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED', 'DRAFT'] as const;
const MANAGER_ROLES = ['Super Admin','SUPER_ADMIN','HR_ADMIN','HR Admin','MANAGER','Manager','ADMIN','Tenant Admin','TENANT_ADMIN'];
const MAX_DEPTH = 5;

const typeColors: Record<string, string> = {
  STRATEGIC: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  COMPANY: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DEPARTMENTAL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DEPARTMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TEAM: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  INDIVIDUAL: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300',
  OKR_OBJECTIVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  OKR_KEY_RESULT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

const typeDotColors: Record<string, string> = {
  STRATEGIC: 'bg-purple-500', COMPANY: 'bg-purple-500', DEPARTMENTAL: 'bg-blue-500',
  DEPARTMENT: 'bg-blue-500', TEAM: 'bg-teal-500', INDIVIDUAL: 'bg-secondary-500',
};

const statusBorderColors: Record<string, string> = {
  ACTIVE: 'border-l-success-500', COMPLETED: 'border-l-success-600', ON_HOLD: 'border-l-warning-500',
  BEHIND: 'border-l-danger-500', CANCELLED: 'border-l-secondary-400', DRAFT: 'border-l-secondary-400',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getProgressColor(goal: Goal): string {
  if (goal.progress >= 100) return 'bg-success-500';
  if (goal.progress >= 70) return 'bg-success-500';
  if (goal.progress >= 40) return 'bg-warning-500';
  return 'bg-danger-500';
}

function computeTracking(goal: Goal): 'ON_TRACK' | 'AT_RISK' | 'BEHIND' {
  if (goal.status === 'COMPLETED' || goal.progress >= 70) return 'ON_TRACK';
  if (goal.progress >= 40) return 'AT_RISK';
  return 'BEHIND';
}

function daysRemaining(dueDate?: string): number | null {
  if (!dueDate) return null;
  return Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86_400_000);
}

function flattenGoals(goals: Goal[]): Goal[] {
  const result: Goal[] = [];
  const walk = (g: Goal) => { result.push(g); g.childGoals?.forEach(walk); };
  goals.forEach(walk);
  return result;
}

function filterTree(goals: Goal[], type: string, status: string, owner: string): Goal[] {
  const matches = (g: Goal) =>
    (!type || g.type === type) && (!status || g.status === status) && (!owner || g.owner?.id === owner);
  const filterNode = (g: Goal): Goal | null => {
    const kids = (g.childGoals || []).map(filterNode).filter(Boolean) as Goal[];
    return matches(g) || kids.length > 0 ? { ...g, childGoals: kids } : null;
  };
  return goals.map(filterNode).filter(Boolean) as Goal[];
}

function statusBadgeCls(status: string) {
  if (status === 'ACTIVE') return 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-300';
  if (status === 'COMPLETED') return 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300';
  if (status === 'ON_HOLD') return 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300';
  return 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400';
}

// ── Shared prop types ────────────────────────────────────────────────────────
interface NodeProps {
  goal: Goal; depth: number; onSelect: (g: Goal) => void; selectedId: string | null;
  expandedMap: Record<string, boolean>; toggleExpand: (id: string) => void;
}

// ── Tree Node Card ───────────────────────────────────────────────────────────
function TreeNodeCard({ goal, depth, isLast, onSelect, selectedId, expandedMap, toggleExpand }: NodeProps & { isLast: boolean }) {
  const hasKids = (goal.childGoals?.length ?? 0) > 0;
  const expanded = expandedMap[goal.id] ?? depth < 2;

  return (
    <div className={clsx('relative', depth > 0 && 'ml-8 lg:ml-12')}>
      {depth > 0 && (
        <div className="absolute left-0 top-0 -ml-8 lg:-ml-12 h-full pointer-events-none">
          <div className="absolute top-5 left-0 w-8 lg:w-12 border-t-2 border-secondary-300 dark:border-secondary-600" />
          <div className={clsx('absolute top-0 left-0 border-l-2 border-secondary-300 dark:border-secondary-600', isLast ? 'h-5' : 'h-full')} />
        </div>
      )}
      <div
        onClick={() => onSelect(goal)}
        className={clsx(
          'relative group cursor-pointer rounded-lg border p-3 mb-2 transition-all duration-150',
          'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600',
          selectedId === goal.id
            ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20 shadow-md ring-1 ring-primary-200 dark:ring-primary-700'
            : 'border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl',
        )}
      >
        <div className="flex items-start gap-2">
          {hasKids && depth < MAX_DEPTH ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(goal.id); }}
              className="mt-0.5 p-0.5 rounded hover:bg-secondary-200 dark:hover:bg-secondary-600 flex-shrink-0">
              {expanded ? <ChevronDownIcon className="h-4 w-4 text-secondary-500" /> : <ChevronRightIcon className="h-4 w-4 text-secondary-500" />}
            </button>
          ) : <div className="w-5 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', typeDotColors[goal.type] || 'bg-secondary-400')} />
              <span className="text-sm font-medium text-secondary-900 dark:text-white break-words">{goal.title}</span>
            </div>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-2 break-words">
              {goal.owner?.firstName} {goal.owner?.lastName}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className={clsx('h-full rounded-full transition-all', getProgressColor(goal))} style={{ width: `${Math.min(goal.progress, 100)}%` }} />
              </div>
              <span className="text-2xs font-semibold text-secondary-600 dark:text-secondary-400 w-8 text-right">{goal.progress}%</span>
            </div>
          </div>
        </div>
        <span className={clsx('absolute top-2 right-2 text-3xs font-semibold px-1.5 py-0.5 rounded', typeColors[goal.type] || typeColors.INDIVIDUAL)}>
          {goal.type?.replace('_', ' ')}
        </span>
      </div>
      {expanded && hasKids && depth < MAX_DEPTH && (
        <div>{goal.childGoals!.map((child, i) => (
          <TreeNodeCard key={child.id} goal={child} depth={depth + 1} isLast={i === goal.childGoals!.length - 1}
            onSelect={onSelect} selectedId={selectedId} expandedMap={expandedMap} toggleExpand={toggleExpand} />
        ))}</div>
      )}
    </div>
  );
}

// ── List Row ─────────────────────────────────────────────────────────────────
function ListRow({ goal, depth, onSelect, selectedId, expandedMap, toggleExpand }: NodeProps) {
  const hasKids = (goal.childGoals?.length ?? 0) > 0;
  const expanded = expandedMap[goal.id] ?? depth < 1;

  return (
    <>
      <div
        onClick={() => onSelect(goal)}
        className={clsx(
          'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-4',
          'hover:bg-primary-50/30 dark:hover:bg-white/[0.03]/50 border-b border-b-secondary-100 dark:border-b-secondary-700/50',
          selectedId === goal.id ? 'bg-primary-50 dark:bg-primary-900/20' : '',
          statusBorderColors[goal.status] || 'border-l-secondary-300',
        )}
        style={{ paddingLeft: `${depth * 24 + 16}px` }}
      >
        <button onClick={(e) => { e.stopPropagation(); toggleExpand(goal.id); }}
          className={clsx('p-0.5 rounded flex-shrink-0', hasKids && depth < MAX_DEPTH ? 'hover:bg-secondary-200 dark:hover:bg-secondary-600' : 'invisible')}>
          {expanded ? <ChevronDownIcon className="h-4 w-4 text-secondary-400" /> : <ChevronRightIcon className="h-4 w-4 text-secondary-400" />}
        </button>
        {depth > 0 && <span className="text-2xs text-secondary-400 font-mono flex-shrink-0">{'--'.repeat(depth)}</span>}
        <span className="flex-1 text-sm font-medium text-secondary-900 dark:text-white break-words min-w-0">{goal.title}</span>
        <div className="hidden sm:flex items-center gap-1.5 min-w-[110px]">
          <div className="h-5 w-5 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-3xs font-bold text-primary-700 dark:text-primary-300 flex-shrink-0">
            {goal.owner?.firstName?.[0]}{goal.owner?.lastName?.[0]}
          </div>
          <span className="text-xs text-secondary-500 dark:text-secondary-400 break-words">{goal.owner?.firstName} {goal.owner?.lastName}</span>
        </div>
        <span className={clsx('hidden md:inline-block text-2xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0', typeColors[goal.type] || typeColors.INDIVIDUAL)}>
          {goal.type?.replace('_', ' ')}
        </span>
        <span className={clsx('hidden md:inline-block text-2xs px-2 py-0.5 rounded-full flex-shrink-0', statusBadgeCls(goal.status))}>{goal.status}</span>
        <div className="flex items-center gap-2 min-w-[90px]">
          <div className="w-14 bg-secondary-200 dark:bg-secondary-700 rounded-full h-1.5">
            <div className={clsx('h-1.5 rounded-full', getProgressColor(goal))} style={{ width: `${Math.min(goal.progress, 100)}%` }} />
          </div>
          <span className="text-xs text-secondary-600 dark:text-secondary-400 w-8 text-right">{goal.progress}%</span>
        </div>
        <span className="hidden lg:block text-xs text-secondary-500 dark:text-secondary-400 min-w-[80px] text-right">
          {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : '--'}
        </span>
      </div>
      {expanded && hasKids && depth < MAX_DEPTH && goal.childGoals!.map((child) => (
        <ListRow key={child.id} goal={child} depth={depth + 1} onSelect={onSelect}
          selectedId={selectedId} expandedMap={expandedMap} toggleExpand={toggleExpand} />
      ))}
    </>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const days = daysRemaining(goal.dueDate);
  const tracking = computeTracking(goal);
  const trackCls = tracking === 'ON_TRACK' ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300'
    : tracking === 'AT_RISK' ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300'
    : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-300';

  return (
    <div className="h-full flex flex-col bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl border-l border-secondary-200/60 dark:border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200/60 dark:border-white/[0.06]">
        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white break-words">Goal Details</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700">
          <XMarkIcon className="h-4 w-4 text-secondary-500" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title & Description */}
        <div>
          <h4 className="text-base font-semibold text-secondary-900 dark:text-white leading-snug">{goal.title}</h4>
          {goal.description && <p className="mt-2 text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">{goal.description}</p>}
        </div>
        {/* Owner */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
            {goal.owner?.avatarUrl
              ? <img src={goal.owner.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              : <>{goal.owner?.firstName?.[0]}{goal.owner?.lastName?.[0]}</>}
          </div>
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-white">{goal.owner?.firstName} {goal.owner?.lastName}</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Owner</p>
          </div>
        </div>
        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <span className={clsx('text-2xs font-semibold px-2 py-0.5 rounded', typeColors[goal.type] || typeColors.INDIVIDUAL)}>{goal.type?.replace('_', ' ')}</span>
          <span className={clsx('text-2xs px-2 py-0.5 rounded-full', statusBadgeCls(goal.status))}>{goal.status}</span>
          <span className={clsx('text-2xs px-2 py-0.5 rounded-full',
            goal.priority === 'CRITICAL' ? 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-300' :
            goal.priority === 'HIGH' ? 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-300' :
            'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400')}>{goal.priority || 'MEDIUM'}</span>
          <span className={clsx('text-2xs px-2 py-0.5 rounded-full font-medium', trackCls)}>{tracking.replace('_', ' ')}</span>
        </div>
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300">Progress</span>
            <span className="text-sm font-bold text-secondary-900 dark:text-white">{goal.progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
            <div className={clsx('h-full rounded-full transition-all', getProgressColor(goal))} style={{ width: `${Math.min(goal.progress, 100)}%` }} />
          </div>
        </div>
        {/* Target vs Current */}
        {goal.targetValue != null && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary-50 dark:bg-secondary-900 rounded-lg p-3">
              <p className="text-2xs tracking-wide text-secondary-500 dark:text-secondary-400 mb-0.5">Target</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white">{goal.targetValue}{goal.unit ? ` ${goal.unit}` : ''}</p>
            </div>
            <div className="bg-secondary-50 dark:bg-secondary-900 rounded-lg p-3">
              <p className="text-2xs tracking-wide text-secondary-500 dark:text-secondary-400 mb-0.5">Current</p>
              <p className="text-sm font-bold text-secondary-900 dark:text-white">{goal.currentValue ?? 0}{goal.unit ? ` ${goal.unit}` : ''}</p>
            </div>
          </div>
        )}
        {/* Dates */}
        <div className="space-y-2">
          {[{ label: 'Start', val: goal.startDate }, { label: 'Due', val: goal.dueDate }].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-secondary-400" />
              <span className="text-secondary-600 dark:text-secondary-400">{label}:</span>
              <span className="text-secondary-900 dark:text-white">{val ? new Date(val).toLocaleDateString() : '--'}</span>
            </div>
          ))}
          {days !== null && (
            <div className="flex items-center gap-2 text-sm ml-6">
              <span className="text-secondary-600 dark:text-secondary-400">Remaining:</span>
              <span className={clsx('font-medium', days < 0 ? 'text-danger-600 dark:text-danger-400' : days <= 7 ? 'text-warning-600 dark:text-warning-400' : 'text-secondary-900 dark:text-white')}>
                {days < 0 ? `${Math.abs(days)} days overdue` : `${days} days`}
              </span>
            </div>
          )}
        </div>
        {/* Parent Goal */}
        {goal.parentGoal && (
          <div>
            <p className="text-2xs tracking-wide text-secondary-500 dark:text-secondary-400 mb-1">Parent Goal</p>
            <a href={`/goals/${goal.parentGoal.id}`} className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1">
              {goal.parentGoal.title} <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          </div>
        )}
        {/* Contribution Weight */}
        {goal.weight != null && (
          <div>
            <p className="text-2xs tracking-wide text-secondary-500 dark:text-secondary-400 mb-1">Contribution Weight</p>
            <div className="flex items-center gap-2">
              <div className="w-full h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min((goal.weight / 10) * 100, 100)}%` }} />
              </div>
              <span className="text-xs font-medium text-secondary-700 dark:text-secondary-300 w-8 text-right">{goal.weight}/10</span>
            </div>
          </div>
        )}
        {/* Child Goals */}
        {goal.childGoals && goal.childGoals.length > 0 && (
          <div>
            <p className="text-2xs tracking-wide text-secondary-500 dark:text-secondary-400 mb-2">Child Goals ({goal.childGoals.length})</p>
            <div className="space-y-2">
              {goal.childGoals.map((child) => (
                <div key={child.id} className="flex items-center gap-2 bg-secondary-50 dark:bg-secondary-900 rounded-lg p-2">
                  <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', typeDotColors[child.type] || 'bg-secondary-400')} />
                  <span className="text-xs text-secondary-800 dark:text-secondary-200 break-words flex-1">{child.title}</span>
                  <div className="w-10 h-1 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden flex-shrink-0">
                    <div className={clsx('h-full rounded-full', getProgressColor(child))} style={{ width: `${Math.min(child.progress, 100)}%` }} />
                  </div>
                  <span className="text-3xs text-secondary-500 dark:text-secondary-400 w-6 text-right">{child.progress}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-3 border-t border-secondary-200/60 dark:border-white/[0.06]">
        <a href={`/goals/${goal.id}`}
          className="block w-full text-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 py-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
          View Full Goal
        </a>
      </div>
    </div>
  );
}

// ── Stats Bar ────────────────────────────────────────────────────────────────
function StatsBar({ goals }: { goals: Goal[] }) {
  const flat = useMemo(() => flattenGoals(goals), [goals]);
  const total = flat.length;
  if (total === 0) return null;
  const onTrack = flat.filter((g) => computeTracking(g) === 'ON_TRACK').length;
  const atRisk = flat.filter((g) => computeTracking(g) === 'AT_RISK').length;
  const behind = flat.filter((g) => computeTracking(g) === 'BEHIND').length;
  const avg = Math.round(flat.reduce((s, g) => s + g.progress, 0) / total);
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  const onTrackPct = Math.round((onTrack / total) * 100);
  const onTrackCls = onTrackPct >= 50
    ? 'text-success-600 dark:text-success-400'
    : onTrackPct >= 25
      ? 'text-warning-600 dark:text-warning-400'
      : 'text-danger-600 dark:text-danger-400';
  const avgCls = avg >= 70
    ? 'text-success-600 dark:text-success-400'
    : avg >= 40
      ? 'text-warning-600 dark:text-warning-400'
      : 'text-danger-600 dark:text-danger-400';
  const stats = [
    { label: 'Total Goals', value: total, cls: 'text-secondary-900 dark:text-white' },
    { label: 'On Track', value: pct(onTrack), cls: onTrackCls },
    { label: 'At Risk', value: pct(atRisk), cls: 'text-warning-600 dark:text-warning-400' },
    { label: 'Behind', value: pct(behind), cls: 'text-danger-600 dark:text-danger-400' },
    { label: 'Average Progress', value: `${avg}%`, cls: avgCls },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div key={s.label} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-lg border border-secondary-200/60 dark:border-white/[0.06] px-4 py-3">
          <p className="text-2xs tracking-wide text-secondary-500 dark:text-secondary-400">{s.label}</p>
          <p className={clsx('text-xl font-bold mt-0.5', s.cls)}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
export function GoalAlignmentPage() {
  const user = useAuthStore((s) => s.user);
  const isManager = (user?.roles ?? []).some((r) => MANAGER_ROLES.includes(r));
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => { setIsMobile(e.matches); if (e.matches) setViewMode('list'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const { data: treeData, isLoading } = useQuery({
    queryKey: ['goal-alignment-tree', isManager ? 'team' : 'all'],
    queryFn: () => (isManager ? goalsApi.getTeamTree() : goalsApi.getTree()),
  });

  const toggleExpand = useCallback((id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);
  const handleSelect = useCallback((goal: Goal) => {
    setSelectedGoal((prev) => (prev?.id === goal.id ? null : goal));
  }, []);

  const filteredTree = useMemo(() => {
    if (!treeData) return [];
    if (!typeFilter && !statusFilter && !ownerFilter) return treeData;
    return filterTree(treeData, typeFilter, statusFilter, ownerFilter);
  }, [treeData, typeFilter, statusFilter, ownerFilter]);

  const owners = useMemo(() => {
    if (!treeData) return [];
    const map = new Map<string, { id: string; name: string }>();
    flattenGoals(treeData).forEach((g) => {
      if (g.owner?.id && !map.has(g.owner.id))
        map.set(g.owner.id, { id: g.owner.id, name: `${g.owner.firstName} ${g.owner.lastName}` });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [treeData]);

  const effectiveView = isMobile ? 'list' : viewMode;
  const showPanel = selectedGoal !== null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Goal Alignment" subtitle="Visualize how goals cascade across the organization">
        {!isMobile && (
          <div className="flex items-center gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
            {(['tree', 'list'] as const).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={clsx('px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1',
                  viewMode === mode ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300')}>
                {mode === 'tree' ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M3 3h4v4H3V3zm0 6.5h4v4H3v-4zM9 3h8v2H9V3zm0 4.5h6v2H9v-2zm0 4.5h8v2H9v-2zm0 4.5h6v2H9v-2zM3 16h4v1.5H3V16z" />
                  </svg>
                ) : <ListBulletIcon className="h-4 w-4" />}
                {mode === 'tree' ? 'Tree View' : 'List View'}
              </button>
            ))}
          </div>
        )}
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FunnelIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500 flex-shrink-0" />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input py-1.5 w-40 text-sm">
          <option value="">All Types</option>
          {GOAL_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>)}
          <option value="COMPANY">Company</option>
          <option value="OKR_OBJECTIVE">OKR Objective</option>
          <option value="OKR_KEY_RESULT">Key Result</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input py-1.5 w-36 text-sm">
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className="input py-1.5 w-44 text-sm">
          <option value="">All Owners</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        {(typeFilter || statusFilter || ownerFilter) && (
          <button onClick={() => { setTypeFilter(''); setStatusFilter(''); setOwnerFilter(''); }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline">Clear filters</button>
        )}
      </div>

      {/* Stats */}
      {treeData && treeData.length > 0 && <StatsBar goals={filteredTree} />}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="glass-spinner" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredTree.length === 0 && (
        <div className="text-center py-16 card card-body dark:bg-secondary-800">
          <svg className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM7 14h7v7H7v-7z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">
            {typeFilter || statusFilter || ownerFilter ? 'No goals match the current filters' : 'No goal hierarchy found'}
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {typeFilter || statusFilter || ownerFilter ? 'Try adjusting or clearing the filters above.' : 'Create goals with parent-child relationships to visualize alignment.'}
          </p>
        </div>
      )}

      {/* Main content area */}
      {!isLoading && filteredTree.length > 0 && (
        <div className="flex gap-0">
          <div className="flex-1 min-w-0">
            {effectiveView === 'tree' && (
              <div className="space-y-1">
                {filteredTree.map((goal, idx) => (
                  <TreeNodeCard key={goal.id} goal={goal} depth={0} isLast={idx === filteredTree.length - 1}
                    onSelect={handleSelect} selectedId={selectedGoal?.id ?? null} expandedMap={expandedMap} toggleExpand={toggleExpand} />
                ))}
              </div>
            )}
            {effectiveView === 'list' && (
              <div className="card overflow-hidden dark:bg-secondary-800 dark:border-secondary-700">
                <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-secondary-50 dark:bg-secondary-900 border-b border-secondary-200/60 dark:border-white/[0.06] text-2xs font-medium tracking-wider text-secondary-500 dark:text-secondary-400">
                  <span className="w-5" />
                  <span className="flex-1">Goal</span>
                  <span className="min-w-[110px]">Owner</span>
                  <span className="min-w-[80px]">Type</span>
                  <span className="min-w-[70px]">Status</span>
                  <span className="min-w-[90px]">Progress</span>
                  <span className="hidden lg:block min-w-[80px] text-right">Due Date</span>
                </div>
                <div>
                  {filteredTree.map((goal) => (
                    <ListRow key={goal.id} goal={goal} depth={0} onSelect={handleSelect}
                      selectedId={selectedGoal?.id ?? null} expandedMap={expandedMap} toggleExpand={toggleExpand} />
                  ))}
                </div>
              </div>
            )}
          </div>
          {showPanel && !isMobile && (
            <div className="w-80 xl:w-96 flex-shrink-0 ml-4 sticky top-0 h-[calc(100vh-12rem)] rounded-lg overflow-hidden border border-secondary-200/60 dark:border-white/[0.06] shadow-lg landscape-scroll">
              <DetailPanel goal={selectedGoal!} onClose={() => setSelectedGoal(null)} />
            </div>
          )}
        </div>
      )}

      {/* Mobile detail panel overlay */}
      {showPanel && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/50" onClick={() => setSelectedGoal(null)}>
          <div className="absolute right-0 top-0 h-full w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <DetailPanel goal={selectedGoal!} onClose={() => setSelectedGoal(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
