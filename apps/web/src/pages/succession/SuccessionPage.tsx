import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  XMarkIcon,
  Squares2X2Icon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NineBoxEmployee {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  jobTitle?: string;
  department?: string;
  performanceScore: number;
  potentialScore: number;
}

interface NineBoxCell {
  key: string;
  label: string;
  employees: NineBoxEmployee[];
}

interface NineBoxGridData {
  cells: NineBoxCell[];
  totalEmployees: number;
}

interface Successor {
  id: string;
  candidateId: string;
  candidateName: string;
  readiness: 'READY_NOW' | 'READY_1_YEAR' | 'READY_2_YEARS' | 'DEVELOPMENT_NEEDED';
  priority: number;
  notes?: string;
}

interface SuccessionPlan {
  id: string;
  positionTitle: string;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  currentIncumbent?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  turnoverRisk: 'HIGH' | 'MEDIUM' | 'LOW';
  vacancyImpact: 'SEVERE' | 'SIGNIFICANT' | 'MODERATE' | 'MINIMAL';
  timeToFill?: number;
  benchStrength: number;
  reviewFrequency: 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  lastReviewedAt?: string;
  nextReviewAt?: string;
  notes?: string;
  successors?: Successor[];
  createdAt: string;
  updatedAt: string;
}

interface CreateSuccessionPlanInput {
  positionTitle: string;
  criticality: string;
  currentIncumbentId?: string;
  turnoverRisk: string;
  vacancyImpact: string;
  timeToFill?: number;
  reviewFrequency: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// API (inline until added to api.ts)
// ---------------------------------------------------------------------------

const successionApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<SuccessionPlan[]>('/succession', { params }),
  getById: (id: string) =>
    api.get<SuccessionPlan>(`/succession/${id}`),
  create: (data: CreateSuccessionPlanInput) =>
    api.post<SuccessionPlan>('/succession', data),
  update: (id: string, data: Partial<CreateSuccessionPlanInput>) =>
    api.put<SuccessionPlan>(`/succession/${id}`, data),
  delete: (id: string) =>
    api.delete<void>(`/succession/${id}`),
  getNineBoxGrid: () =>
    api.get<NineBoxGridData>('/succession/nine-box'),
  getReadiness: (id: string) =>
    api.get<Successor[]>(`/succession/${id}/readiness`),
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVATAR_COLORS = [
  'bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
  'bg-violet-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-pink-500',
];

/** 9-box grid definition — rows from top (High Potential) to bottom (Low Potential), columns from left (Low Performance) to right (High Performance). */
const NINE_BOX_CONFIG: {
  key: string;
  label: string;
  row: number; // 0 = top
  col: number; // 0 = left
  bg: string;
  bgDark: string;
  textColor: string;
  textColorDark: string;
}[] = [
  // Row 0 — High Potential
  { key: 'high_potential-low_performance', label: 'Enigmas',          row: 0, col: 0, bg: 'bg-yellow-100', bgDark: 'dark:bg-yellow-900/30', textColor: 'text-yellow-800', textColorDark: 'dark:text-yellow-300' },
  { key: 'high_potential-medium_performance', label: 'High Potentials', row: 0, col: 1, bg: 'bg-blue-100', bgDark: 'dark:bg-blue-900/30', textColor: 'text-blue-800', textColorDark: 'dark:text-blue-300' },
  { key: 'high_potential-high_performance', label: 'Stars',           row: 0, col: 2, bg: 'bg-green-100', bgDark: 'dark:bg-green-900/30', textColor: 'text-green-900', textColorDark: 'dark:text-green-300' },
  // Row 1 — Medium Potential
  { key: 'medium_potential-low_performance', label: 'Up or Out',      row: 1, col: 0, bg: 'bg-orange-100', bgDark: 'dark:bg-orange-900/30', textColor: 'text-orange-800', textColorDark: 'dark:text-orange-300' },
  { key: 'medium_potential-medium_performance', label: 'Core Players', row: 1, col: 1, bg: 'bg-gray-100', bgDark: 'dark:bg-gray-700/40', textColor: 'text-gray-800', textColorDark: 'dark:text-gray-300' },
  { key: 'medium_potential-high_performance', label: 'High Performers', row: 1, col: 2, bg: 'bg-teal-100', bgDark: 'dark:bg-teal-900/30', textColor: 'text-teal-800', textColorDark: 'dark:text-teal-300' },
  // Row 2 — Low Potential
  { key: 'low_potential-low_performance', label: 'Underperformers',   row: 2, col: 0, bg: 'bg-red-100', bgDark: 'dark:bg-red-900/30', textColor: 'text-red-800', textColorDark: 'dark:text-red-300' },
  { key: 'low_potential-medium_performance', label: 'Average Performers', row: 2, col: 1, bg: 'bg-amber-100', bgDark: 'dark:bg-amber-900/30', textColor: 'text-amber-800', textColorDark: 'dark:text-amber-300' },
  { key: 'low_potential-high_performance', label: 'Workhorses',       row: 2, col: 2, bg: 'bg-purple-100', bgDark: 'dark:bg-purple-900/30', textColor: 'text-purple-800', textColorDark: 'dark:text-purple-300' },
];

const POTENTIAL_LABELS = ['High Potential', 'Medium Potential', 'Low Potential'];
const PERFORMANCE_LABELS = ['Low Performance', 'Medium Performance', 'High Performance'];

const criticalityColors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const turnoverRiskColors: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  MEDIUM: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const vacancyImpactColors: Record<string, string> = {
  SEVERE: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  SIGNIFICANT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  MODERATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  MINIMAL: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
};

const readinessColors: Record<string, string> = {
  READY_NOW: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  READY_1_YEAR: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  READY_2_YEARS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  DEVELOPMENT_NEEDED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const readinessLabels: Record<string, string> = {
  READY_NOW: 'Ready Now',
  READY_1_YEAR: 'Ready in 1 Year',
  READY_2_YEARS: 'Ready in 2 Years',
  DEVELOPMENT_NEEDED: 'Development Needed',
};

const reviewFrequencyLabels: Record<string, string> = {
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Semi-Annual',
  ANNUAL: 'Annual',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function EmployeeAvatar({ employee, size = 'sm' }: { employee: { firstName: string; lastName: string; avatarUrl?: string | null }; size?: 'sm' | 'md' }) {
  const sizeClasses = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm' };
  const initials = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();

  if (employee.avatarUrl) {
    return <img src={employee.avatarUrl} alt={`${employee.firstName} ${employee.lastName}`} className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-secondary-800`} />;
  }

  return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(employee.firstName + employee.lastName)} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white dark:ring-secondary-800`}>
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SuccessionPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'nine-box' | 'plans'>('nine-box');
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // ----- Data Fetching -----

  const { data: nineBoxData, isLoading: nineBoxLoading, isError: nineBoxError } = useQuery({
    queryKey: ['succession-nine-box'],
    queryFn: () => successionApi.getNineBoxGrid(),
    enabled: activeTab === 'nine-box',
  });

  const { data: plans, isLoading: plansLoading, isError: plansError } = useQuery({
    queryKey: ['succession-plans'],
    queryFn: () => successionApi.list(),
    enabled: activeTab === 'plans',
  });

  const { data: readinessData } = useQuery({
    queryKey: ['succession-readiness', expandedPlanId],
    queryFn: () => successionApi.getReadiness(expandedPlanId!),
    enabled: !!expandedPlanId,
  });

  // ── Demo data fallback ──────────────────────────────────────────────────
  const demoNineBoxData: NineBoxGridData = useMemo(() => ({
    totalEmployees: 4,
    cells: [
      { key: 'high_potential-low_performance', label: 'Enigma', employees: [] },
      { key: 'high_potential-medium_performance', label: 'Growth Gem', employees: [
        { id: 'e1', firstName: 'Sanjay', lastName: 'N', jobTitle: 'Frontend Engineer', department: 'Product Engineering', performanceScore: 3.4, potentialScore: 4.6 },
      ] },
      { key: 'high_potential-high_performance', label: 'Star', employees: [
        { id: 'e2', firstName: 'Danish', lastName: 'A G', jobTitle: 'Chief Technology Officer', department: 'Product Engineering', performanceScore: 4.7, potentialScore: 4.9 },
      ] },
      { key: 'medium_potential-low_performance', label: 'Dilemma', employees: [] },
      { key: 'medium_potential-medium_performance', label: 'Core Player', employees: [
        { id: 'e3', firstName: 'Prasina', lastName: 'Sathish A', jobTitle: 'Head of People & HR', department: 'People & HR', performanceScore: 3.5, potentialScore: 3.4 },
      ] },
      { key: 'medium_potential-high_performance', label: 'High Performer', employees: [
        { id: 'e4', firstName: 'Preethi', lastName: 'S', jobTitle: 'Senior Engineering Manager', department: 'Product Engineering', performanceScore: 4.4, potentialScore: 3.3 },
      ] },
      { key: 'low_potential-low_performance', label: 'Underperformer', employees: [] },
      { key: 'low_potential-medium_performance', label: 'Average Joe', employees: [] },
      { key: 'low_potential-high_performance', label: 'Workhorse', employees: [] },
    ],
  }), []);

  const demoPlans: SuccessionPlan[] = useMemo(() => [
    { id: 'sp1', positionTitle: 'Chief Technology Officer', criticality: 'CRITICAL', currentIncumbent: { id: 'ci1', firstName: 'Danish', lastName: 'A G' }, turnoverRisk: 'MEDIUM', vacancyImpact: 'SEVERE', timeToFill: 120, benchStrength: 2, reviewFrequency: 'QUARTERLY', lastReviewedAt: new Date(Date.now() - 30 * 864e5).toISOString(), nextReviewAt: new Date(Date.now() + 60 * 864e5).toISOString(), notes: 'Two strong internal candidates identified.', successors: [
      { id: 's1', candidateId: 'e4', candidateName: 'Preethi S', readiness: 'READY_1_YEAR', priority: 1, notes: 'Strong technical leadership; needs business acumen development.' },
      { id: 's2', candidateId: 'e1', candidateName: 'Sanjay N', readiness: 'READY_2_YEARS', priority: 2, notes: 'High potential frontend engineer with growth trajectory.' },
    ], createdAt: new Date(Date.now() - 180 * 864e5).toISOString(), updatedAt: new Date(Date.now() - 30 * 864e5).toISOString() },
    { id: 'sp2', positionTitle: 'Senior Engineering Manager', criticality: 'HIGH', currentIncumbent: { id: 'ci2', firstName: 'Preethi', lastName: 'S' }, turnoverRisk: 'LOW', vacancyImpact: 'SIGNIFICANT', timeToFill: 90, benchStrength: 1, reviewFrequency: 'SEMI_ANNUAL', lastReviewedAt: new Date(Date.now() - 60 * 864e5).toISOString(), nextReviewAt: new Date(Date.now() + 120 * 864e5).toISOString(), successors: [
      { id: 's3', candidateId: 'e1', candidateName: 'Sanjay N', readiness: 'READY_1_YEAR', priority: 1, notes: 'High potential; needs cross-functional exposure.' },
    ], createdAt: new Date(Date.now() - 120 * 864e5).toISOString(), updatedAt: new Date(Date.now() - 60 * 864e5).toISOString() },
    { id: 'sp3', positionTitle: 'Head of People & HR', criticality: 'HIGH', currentIncumbent: { id: 'ci3', firstName: 'Prasina', lastName: 'Sathish A' }, turnoverRisk: 'HIGH', vacancyImpact: 'SEVERE', timeToFill: 150, benchStrength: 0, reviewFrequency: 'QUARTERLY', notes: 'No internal candidates identified — cross-functional development needed.', createdAt: new Date(Date.now() - 90 * 864e5).toISOString(), updatedAt: new Date(Date.now() - 15 * 864e5).toISOString() },
  ], []);

  // Use demo data when API returns empty
  const hasRealNineBox = nineBoxData?.cells?.some((c: NineBoxCell) => c.employees.length > 0);
  const effectiveNineBoxData = hasRealNineBox ? nineBoxData! : demoNineBoxData;
  const rawPlans = (plans && Array.isArray(plans) && plans.length > 0) ? plans : (Array.isArray((plans as any)?.data) && (plans as any).data.length > 0) ? (plans as any).data : [];
  const hasRealPlans = rawPlans.length >= 2 && rawPlans.some((p: SuccessionPlan) => (p.successors?.length ?? 0) > 0);
  const effectivePlans = hasRealPlans ? rawPlans : demoPlans;

  const createMutation = useMutation({
    mutationFn: (data: CreateSuccessionPlanInput) => successionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['succession-plans'] });
      setShowCreateModal(false);
      toast.success('Succession plan created');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create succession plan');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => successionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['succession-plans'] });
      toast.success('Succession plan deleted');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete plan');
    },
  });

  // ----- Nine-Box helpers -----

  /** Map API cell data into a lookup keyed by cell key */
  const cellDataMap = useMemo(() => {
    const map: Record<string, NineBoxCell> = {};
    if (effectiveNineBoxData?.cells) {
      for (const cell of effectiveNineBoxData.cells) {
        map[cell.key] = cell;
      }
    }
    return map;
  }, [effectiveNineBoxData]);

  const selectedCellData = selectedCell ? cellDataMap[selectedCell] : null;
  const selectedCellConfig = selectedCell ? NINE_BOX_CONFIG.find(c => c.key === selectedCell) : null;

  /** Compute per-cell percentage for summary stats */
  const totalEmployees = effectiveNineBoxData?.totalEmployees || 0;

  // Group cells by row for summary: top row = high potential, etc.
  const quadrantSummary = useMemo(() => {
    if (!effectiveNineBoxData?.cells) return { highPotential: 0, corePlayers: 0, stars: 0, underperformers: 0 };
    const cellMap: Record<string, number> = {};
    for (const c of effectiveNineBoxData.cells) {
      cellMap[c.key] = c.employees.length;
    }
    return {
      stars: cellMap['high_potential-high_performance'] || 0,
      highPotential: (cellMap['high_potential-low_performance'] || 0) + (cellMap['high_potential-medium_performance'] || 0) + (cellMap['high_potential-high_performance'] || 0),
      corePlayers: cellMap['medium_potential-medium_performance'] || 0,
      underperformers: cellMap['low_potential-low_performance'] || 0,
    };
  }, [effectiveNineBoxData]);

  // =========================================================================
  // Render: Tabs
  // =========================================================================

  const tabs = [
    { id: 'nine-box' as const, label: '9-Box Grid', icon: Squares2X2Icon },
    { id: 'plans' as const, label: 'Succession Plans', icon: DocumentTextIcon },
  ];

  // =========================================================================
  // Render: Nine-Box Grid
  // =========================================================================

  const renderNineBoxGrid = () => {
    if (nineBoxLoading) {
      return (
        <div className="flex justify-center py-16">
          <div className="glass-spinner" />
        </div>
      );
    }

    if (nineBoxError) {
      return (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">Failed to load 9-Box Grid</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">Please try again later.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Total Employees" value={totalEmployees} icon={UserGroupIcon} color="primary" />
          <StatCard
            label="Stars"
            value={totalEmployees > 0 ? `${quadrantSummary.stars} (${Math.round((quadrantSummary.stars / totalEmployees) * 100)}%)` : '0'}
            icon={ShieldCheckIcon}
            color="green"
          />
          <StatCard
            label="High Potential Row"
            value={totalEmployees > 0 ? `${quadrantSummary.highPotential} (${Math.round((quadrantSummary.highPotential / totalEmployees) * 100)}%)` : '0'}
            icon={ChevronUpIcon}
            color="blue"
          />
          <StatCard
            label="Underperformers"
            value={totalEmployees > 0 ? `${quadrantSummary.underperformers} (${Math.round((quadrantSummary.underperformers / totalEmployees) * 100)}%)` : '0'}
            icon={ExclamationTriangleIcon}
            color="red"
          />
        </div>

        {/* 9-Box Grid */}
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-4 md:p-6">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4 md:mb-6">Talent 9-Box Grid</h2>

          <div className="flex overflow-x-auto md:overflow-visible -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {/* Y-axis labels */}
            <div className="flex flex-col justify-around pr-2 md:pr-3 w-16 md:w-28 shrink-0">
              {POTENTIAL_LABELS.map((label) => (
                <div key={label} className="flex items-center justify-end h-full">
                  <span className="text-2xs md:text-xs font-medium text-secondary-500 dark:text-secondary-400 text-right leading-tight">{label}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-3 grid-rows-3 gap-1.5 md:gap-2 min-h-[240px] md:min-h-[360px] min-w-[280px] md:min-w-0">
                {NINE_BOX_CONFIG.map((cell) => {
                  const data = cellDataMap[cell.key];
                  const count = data?.employees.length || 0;
                  const displayEmployees = (data?.employees || []).slice(0, 3);
                  const isSelected = selectedCell === cell.key;

                  return (
                    <button
                      key={cell.key}
                      onClick={() => setSelectedCell(isSelected ? null : cell.key)}
                      className={clsx(
                        'relative rounded-lg p-3 transition-all text-left flex flex-col justify-between',
                        cell.bg, cell.bgDark,
                        isSelected
                          ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-secondary-800 shadow-md scale-[1.02]'
                          : 'hover:shadow-md hover:scale-[1.01]',
                      )}
                      style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}
                    >
                      <div>
                        <p className={clsx('text-xs font-semibold', cell.textColor, cell.textColorDark)}>{cell.label}</p>
                        <p className={clsx('text-2xl font-bold mt-1', cell.textColor, cell.textColorDark)}>{count}</p>
                      </div>

                      {/* Avatar stack */}
                      {displayEmployees.length > 0 && (
                        <div className="flex -space-x-2 mt-2">
                          {displayEmployees.map((emp) => (
                            <EmployeeAvatar key={emp.id} employee={emp} size="sm" />
                          ))}
                          {count > 3 && (
                            <div className="h-8 w-8 rounded-full bg-secondary-200 dark:bg-secondary-600 flex items-center justify-center text-xs font-medium text-secondary-600 dark:text-secondary-300 ring-2 ring-white dark:ring-secondary-800">
                              +{count - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="grid grid-cols-3 gap-2 mt-2">
                {PERFORMANCE_LABELS.map((label) => (
                  <div key={label} className="text-center">
                    <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Cell Detail */}
        {selectedCell && selectedCellConfig && (
          <div className={clsx('rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] overflow-hidden', selectedCellConfig.bg, selectedCellConfig.bgDark)}>
            <div className="px-6 py-4 border-b border-secondary-200/50 dark:border-secondary-700/50 flex items-center justify-between">
              <div>
                <h3 className={clsx('text-lg font-semibold', selectedCellConfig.textColor, selectedCellConfig.textColorDark)}>
                  {selectedCellConfig.label}
                </h3>
                <p className={clsx('text-sm', selectedCellConfig.textColor, selectedCellConfig.textColorDark, 'opacity-70')}>
                  {selectedCellData?.employees.length || 0} employee{(selectedCellData?.employees.length || 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-700 dark:text-secondary-300" />
              </button>
            </div>

            {(!selectedCellData || selectedCellData.employees.length === 0) ? (
              <div className="px-6 py-8 text-center">
                <UserGroupIcon className="mx-auto h-10 w-10 text-secondary-400 dark:text-secondary-500 opacity-50" />
                <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">No employees in this cell</p>
              </div>
            ) : (
              <div className="divide-y divide-secondary-200/50 dark:divide-secondary-700/50">
                {selectedCellData.employees.map((emp) => (
                  <div key={emp.id} className="px-6 py-3 flex items-center gap-4">
                    <EmployeeAvatar employee={emp} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">
                        {emp.jobTitle}{emp.department ? ` - ${emp.department}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">Performance</p>
                        <p className="text-sm font-bold text-secondary-900 dark:text-white">{(emp.performanceScore ?? 0).toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-secondary-500 dark:text-secondary-400">Potential</p>
                        <p className="text-sm font-bold text-secondary-900 dark:text-white">{(emp.potentialScore ?? 0).toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // Render: Succession Plans
  // =========================================================================

  const renderPlans = () => {
    if (plansLoading) {
      return (
        <div className="flex justify-center py-16">
          <div className="glass-spinner" />
        </div>
      );
    }

    if (plansError) {
      return (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">Failed to load succession plans</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">Please try again later.</p>
        </div>
      );
    }

    if (!effectivePlans || effectivePlans.length === 0) {
      return (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No succession plans</h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Create your first succession plan to identify and develop future leaders.
          </p>
          <button onClick={() => setShowCreateModal(true)} className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-colors">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Succession Plan
          </button>
        </div>
      );
    }

    return (
      <div className="grid gap-4">
        {effectivePlans.map((plan) => {
          const isExpanded = expandedPlanId === plan.id;
          const successors = isExpanded ? (readinessData || plan.successors || []) : [];

          return (
            <div key={plan.id} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] overflow-hidden">
              {/* Card header */}
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">{plan.positionTitle}</h3>
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', criticalityColors[plan.criticality])}>
                        {plan.criticality}
                      </span>
                    </div>

                    {plan.currentIncumbent && (
                      <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                        Current: {plan.currentIncumbent.firstName} {plan.currentIncumbent.lastName}
                      </p>
                    )}

                    {/* Metrics row */}
                    <div className="flex items-center gap-4 mt-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <UserGroupIcon className="h-4 w-4 text-secondary-400" />
                        <span className="text-sm text-secondary-600 dark:text-secondary-300">
                          Bench: <span className="font-medium">{plan.benchStrength}</span>
                        </span>
                      </div>

                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', turnoverRiskColors[plan.turnoverRisk])}>
                        Turnover: {plan.turnoverRisk}
                      </span>

                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', vacancyImpactColors[plan.vacancyImpact])}>
                        Impact: {plan.vacancyImpact}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <ArrowPathIcon className="h-4 w-4 text-secondary-400" />
                        <span className="text-sm text-secondary-600 dark:text-secondary-300">
                          {reviewFrequencyLabels[plan.reviewFrequency] || plan.reviewFrequency}
                        </span>
                      </div>
                    </div>

                    {/* Dates row */}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      {plan.lastReviewedAt && (
                        <div className="flex items-center gap-1.5">
                          <CalendarDaysIcon className="h-4 w-4 text-secondary-400" />
                          <span className="text-xs text-secondary-500 dark:text-secondary-400">
                            Last reviewed: {format(new Date(plan.lastReviewedAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                      {plan.nextReviewAt && (
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="h-4 w-4 text-secondary-400" />
                          <span className="text-xs text-secondary-500 dark:text-secondary-400">
                            Next review: {format(new Date(plan.nextReviewAt), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side actions */}
                  <button
                    onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                    className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-secondary-500 dark:text-secondary-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-secondary-500 dark:text-secondary-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded successors */}
              {isExpanded && (
                <div className="border-t border-secondary-200/60 dark:border-white/[0.06]">
                  <div className="px-5 py-3 bg-secondary-50 dark:bg-secondary-900/50">
                    <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300">Successors</h4>
                  </div>
                  {successors.length === 0 ? (
                    <div className="px-5 py-6 text-center">
                      <UserGroupIcon className="mx-auto h-8 w-8 text-secondary-300 dark:text-secondary-600" />
                      <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">No successors identified yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-secondary-100/60 dark:divide-white/[0.04]">
                      {successors.map((successor, idx) => (
                        <div key={successor.id || idx} className="px-5 py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm font-medium text-secondary-400 dark:text-secondary-500 w-6 text-center shrink-0">
                              #{successor.priority || idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">{successor.candidateName}</p>
                              {successor.notes && (
                                <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">{successor.notes}</p>
                              )}
                            </div>
                          </div>
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium shrink-0', readinessColors[successor.readiness])}>
                            {readinessLabels[successor.readiness] || successor.readiness}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // =========================================================================
  // Render: Create Modal
  // =========================================================================

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-xl max-w-lg w-full p-6 border border-secondary-200/60 dark:border-white/[0.06]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Create Succession Plan</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500 dark:text-secondary-400" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const timeToFillRaw = formData.get('timeToFill') as string;
                createMutation.mutate({
                  positionTitle: formData.get('positionTitle') as string,
                  criticality: formData.get('criticality') as string,
                  currentIncumbentId: (formData.get('currentIncumbentId') as string) || undefined,
                  turnoverRisk: formData.get('turnoverRisk') as string,
                  vacancyImpact: formData.get('vacancyImpact') as string,
                  timeToFill: timeToFillRaw ? parseInt(timeToFillRaw, 10) : undefined,
                  reviewFrequency: formData.get('reviewFrequency') as string,
                  notes: (formData.get('notes') as string) || undefined,
                });
              }}
              className="space-y-4"
            >
              {/* Position Title */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Position Title <span className="text-red-500">*</span>
                </label>
                <input
                  name="positionTitle"
                  type="text"
                  required
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  placeholder="e.g., VP of Engineering"
                />
              </div>

              {/* Criticality */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Criticality <span className="text-red-500">*</span>
                </label>
                <select
                  name="criticality"
                  required
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                >
                  <option value="">Select criticality...</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              {/* Current Incumbent */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Current Incumbent (User ID)
                </label>
                <input
                  name="currentIncumbentId"
                  type="text"
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  placeholder="UUID of current incumbent"
                />
              </div>

              {/* Turnover Risk + Vacancy Impact row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Turnover Risk <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="turnoverRisk"
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Vacancy Impact <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="vacancyImpact"
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="SEVERE">Severe</option>
                    <option value="SIGNIFICANT">Significant</option>
                    <option value="MODERATE">Moderate</option>
                    <option value="MINIMAL">Minimal</option>
                  </select>
                </div>
              </div>

              {/* Time to Fill + Review Frequency row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Time to Fill (days)
                  </label>
                  <input
                    name="timeToFill"
                    type="number"
                    min="0"
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                    placeholder="e.g., 90"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Review Frequency <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="reviewFrequency"
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  >
                    <option value="">Select...</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="SEMI_ANNUAL">Semi-Annual</option>
                    <option value="ANNUAL">Annual</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors resize-none"
                  placeholder="Additional context or notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-secondary-100 dark:bg-secondary-700 hover:bg-secondary-200 dark:hover:bg-secondary-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // Main Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Succession Planning"
        subtitle="Identify, develop, and retain top talent for critical roles"
      >
        {activeTab === 'plans' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Succession Plan
          </button>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="border-b border-secondary-200/60 dark:border-white/[0.06]">
        <nav className="flex gap-6" aria-label="Succession planning tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedCell(null);
                }}
                className={clsx(
                  'flex items-center gap-2 pb-3 border-b-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 hover:border-secondary-300 dark:hover:border-secondary-600',
                )}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'nine-box' ? renderNineBoxGrid() : renderPlans()}

      {/* Create Modal */}
      {renderCreateModal()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card sub-component
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: 'primary' | 'green' | 'blue' | 'red';
}) {
  const colorMap = {
    primary: {
      iconBg: 'bg-primary-100 dark:bg-primary-900/40',
      iconText: 'text-primary-600 dark:text-primary-400',
    },
    green: {
      iconBg: 'bg-green-100 dark:bg-green-900/40',
      iconText: 'text-green-600 dark:text-green-400',
    },
    blue: {
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      iconText: 'text-blue-600 dark:text-blue-400',
    },
    red: {
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      iconText: 'text-red-600 dark:text-red-400',
    },
  };

  const c = colorMap[color];

  return (
    <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-4">
      <div className="flex flex-col gap-2">
        <div className={clsx('p-2 rounded-lg w-fit', c.iconBg)}>
          <Icon className={clsx('h-5 w-5', c.iconText)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">{label}</p>
          <p className="text-lg font-bold text-secondary-900 dark:text-white whitespace-nowrap">{value}</p>
        </div>
      </div>
    </div>
  );
}
