import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftIcon,
  UserIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  FlagIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  StarIcon,
  HandThumbUpIcon,
  ShieldCheckIcon,
  LinkIcon,
  ChevronRightIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import {
  usersApi,
  goalsApi,
  feedbackApi,
  reviewsApi,
  performanceMathApi,
  evidenceApi,
  developmentApi,
  type User,
  type Goal,
  type Feedback,
  type Review,
  type PerformanceScoreResult,
  type DevelopmentPlan,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ============================================================================
// Constants
// ============================================================================

type TabKey = 'overview' | 'goals' | 'reviews' | 'feedback' | 'development' | 'evidence';

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Overview', icon: ChartBarIcon },
  { key: 'goals', label: 'Goals', icon: FlagIcon },
  { key: 'reviews', label: 'Reviews', icon: ClipboardDocumentCheckIcon },
  { key: 'feedback', label: 'Feedback', icon: ChatBubbleLeftRightIcon },
  { key: 'development', label: 'Development', icon: AcademicCapIcon },
  { key: 'evidence', label: 'Evidence', icon: DocumentTextIcon },
];

const goalStatusColors: Record<string, string> = {
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  ON_TRACK: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  AT_RISK: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  BEHIND: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  CANCELLED: 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400',
  NOT_STARTED: 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300',
};

const reviewStatusColors: Record<string, string> = {
  NOT_STARTED: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300',
  IN_PROGRESS: 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300',
  SUBMITTED: 'bg-warning-100 text-warning-800 dark:bg-amber-900/50 dark:text-amber-300',
  CALIBRATED: 'bg-info-100 text-info-800 dark:bg-blue-900/50 dark:text-blue-300',
  FINALIZED: 'bg-success-100 text-success-800 dark:bg-green-900/50 dark:text-green-300',
  ACKNOWLEDGED: 'bg-success-200 text-success-900 dark:bg-green-900/60 dark:text-green-200',
};

const feedbackTypeColors: Record<string, string> = {
  PRAISE: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  CONSTRUCTIVE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  COACHING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  RECOGNITION: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
};

const evidenceTypeColors: Record<string, string> = {
  DOCUMENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  METRIC: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  FEEDBACK: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  ACHIEVEMENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  CERTIFICATION: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
};

const planStatusColors: Record<string, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-300',
  ACTIVE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  ON_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
};

// ============================================================================
// Helper Components
// ============================================================================

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>
          {star <= value ? (
            <StarSolidIcon className="h-4 w-4 text-amber-400" />
          ) : (
            <StarIcon className="h-4 w-4 text-secondary-300 dark:text-secondary-600" />
          )}
        </span>
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color = 'primary',
  subtitle,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  subtitle?: string;
  trend?: { value: number; positive: boolean };
}) {
  const colorClasses = {
    primary: 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  };

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className={clsx('p-2.5 rounded-lg', colorClasses[color])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          {trend.positive ? (
            <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <ArrowTrendingDownIcon className="h-3.5 w-3.5 text-red-500" />
          )}
          <span className={trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
        </div>
      )}
    </div>
  );
}

function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
}: {
  value: number;
  max?: number;
  size?: 'sm' | 'md';
  color?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = {
    primary: 'bg-primary-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
  };
  return (
    <div className={clsx('w-full bg-secondary-200 dark:bg-secondary-700 rounded-full', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
      <div
        className={clsx('rounded-full transition-all duration-500', barColor[color], size === 'sm' ? 'h-1.5' : 'h-2.5')}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="text-center py-10">
      <Icon className="mx-auto h-10 w-10 text-secondary-300 dark:text-secondary-600" />
      <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">{message}</p>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: employee, isLoading: loadingEmployee, error: employeeError } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  });

  const { data: performanceScore, isLoading: loadingScore } = useQuery({
    queryKey: ['performance-score', id],
    queryFn: () => performanceMathApi.getScore(id!),
    enabled: !!id,
  });

  const { data: goalsData } = useQuery({
    queryKey: ['goals', 'employee', id],
    queryFn: () => goalsApi.list({ ownerId: id!, limit: 50 }),
    enabled: !!id,
  });

  const { data: reviewsAsReviewee } = useQuery({
    queryKey: ['reviews', 'employee', id],
    queryFn: () => reviewsApi.listMyReviews({ asReviewee: true }),
    enabled: !!id,
  });

  const { data: feedbackReceived } = useQuery({
    queryKey: ['feedback', 'received', id],
    queryFn: () => feedbackApi.listReceived({ limit: 50 }),
    enabled: !!id,
  });

  const { data: evidenceSummary } = useQuery({
    queryKey: ['evidence', 'summary', id],
    queryFn: () => evidenceApi.getEmployeeSummary(id!),
    enabled: !!id,
  });

  const { data: developmentPlans } = useQuery({
    queryKey: ['development-plans', 'employee', id],
    queryFn: () => developmentApi.listPlans({ limit: 20 }),
    enabled: !!id,
  });

  const { data: evidenceList } = useQuery({
    queryKey: ['evidence', 'list', id],
    queryFn: () => evidenceApi.list({ limit: 50 }),
    enabled: !!id && activeTab === 'evidence',
  });

  // ── Computed values ──────────────────────────────────────────────────────

  const goals = goalsData?.data ?? [];
  const reviews = reviewsAsReviewee ?? [];
  const feedbackItems = feedbackReceived?.data ?? [];
  const devPlans = developmentPlans?.data ?? [];
  const evidenceItems = evidenceList?.data ?? [];

  const goalStats = useMemo(() => {
    const active = goals.filter((g) => g.status === 'ACTIVE').length;
    const completed = goals.filter((g) => g.status === 'COMPLETED').length;
    const atRisk = goals.filter((g) => g.status === 'AT_RISK' || g.status === 'BEHIND').length;
    const totalProgress = goals.reduce((sum, g) => sum + (g.progress || 0), 0);
    const avgProgress = goals.length > 0 ? Math.round(totalProgress / goals.length) : 0;
    return { active, completed, atRisk, total: goals.length, avgProgress };
  }, [goals]);

  const feedbackStats = useMemo(() => {
    const praise = feedbackItems.filter((f) => f.type === 'PRAISE' || f.type === 'RECOGNITION').length;
    const constructive = feedbackItems.filter((f) => f.type === 'CONSTRUCTIVE' || f.type === 'COACHING').length;
    const totalSentiment = feedbackItems.reduce((sum, f) => {
      if (f.sentiment === 'POSITIVE') return sum + 1;
      if (f.sentiment === 'NEGATIVE') return sum - 1;
      return sum;
    }, 0);
    const avgSentiment = feedbackItems.length > 0 ? totalSentiment / feedbackItems.length : 0;
    return { praise, constructive, total: feedbackItems.length, avgSentiment };
  }, [feedbackItems]);

  const latestReview = useMemo(() => {
    if (!Array.isArray(reviews) || reviews.length === 0) return null;
    const sorted = [...reviews].sort(
      (a, b) => new Date(b.submittedAt || b.acknowledgedAt || '').getTime() -
                new Date(a.submittedAt || a.acknowledgedAt || '').getTime()
    );
    return sorted[0];
  }, [reviews]);

  const ratingLabel = (rating: number): string => {
    if (rating >= 4.5) return 'Exceptional';
    if (rating >= 3.5) return 'Exceeds Expectations';
    if (rating >= 2.5) return 'Meets Expectations';
    if (rating >= 1.5) return 'Needs Improvement';
    return 'Unsatisfactory';
  };

  const ratingColor = (rating: number): string => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400';
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400';
    if (rating >= 2.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const trajectoryLabel = (t: number): string => {
    if (t > 0.15) return 'Improving';
    if (t < -0.15) return 'Declining';
    return 'Stable';
  };

  const confidenceLabel = (c: number): string => {
    if (c >= 0.8) return 'High';
    if (c >= 0.5) return 'Medium';
    return 'Low';
  };

  // ── Loading / Error ──────────────────────────────────────────────────────

  if (loadingEmployee) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (employeeError || !employee) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-2 text-lg font-medium text-secondary-900 dark:text-white">Employee not found</h3>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">
          The employee profile you are looking for does not exist or has been removed.
        </p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  const isSelf = employee.id === currentUser?.id;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ================================================================ */}
      {/* Back Navigation                                                  */}
      {/* ================================================================ */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400 transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
          Employee Profile
        </h1>
      </div>

      {/* ================================================================ */}
      {/* Header Card: Avatar, Name, Info                                  */}
      {/* ================================================================ */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {employee.avatarUrl ? (
              <img
                src={employee.avatarUrl}
                alt={`${employee.firstName} ${employee.lastName}`}
                className="w-20 h-20 rounded-full object-cover ring-4 ring-secondary-100 dark:ring-secondary-700"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center ring-4 ring-secondary-100 dark:ring-secondary-700">
                <span className="text-2xl font-semibold text-primary-700 dark:text-primary-300">
                  {employee.firstName?.[0]}{employee.lastName?.[0]}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                {employee.firstName} {employee.lastName}
              </h2>
              {isSelf && (
                <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
                  You
                </span>
              )}
              <span
                className={clsx(
                  'px-2.5 py-0.5 rounded-full text-xs font-medium',
                  employee.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                )}
              >
                {employee.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="text-secondary-600 dark:text-secondary-400 mt-1">
              {employee.jobTitle || 'Employee'}
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 text-sm text-secondary-500 dark:text-secondary-400">
              {employee.department && (
                <span className="flex items-center gap-1.5">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  {employee.department.name}
                </span>
              )}
              {employee.manager && (
                <span className="flex items-center gap-1.5">
                  <UserIcon className="h-4 w-4" />
                  Reports to {employee.manager.firstName} {employee.manager.lastName}
                </span>
              )}
              {employee.email && (
                <span className="flex items-center gap-1.5">
                  <BriefcaseIcon className="h-4 w-4" />
                  {employee.email}
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 sm:flex-col">
            <Link
              to={`/feedback?to=${employee.id}`}
              className="btn-primary text-sm"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1.5" />
              Give Feedback
            </Link>
            <Link
              to="/goals"
              className="btn-secondary text-sm"
            >
              <FlagIcon className="h-4 w-4 mr-1.5" />
              View Goals
            </Link>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* Performance Score Card                                           */}
      {/* ================================================================ */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
        <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          Performance Score
        </h3>

        {loadingScore ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : performanceScore ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Overall Score */}
            <div className="text-center p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
              <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Overall
              </p>
              <p className={clsx('text-3xl font-bold mt-1', ratingColor(performanceScore.overallScore))}>
                {performanceScore.overallScore.toFixed(1)}
              </p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                {ratingLabel(performanceScore.derivedRating)}
              </p>
            </div>

            {/* Derived Rating */}
            <div className="text-center p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
              <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Rating
              </p>
              <div className="flex justify-center mt-2">
                <StarRating value={performanceScore.derivedRating} />
              </div>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                {performanceScore.derivedRating}/5
              </p>
            </div>

            {/* Percentile */}
            <div className="text-center p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
              <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Percentile
              </p>
              <p className="text-3xl font-bold text-secondary-900 dark:text-white mt-1">
                {performanceScore.percentile != null ? `${Math.round(performanceScore.percentile)}th` : 'N/A'}
              </p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                vs peers
              </p>
            </div>

            {/* Trajectory */}
            <div className="text-center p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
              <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Trajectory
              </p>
              <div className="flex items-center justify-center gap-1 mt-2">
                {performanceScore.trajectory > 0 ? (
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                ) : performanceScore.trajectory < 0 ? (
                  <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
                ) : (
                  <span className="text-secondary-400">&mdash;</span>
                )}
                <span className={clsx(
                  'text-lg font-semibold',
                  performanceScore.trajectory > 0 ? 'text-green-600 dark:text-green-400' : performanceScore.trajectory < 0 ? 'text-red-600 dark:text-red-400' : 'text-secondary-500'
                )}>
                  {performanceScore.trajectory > 0 ? '+' : ''}{performanceScore.trajectory.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                {trajectoryLabel(performanceScore.trajectory)}
              </p>
            </div>

            {/* Confidence */}
            <div className="text-center p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
              <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Confidence
              </p>
              <p className="text-3xl font-bold text-secondary-900 dark:text-white mt-1">
                {Math.round(performanceScore.confidence * 100)}%
              </p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                {confidenceLabel(performanceScore.confidence)}
              </p>
            </div>

            {/* Data Points */}
            <div className="text-center p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
              <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                Data Points
              </p>
              <div className="flex justify-center gap-3 mt-2 text-xs">
                <span className="text-secondary-600 dark:text-secondary-300">
                  <strong>{performanceScore.dataPoints.goals}</strong> goals
                </span>
                <span className="text-secondary-600 dark:text-secondary-300">
                  <strong>{performanceScore.dataPoints.reviews}</strong> reviews
                </span>
                <span className="text-secondary-600 dark:text-secondary-300">
                  <strong>{performanceScore.dataPoints.feedbacks}</strong> fb
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <ChartBarIcon className="mx-auto h-8 w-8 text-secondary-300 dark:text-secondary-600" />
            <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
              No performance score data available yet.
            </p>
          </div>
        )}

        {/* Score Breakdown Bar */}
        {performanceScore && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">Goal Attainment</span>
                <span className="text-xs font-bold text-secondary-900 dark:text-white">{performanceScore.goalAttainment.toFixed(1)}</span>
              </div>
              <ProgressBar value={performanceScore.goalAttainment} max={5} color="primary" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">Review Score</span>
                <span className="text-xs font-bold text-secondary-900 dark:text-white">{performanceScore.reviewScore.toFixed(1)}</span>
              </div>
              <ProgressBar value={performanceScore.reviewScore} max={5} color="success" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-secondary-600 dark:text-secondary-400">Feedback Score</span>
                <span className="text-xs font-bold text-secondary-900 dark:text-white">{performanceScore.feedbackScore.toFixed(1)}</span>
              </div>
              <ProgressBar value={performanceScore.feedbackScore} max={5} color="warning" />
            </div>
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Summary Cards Row                                                */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Goals"
          value={goalStats.total}
          icon={FlagIcon}
          color="primary"
          subtitle={`${goalStats.completed} completed, ${goalStats.active} active`}
        />
        <StatCard
          label="Avg Progress"
          value={`${goalStats.avgProgress}%`}
          icon={ChartBarIcon}
          color={goalStats.avgProgress >= 70 ? 'success' : goalStats.avgProgress >= 40 ? 'warning' : 'danger'}
          subtitle={goalStats.atRisk > 0 ? `${goalStats.atRisk} at risk` : 'All on track'}
        />
        <StatCard
          label="Feedback"
          value={feedbackStats.total}
          icon={ChatBubbleLeftRightIcon}
          color="info"
          subtitle={`${feedbackStats.praise} praise, ${feedbackStats.constructive} constructive`}
        />
        <StatCard
          label="Latest Review"
          value={latestReview?.overallRating ? `${latestReview.overallRating}/5` : 'N/A'}
          icon={ClipboardDocumentCheckIcon}
          color={latestReview?.overallRating && latestReview.overallRating >= 3 ? 'success' : 'warning'}
          subtitle={latestReview ? latestReview.status.replace(/_/g, ' ') : 'No reviews yet'}
        />
      </div>

      {/* ================================================================ */}
      {/* Quick Links                                                      */}
      {/* ================================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { to: '/goals', label: 'Goals', icon: FlagIcon, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' },
          { to: '/reviews', label: 'Reviews', icon: ClipboardDocumentCheckIcon, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20' },
          { to: '/feedback', label: 'Feedback', icon: ChatBubbleLeftRightIcon, color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' },
          { to: '/development', label: 'Development', icon: AcademicCapIcon, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
        ].map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 hover:border-primary-300 dark:hover:border-primary-600 transition-colors group"
          >
            <div className={clsx('p-2 rounded-lg', link.color)}>
              <link.icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {link.label}
            </span>
            <ChevronRightIcon className="h-4 w-4 text-secondary-400 ml-auto" />
          </Link>
        ))}
      </div>

      {/* ================================================================ */}
      {/* Tabs                                                             */}
      {/* ================================================================ */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 hover:border-secondary-300 dark:hover:border-secondary-600'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ================================================================ */}
      {/* Tab Content                                                      */}
      {/* ================================================================ */}

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Goals Summary */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Goals Overview</h3>
              <Link to="/goals" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all</Link>
            </div>
            {goals.length === 0 ? (
              <EmptyState icon={FlagIcon} message="No goals assigned yet." />
            ) : (
              <div className="space-y-3">
                {goals.slice(0, 5).map((goal) => (
                  <div key={goal.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{goal.title}</p>
                        <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0', goalStatusColors[goal.status] || goalStatusColors.ACTIVE)}>
                          {goal.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <ProgressBar value={goal.progress} size="sm" color={goal.progress >= 75 ? 'success' : goal.progress >= 40 ? 'primary' : 'warning'} />
                        <span className="text-xs text-secondary-500 dark:text-secondary-400 w-8 text-right">{goal.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {goals.length > 5 && (
                  <p className="text-xs text-secondary-400 dark:text-secondary-500 text-center pt-1">
                    +{goals.length - 5} more goals
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Recent Feedback */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Recent Feedback</h3>
              <Link to="/feedback" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all</Link>
            </div>
            {feedbackItems.length === 0 ? (
              <EmptyState icon={ChatBubbleLeftRightIcon} message="No feedback received yet." />
            ) : (
              <div className="space-y-3">
                {feedbackItems.slice(0, 5).map((fb) => (
                  <div key={fb.id} className="p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx('px-1.5 py-0.5 rounded text-[10px] font-medium', feedbackTypeColors[fb.type] || feedbackTypeColors.PRAISE)}>
                        {fb.type}
                      </span>
                      <span className="text-xs text-secondary-400 dark:text-secondary-500">
                        {fb.isAnonymous ? 'Anonymous' : fb.fromUser ? `${fb.fromUser.firstName} ${fb.fromUser.lastName}` : 'Unknown'}
                      </span>
                      <span className="text-xs text-secondary-400 dark:text-secondary-500 ml-auto">
                        {format(new Date(fb.createdAt), 'MMM d')}
                      </span>
                    </div>
                    <p className="text-sm text-secondary-700 dark:text-secondary-300 line-clamp-2">{fb.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Evidence Summary */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Evidence Summary</h3>
            {evidenceSummary ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                    <DocumentTextIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-secondary-900 dark:text-white">{evidenceSummary.total}</p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400">Total evidence items</p>
                  </div>
                </div>
                {evidenceSummary.byType && Object.keys(evidenceSummary.byType).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">By Type</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(evidenceSummary.byType).map(([type, count]) => (
                        <span
                          key={type}
                          className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', evidenceTypeColors[type] || 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300')}
                        >
                          {type}: {count as number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {evidenceSummary.byStatus && Object.keys(evidenceSummary.byStatus).length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-2">By Status</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(evidenceSummary.byStatus).map(([status, count]) => (
                        <span
                          key={status}
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300"
                        >
                          {status.replace(/_/g, ' ')}: {count as number}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState icon={DocumentTextIcon} message="No evidence data available." />
            )}
          </div>

          {/* Development Plans Summary */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Development Plans</h3>
              <Link to="/development" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">View all</Link>
            </div>
            {devPlans.length === 0 ? (
              <EmptyState icon={AcademicCapIcon} message="No development plans yet." />
            ) : (
              <div className="space-y-3">
                {devPlans.slice(0, 3).map((plan) => (
                  <Link
                    key={plan.id}
                    to={`/development/${plan.id}`}
                    className="block p-3 rounded-lg bg-secondary-50 dark:bg-secondary-900/50 hover:bg-secondary-100 dark:hover:bg-secondary-900/80 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-secondary-900 dark:text-white truncate">{plan.planName}</span>
                      <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ml-2', planStatusColors[plan.status] || planStatusColors.DRAFT)}>
                        {plan.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <ProgressBar value={plan.overallProgress} size="sm" color={plan.overallProgress >= 80 ? 'success' : 'primary'} />
                      <span className="text-xs text-secondary-500 dark:text-secondary-400 w-8 text-right">{plan.overallProgress}%</span>
                    </div>
                    <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                      {plan.careerGoal}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Goals Tab ─── */}
      {activeTab === 'goals' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">All Goals</h3>
            <div className="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400">
              <span className="flex items-center gap-1"><CheckCircleIcon className="h-3.5 w-3.5 text-green-500" /> {goalStats.completed} completed</span>
              <span className="flex items-center gap-1"><ClockIcon className="h-3.5 w-3.5 text-blue-500" /> {goalStats.active} active</span>
              {goalStats.atRisk > 0 && (
                <span className="flex items-center gap-1"><ExclamationTriangleIcon className="h-3.5 w-3.5 text-amber-500" /> {goalStats.atRisk} at risk</span>
              )}
            </div>
          </div>

          {goals.length === 0 ? (
            <EmptyState icon={FlagIcon} message="No goals found for this employee." />
          ) : (
            <div className="space-y-2">
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider border-b border-secondary-200 dark:border-secondary-700">
                <div className="col-span-4">Goal</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Priority</div>
                <div className="col-span-3">Progress</div>
                <div className="col-span-1">Due</div>
              </div>

              {goals.map((goal) => (
                <Link
                  key={goal.id}
                  to={`/goals/${goal.id}`}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 px-3 py-3 rounded-lg items-center hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{goal.title}</p>
                    {goal.type && <p className="text-xs text-secondary-400 dark:text-secondary-500">{goal.type}</p>}
                  </div>
                  <div className="col-span-2">
                    <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', goalStatusColors[goal.status] || goalStatusColors.ACTIVE)}>
                      {goal.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-[10px] font-medium',
                      goal.priority === 'HIGH' || goal.priority === 'CRITICAL'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        : goal.priority === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                    )}>
                      {goal.priority}
                    </span>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <ProgressBar value={goal.progress} size="sm" color={goal.progress >= 75 ? 'success' : goal.progress >= 40 ? 'primary' : 'warning'} />
                    <span className="text-xs text-secondary-500 dark:text-secondary-400 w-8 text-right">{goal.progress}%</span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-xs text-secondary-500 dark:text-secondary-400">
                      {goal.dueDate ? format(new Date(goal.dueDate), 'MMM d') : '--'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Reviews Tab ─── */}
      {activeTab === 'reviews' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Review History</h3>

          {!Array.isArray(reviews) || reviews.length === 0 ? (
            <EmptyState icon={ClipboardDocumentCheckIcon} message="No reviews found for this employee." />
          ) : (
            <div className="space-y-3">
              {(reviews as Review[]).map((review) => (
                <Link
                  key={review.id}
                  to={`/reviews/${review.id}`}
                  className="block p-4 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-secondary-900 dark:text-white">
                          {review.type} Review
                        </h4>
                        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', reviewStatusColors[review.status] || reviewStatusColors.NOT_STARTED)}>
                          {review.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      {review.cycle && (
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                          {review.cycle.name}
                        </p>
                      )}
                      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                        Reviewer: {review.reviewer.firstName} {review.reviewer.lastName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      {review.overallRating ? (
                        <div>
                          <StarRating value={review.overallRating} />
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                            {review.overallRating}/5
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-secondary-400 dark:text-secondary-500">No rating yet</p>
                      )}
                      {review.submittedAt && (
                        <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                          {format(new Date(review.submittedAt), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  {review.summary && (
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-2 line-clamp-2">{review.summary}</p>
                  )}
                  {review.strengths && review.strengths.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {review.strengths.slice(0, 4).map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          {s}
                        </span>
                      ))}
                      {review.strengths.length > 4 && (
                        <span className="text-[10px] text-secondary-400 self-center">+{review.strengths.length - 4} more</span>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Feedback Tab ─── */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Feedback Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Received" value={feedbackStats.total} icon={ChatBubbleLeftRightIcon} color="info" />
            <StatCard label="Praise" value={feedbackStats.praise} icon={HandThumbUpIcon} color="success" />
            <StatCard label="Constructive" value={feedbackStats.constructive} icon={ArrowTrendingUpIcon} color="warning" />
            <StatCard
              label="Sentiment"
              value={feedbackStats.avgSentiment > 0 ? 'Positive' : feedbackStats.avgSentiment < 0 ? 'Negative' : 'Neutral'}
              icon={feedbackStats.avgSentiment >= 0 ? CheckCircleIcon : ExclamationTriangleIcon}
              color={feedbackStats.avgSentiment > 0 ? 'success' : feedbackStats.avgSentiment < 0 ? 'danger' : 'info'}
            />
          </div>

          {/* Feedback List */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">All Feedback</h3>

            {feedbackItems.length === 0 ? (
              <EmptyState icon={ChatBubbleLeftRightIcon} message="No feedback received yet." />
            ) : (
              <div className="space-y-3">
                {feedbackItems.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-lg border border-secondary-200 dark:border-secondary-700"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', feedbackTypeColors[fb.type] || feedbackTypeColors.PRAISE)}>
                        {fb.type}
                      </span>
                      {fb.visibility && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400">
                          {fb.visibility}
                        </span>
                      )}
                      <span className="text-xs text-secondary-400 dark:text-secondary-500 ml-auto">
                        {format(new Date(fb.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-secondary-700 dark:text-secondary-300">{fb.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-secondary-400 dark:text-secondary-500">
                        From: {fb.isAnonymous ? 'Anonymous' : fb.fromUser ? `${fb.fromUser.firstName} ${fb.fromUser.lastName}` : 'Unknown'}
                      </span>
                      {fb.tags && fb.tags.length > 0 && (
                        <div className="flex gap-1">
                          {fb.tags.map((tag, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {fb.isAcknowledged ? (
                        <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
                          <CheckCircleIcon className="h-3 w-3" /> Acknowledged
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-secondary-400 dark:text-secondary-500">
                          <ClockIcon className="h-3 w-3" /> Pending acknowledgment
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Development Tab ─── */}
      {activeTab === 'development' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Development Plans</h3>
            <Link to="/development" className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
              Manage Plans
            </Link>
          </div>

          {devPlans.length === 0 ? (
            <EmptyState icon={AcademicCapIcon} message="No development plans created yet." />
          ) : (
            <div className="space-y-4">
              {devPlans.map((plan) => (
                <Link
                  key={plan.id}
                  to={`/development/${plan.id}`}
                  className="block p-4 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">{plan.planName}</h4>
                        <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium', planStatusColors[plan.status] || planStatusColors.DRAFT)}>
                          {plan.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{plan.careerGoal}</p>
                    </div>
                    <span className="text-lg font-bold text-secondary-900 dark:text-white">{plan.overallProgress}%</span>
                  </div>

                  <ProgressBar value={plan.overallProgress} color={plan.overallProgress >= 80 ? 'success' : 'primary'} />

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-secondary-500 dark:text-secondary-400">
                    {plan.targetRole && (
                      <span className="flex items-center gap-1">
                        <BriefcaseIcon className="h-3.5 w-3.5" />
                        Target: {plan.targetRole}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CalendarDaysIcon className="h-3.5 w-3.5" />
                      {format(new Date(plan.startDate), 'MMM d')} - {format(new Date(plan.targetCompletionDate), 'MMM d, yyyy')}
                    </span>
                    <span>{plan.duration} months</span>
                    <span>{plan.activities?.length || 0} activities</span>
                  </div>

                  {plan.developmentAreas && plan.developmentAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {plan.developmentAreas.slice(0, 5).map((area, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                          {area}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Evidence Tab ─── */}
      {activeTab === 'evidence' && (
        <div className="space-y-6">
          {/* Evidence Summary Cards */}
          {evidenceSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Evidence" value={evidenceSummary.total} icon={DocumentTextIcon} color="info" />
              <StatCard
                label="Verified"
                value={evidenceSummary.byStatus?.VERIFIED ?? 0}
                icon={ShieldCheckIcon}
                color="success"
              />
              <StatCard
                label="Pending"
                value={evidenceSummary.byStatus?.PENDING ?? 0}
                icon={ClockIcon}
                color="warning"
              />
              <StatCard
                label="Types"
                value={evidenceSummary.byType ? Object.keys(evidenceSummary.byType).length : 0}
                icon={LinkIcon}
                color="primary"
              />
            </div>
          )}

          {/* Evidence List */}
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Evidence Items</h3>

            {evidenceItems.length === 0 ? (
              <EmptyState icon={DocumentTextIcon} message="No evidence items found." />
            ) : (
              <div className="space-y-2">
                {/* Table header */}
                <div className="hidden md:grid md:grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider border-b border-secondary-200 dark:border-secondary-700">
                  <div className="col-span-1">Type</div>
                  <div className="col-span-4">Title</div>
                  <div className="col-span-2">Source</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-3">Date</div>
                </div>

                {evidenceItems.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-3 py-3 rounded-lg items-center hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                  >
                    <div className="col-span-1">
                      <span className={clsx('inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase', evidenceTypeColors[evidence.type] || 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300')}>
                        {evidence.type}
                      </span>
                    </div>
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{evidence.title}</p>
                      {evidence.description && (
                        <p className="text-xs text-secondary-400 dark:text-secondary-500 truncate">{evidence.description}</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs text-secondary-600 dark:text-secondary-400">{evidence.source}</span>
                    </div>
                    <div className="col-span-2">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-medium',
                        evidence.status === 'VERIFIED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : evidence.status === 'ARCHIVED'
                          ? 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      )}>
                        {evidence.status}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center justify-between">
                      <span className="text-xs text-secondary-500 dark:text-secondary-400">
                        {format(new Date(evidence.createdAt), 'MMM d, yyyy')}
                      </span>
                      {evidence.url && (
                        <a
                          href={evidence.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
