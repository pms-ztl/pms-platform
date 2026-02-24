import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { developmentApi, type DevelopmentPlan } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  PlusIcon,
  FunnelIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  XMarkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

// ── Constants ────────────────────────────────────────────────────────────────

const PLAN_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  CAREER_GROWTH: {
    label: 'Career Growth',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
  SKILL_DEVELOPMENT: {
    label: 'Skill Development',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  LEADERSHIP: {
    label: 'Leadership',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  },
  PERFORMANCE_IMPROVEMENT: {
    label: 'Performance Improvement',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  },
  ACTIVE: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  },
};

const MANAGER_ROLES = ['MANAGER', 'HR_ADMIN', 'SUPER_ADMIN'];

const ITEMS_PER_PAGE = 9;

// ── Helper Components ────────────────────────────────────────────────────────

function ProgressRing({ progress, size = 48, strokeWidth = 4 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-secondary-200 dark:text-secondary-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary-600 transition-all duration-500"
        />
      </svg>
      <span className="absolute text-xs font-semibold text-secondary-700 dark:text-secondary-300">
        {clamped}%
      </span>
    </div>
  );
}

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full px-2 py-0.5 text-xs inline-flex items-center gap-1"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="hover:text-primary-900 dark:hover:text-primary-100"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className="flex-1 block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="button"
          onClick={addTag}
          className="px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-primary-50/30 dark:hover:bg-white/[0.03]"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, showEmployee }: { plan: DevelopmentPlan; showEmployee?: boolean }) {
  const planType = PLAN_TYPE_CONFIG[plan.planType] || {
    label: plan.planType,
    color: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  };
  const statusCfg = STATUS_CONFIG[plan.status] || {
    label: plan.status,
    color: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Link
      to={`/development/${plan.id}`}
      className="block bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 group"
    >
      <div className="p-5">
        {/* Top row: employee avatar (team view) + badges */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {showEmployee && plan.user && (
              <div className="flex-shrink-0">
                {plan.user.avatarUrl ? (
                  <img
                    src={plan.user.avatarUrl}
                    alt={`${plan.user.firstName} ${plan.user.lastName}`}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">
                    {plan.user.firstName?.[0]}
                    {plan.user.lastName?.[0]}
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white break-words group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors first-letter:uppercase">
                {plan.planName}
              </h3>
              {showEmployee && plan.user && (
                <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">
                  {plan.user.firstName} {plan.user.lastName}
                  {plan.user.jobTitle ? ` -- ${plan.user.jobTitle}` : ''}
                </p>
              )}
            </div>
          </div>
          <ProgressRing progress={plan.overallProgress ?? plan.progressPercentage ?? 0} />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', planType.color)}>
            {planType.label}
          </span>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusCfg.color)}>
            {statusCfg.label}
          </span>
        </div>

        {/* Career goal preview */}
        {plan.careerGoal && (
          <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-3">
            {plan.careerGoal}
          </p>
        )}

        {/* Target role / level */}
        {(plan.targetRole || plan.currentLevel) && (
          <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400 mb-3">
            {plan.currentLevel && (
              <span className="bg-secondary-100 dark:bg-secondary-700 rounded px-1.5 py-0.5">
                {plan.currentLevel}
              </span>
            )}
            {plan.targetRole && (
              <>
                <ArrowRightIcon className="h-3 w-3 text-secondary-400" />
                <span className="bg-secondary-100 dark:bg-secondary-700 rounded px-1.5 py-0.5 font-medium">
                  {plan.targetRole}
                </span>
              </>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-400 mb-1">
            <span>Progress</span>
            <span>{plan.overallProgress ?? plan.progressPercentage ?? 0}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary-200 dark:bg-secondary-700">
            <div
              className="h-2 rounded-full bg-primary-600 transition-all duration-500"
              style={{ width: `${Math.min(plan.overallProgress ?? plan.progressPercentage ?? 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center gap-1.5 text-xs text-secondary-500 dark:text-secondary-400 mb-3">
          <CalendarDaysIcon className="h-3.5 w-3.5" />
          <span>{formatDate(plan.startDate)}</span>
          <ArrowRightIcon className="h-3 w-3" />
          <span>{formatDate(plan.targetCompletionDate)}</span>
        </div>

        {/* Development areas tags */}
        {plan.developmentAreas && plan.developmentAreas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {plan.developmentAreas.slice(0, 4).map((area, i) => (
              <span
                key={i}
                className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full px-2 py-0.5 text-xs"
              >
                {area}
              </span>
            ))}
            {plan.developmentAreas.length > 4 && (
              <span className="text-xs text-secondary-400 dark:text-secondary-500 py-0.5">
                +{plan.developmentAreas.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// ── Create Plan Modal ────────────────────────────────────────────────────────

function CreatePlanModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();

  const [planName, setPlanName] = useState('');
  const [planType, setPlanType] = useState('CAREER_GROWTH');
  const [careerGoal, setCareerGoal] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [currentLevel, setCurrentLevel] = useState('');
  const [duration, setDuration] = useState<number>(6);
  const [startDate, setStartDate] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  const [strengthsAssessed, setStrengthsAssessed] = useState<string[]>([]);
  const [developmentAreas, setDevelopmentAreas] = useState<string[]>([]);

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof developmentApi.createPlan>[0]) =>
      developmentApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['development-plans'] });
      queryClient.invalidateQueries({ queryKey: ['development-team-plans'] });
      toast.success('Development plan created successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create plan');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      planName,
      planType,
      careerGoal,
      targetRole: targetRole || undefined,
      currentLevel,
      duration,
      startDate,
      targetCompletionDate,
      strengthsAssessed: strengthsAssessed.length > 0 ? strengthsAssessed : undefined,
      developmentAreas: developmentAreas.length > 0 ? developmentAreas : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
            Create Development Plan
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Plan name */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g., Senior Engineer Growth Plan"
              className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Plan type */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Plan Type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={planType}
              onChange={(e) => setPlanType(e.target.value)}
              className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            >
              <option value="CAREER_GROWTH">Career Growth</option>
              <option value="SKILL_DEVELOPMENT">Skill Development</option>
              <option value="LEADERSHIP">Leadership</option>
              <option value="PERFORMANCE_IMPROVEMENT">Performance Improvement</option>
            </select>
          </div>

          {/* Career goal */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Career Goal <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="Describe the career objective for this development plan..."
              className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Target role + current level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Target Role
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Staff Engineer"
                className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Current Level <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={currentLevel}
                onChange={(e) => setCurrentLevel(e.target.value)}
                placeholder="e.g., Junior, Mid, Senior"
                className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Duration (months) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              max={60}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                Target Completion Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={targetCompletionDate}
                onChange={(e) => setTargetCompletionDate(e.target.value)}
                className="block w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Strengths assessed */}
          <TagInput
            label="Strengths Assessed"
            tags={strengthsAssessed}
            onChange={setStrengthsAssessed}
            placeholder="Add a strength and press Enter"
          />

          {/* Development areas */}
          <TagInput
            label="Development Areas"
            tags={developmentAreas}
            onChange={setDevelopmentAreas}
            placeholder="Add a development area and press Enter"
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function DevelopmentPage() {
  usePageTitle('Development Plans');
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasManagerAccess = user?.roles?.some((r) =>
    MANAGER_ROLES.includes(r)
  ) ?? false;

  const [activeTab, setActiveTab] = useState<'my' | 'team'>('my');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Reset page when filters or tab change
  const handleTabChange = (tab: 'my' | 'team') => {
    setActiveTab(tab);
    setPage(1);
  };
  const handleStatusChange = (status: string) => {
    setStatusFilter(status);
    setPage(1);
  };

  // ── My Plans ──
  const {
    data: myPlansData,
    isLoading: loadingMyPlans,
  } = useQuery({
    queryKey: ['development-plans', { page, status: statusFilter }],
    queryFn: () =>
      developmentApi.listPlans({
        page,
        limit: ITEMS_PER_PAGE,
        status: statusFilter || undefined,
      }),
    enabled: activeTab === 'my',
  });

  // ── Team Plans ──
  const {
    data: teamPlansRaw,
    isLoading: loadingTeamPlans,
  } = useQuery({
    queryKey: ['development-team-plans'],
    queryFn: () => developmentApi.getTeamPlans(),
    enabled: activeTab === 'team' && hasManagerAccess,
  });

  // Client-side filter + paginate team plans (since getTeamPlans returns full list)
  const filteredTeamPlans = (teamPlansRaw ?? []).filter(
    (p) => !statusFilter || p.status === statusFilter
  );
  const teamTotalPages = Math.max(1, Math.ceil(filteredTeamPlans.length / ITEMS_PER_PAGE));
  const teamPlans = filteredTeamPlans.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  // Determine what data to render
  const isTeamView = activeTab === 'team';
  const isLoading = isTeamView ? loadingTeamPlans : loadingMyPlans;
  const plans: DevelopmentPlan[] = isTeamView ? teamPlans : (myPlansData?.data ?? []);
  const totalPages = isTeamView ? teamTotalPages : (myPlansData?.meta?.totalPages ?? 1);
  const totalItems = isTeamView ? filteredTeamPlans.length : (myPlansData?.meta?.total ?? 0);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <PageHeader
        title="Development Plans"
        subtitle="Plan and track professional growth and skill development"
      >
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Plan
        </button>
      </PageHeader>

      {/* ── Tabs ── */}
      <div className="border-b border-secondary-200/60 dark:border-white/[0.06]">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('my')}
            className={clsx(
              'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'my'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
            )}
          >
            My Plans
          </button>
          {hasManagerAccess && (
            <button
              onClick={() => handleTabChange('team')}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === 'team'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
              )}
            >
              Team Plans
            </button>
          )}
        </nav>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="block rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-1.5 text-sm text-secondary-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 w-40"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        {totalItems > 0 && (
          <span className="text-sm text-secondary-500 dark:text-secondary-400">
            {totalItems} plan{totalItems !== 1 ? 's' : ''} found
          </span>
        )}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="glass-spinner" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06]">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
            {isTeamView ? 'No team development plans' : 'No development plans yet'}
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {isTeamView
              ? 'None of your team members have development plans matching the current filter.'
              : 'Get started by creating a development plan to track your professional growth.'}
          </p>
          {!isTeamView && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium inline-flex items-center gap-2 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                Create Plan
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Plan cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                showEmployee={isTeamView}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-secondary-500 dark:text-secondary-400">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(page * ITEMS_PER_PAGE, totalItems)} of {totalItems} plans
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={clsx(
                          'w-8 h-8 text-sm rounded-lg font-medium transition-colors',
                          pageNum === page
                            ? 'bg-primary-600 text-white'
                            : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm font-medium text-secondary-700 dark:text-secondary-300 bg-white dark:bg-secondary-700 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create Plan Modal ── */}
      {showCreateModal && (
        <CreatePlanModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
