import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  StarIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  AdjustmentsHorizontalIcon,
  ShieldCheckIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import {
  reviewsApi,
  usersApi,
  type ReviewCycle,
  type Review,
  type User,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Types local to this page
// ---------------------------------------------------------------------------

interface CompetencyRating {
  competency: string;
  rating: number;
  comments: string;
}

interface ReviewerSubmission {
  reviewerId: string;
  reviewerName: string;
  type: 'SELF' | 'MANAGER' | 'PEER';
  status: string;
  overallRating: number | null;
  competencies: CompetencyRating[];
  summary?: string;
  submittedAt?: string;
}

interface EmployeeReviewSummary {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  department: string;
  submissions: ReviewerSubmission[];
  completionPercent: number;
  status: string;
  computedRating: number | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COMPETENCY_KEYS = [
  'competencies',
  'collaboration',
  'initiative',
] as const;

const COMPETENCY_LABELS: Record<string, string> = {
  competencies: 'Core Competencies',
  collaboration: 'Collaboration & Teamwork',
  initiative: 'Initiative & Proactivity',
};

function extractCompetencies(content: Record<string, unknown> | undefined): CompetencyRating[] {
  if (!content) return [];
  return COMPETENCY_KEYS.map((key) => ({
    competency: COMPETENCY_LABELS[key] || key,
    rating: typeof content[key] === 'number' ? (content[key] as number) : 0,
    comments:
      typeof content[`${key}_comments`] === 'string'
        ? (content[`${key}_comments`] as string)
        : typeof content[key] === 'string'
          ? (content[key] as string)
          : '',
  }));
}

function classifyReviewType(review: Review): 'SELF' | 'MANAGER' | 'PEER' {
  if (review.reviewee.id === review.reviewer.id) return 'SELF';
  if (review.type === 'SELF') return 'SELF';
  if (review.type === 'MANAGER' || review.type === 'UPWARD') return 'MANAGER';
  return 'PEER';
}

function buildEmployeeSummaries(reviews: Review[]): EmployeeReviewSummary[] {
  const byEmployee = new Map<string, Review[]>();
  for (const r of reviews) {
    const key = r.reviewee.id;
    if (!byEmployee.has(key)) byEmployee.set(key, []);
    byEmployee.get(key)!.push(r);
  }

  const summaries: EmployeeReviewSummary[] = [];

  byEmployee.forEach((empReviews, employeeId) => {
    const first = empReviews[0];
    const submissions: ReviewerSubmission[] = empReviews.map((r) => ({
      reviewerId: r.reviewer.id,
      reviewerName: `${r.reviewer.firstName} ${r.reviewer.lastName}`,
      type: classifyReviewType(r),
      status: r.status,
      overallRating: r.overallRating ?? null,
      competencies: extractCompetencies(r.content as Record<string, unknown> | undefined),
      summary: r.summary,
      submittedAt: r.submittedAt,
    }));

    const submitted = submissions.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'CALIBRATED' || s.status === 'FINALIZED' || s.status === 'ACKNOWLEDGED'
    );
    const completionPercent =
      submissions.length > 0 ? Math.round((submitted.length / submissions.length) * 100) : 0;

    const ratingsWithValues = submitted.filter((s) => s.overallRating !== null);
    const computedRating =
      ratingsWithValues.length > 0
        ? parseFloat(
            (
              ratingsWithValues.reduce((acc, s) => acc + (s.overallRating ?? 0), 0) /
              ratingsWithValues.length
            ).toFixed(1)
          )
        : null;

    // Determine overall employee status
    let status = 'PENDING';
    if (completionPercent === 100) status = 'COMPLETE';
    else if (completionPercent > 0) status = 'IN_PROGRESS';

    summaries.push({
      employeeId,
      employeeName: `${first.reviewee.firstName} ${first.reviewee.lastName}`,
      jobTitle: first.reviewee.jobTitle || 'Employee',
      department: '', // Reviews don't carry department info
      submissions,
      completionPercent,
      status,
      computedRating,
    });
  });

  return summaries.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

function getRatingColor(rating: number): string {
  if (rating >= 4.5) return 'text-success-500';
  if (rating >= 3.5) return 'text-primary-500';
  if (rating >= 2.5) return 'text-warning-500';
  if (rating >= 1.5) return 'text-orange-500';
  return 'text-danger-500';
}

function getRatingBg(rating: number): string {
  if (rating >= 4.5) return 'bg-success-500';
  if (rating >= 3.5) return 'bg-primary-500';
  if (rating >= 2.5) return 'bg-warning-500';
  if (rating >= 1.5) return 'bg-orange-500';
  return 'bg-danger-500';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        star <= Math.round(rating) ? (
          <StarSolidIcon key={star} className={clsx(sizeClass, 'text-warning-400')} />
        ) : (
          <StarIcon key={star} className={clsx(sizeClass, 'text-secondary-400 dark:text-secondary-600')} />
        )
      ))}
    </div>
  );
}

function RatingBar({ rating, max = 5 }: { rating: number; max?: number }) {
  const percent = (rating / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-secondary-200 dark:bg-secondary-700 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all', getRatingBg(rating))}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={clsx('text-sm font-semibold tabular-nums', getRatingColor(rating))}>
        {(rating ?? 0).toFixed(1)}
      </span>
    </div>
  );
}

function CompetencyColumn({
  title,
  borderColor,
  bgAccent,
  submissions,
}: {
  title: string;
  borderColor: string;
  bgAccent: string;
  submissions: ReviewerSubmission[];
}) {
  // Aggregate competencies: average across all submissions of this type
  const competencyMap = new Map<string, { totalRating: number; count: number; comments: string[] }>();
  for (const sub of submissions) {
    for (const comp of sub.competencies) {
      if (!competencyMap.has(comp.competency)) {
        competencyMap.set(comp.competency, { totalRating: 0, count: 0, comments: [] });
      }
      const entry = competencyMap.get(comp.competency)!;
      if (comp.rating > 0) {
        entry.totalRating += comp.rating;
        entry.count++;
      }
      if (comp.comments) entry.comments.push(comp.comments);
    }
  }

  const hasData = submissions.length > 0 && submissions.some((s) =>
    s.status === 'SUBMITTED' || s.status === 'CALIBRATED' || s.status === 'FINALIZED' || s.status === 'ACKNOWLEDGED'
  );

  return (
    <div className={clsx('border-l-4 rounded-xl p-4', borderColor, 'bg-white dark:bg-secondary-800 shadow-sm border border-secondary-200 dark:border-secondary-700')}>
      <h4 className={clsx('text-sm font-semibold mb-3', bgAccent)}>{title}</h4>
      {!hasData ? (
        <div className="text-center py-6">
          <ClockIcon className="h-8 w-8 mx-auto text-secondary-400 dark:text-secondary-600 mb-2" />
          <p className="text-xs text-secondary-500 dark:text-secondary-400">Not yet submitted</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(competencyMap.entries()).map(([name, data]) => {
            const avg = data.count > 0 ? data.totalRating / data.count : 0;
            return (
              <div key={name}>
                <p className="text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">{name}</p>
                {avg > 0 ? (
                  <>
                    <RatingBar rating={avg} />
                    <RatingStars rating={avg} />
                  </>
                ) : (
                  <p className="text-xs text-secondary-400 italic">No rating</p>
                )}
                {data.comments.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {data.comments.slice(0, 2).map((c, i) => (
                      <p key={i} className="text-xs text-secondary-500 dark:text-secondary-400 italic">
                        &ldquo;{c}&rdquo;
                      </p>
                    ))}
                    {data.comments.length > 2 && (
                      <p className="text-xs text-secondary-400">+{data.comments.length - 2} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Overall summary from submissions */}
          {submissions.filter((s) => s.summary).length > 0 && (
            <div className="pt-3 border-t border-secondary-100 dark:border-secondary-700">
              <p className="text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1">Summary</p>
              {submissions
                .filter((s) => s.summary)
                .slice(0, 2)
                .map((s, i) => (
                  <p key={i} className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                    {s.summary}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ModeratorDashboardPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // State
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETE'>('ALL');
  const [showCalibrateModal, setShowCalibrateModal] = useState(false);
  const [showSendBackModal, setShowSendBackModal] = useState(false);
  const [calibrateRating, setCalibrateRating] = useState(3);
  const [calibrateJustification, setCalibrateJustification] = useState('');
  const [sendBackNotes, setSendBackNotes] = useState('');

  // Queries
  const { data: cycles, isLoading: loadingCycles } = useQuery({
    queryKey: ['review-cycles'],
    queryFn: () => reviewsApi.listCycles({}),
  });

  const activeCycleId = selectedCycleId || (cycles && cycles.length > 0 ? cycles[0].id : '');

  const { data: cycleDetail } = useQuery({
    queryKey: ['review-cycle', activeCycleId],
    queryFn: () => reviewsApi.getCycle(activeCycleId),
    enabled: !!activeCycleId,
  });

  const { data: allReviews, isLoading: loadingReviews } = useQuery({
    queryKey: ['moderator-reviews', activeCycleId],
    queryFn: () => reviewsApi.listMyReviews({ cycleId: activeCycleId }),
    enabled: !!activeCycleId,
  });

  // Build employee summaries from reviews
  const employeeSummaries = useMemo(() => {
    if (!allReviews) return [];
    return buildEmployeeSummaries(allReviews);
  }, [allReviews]);

  // Filtered employee list
  const filteredEmployees = useMemo(() => {
    let list = employeeSummaries;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          e.employeeName.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter((e) => e.status === statusFilter);
    }
    return list;
  }, [employeeSummaries, searchQuery, statusFilter]);

  // Selected employee
  const selectedEmployee = useMemo(
    () => employeeSummaries.find((e) => e.employeeId === selectedEmployeeId) ?? null,
    [employeeSummaries, selectedEmployeeId]
  );

  // Segregated submissions for the selected employee
  const selfSubmissions = useMemo(
    () => selectedEmployee?.submissions.filter((s) => s.type === 'SELF') ?? [],
    [selectedEmployee]
  );
  const managerSubmissions = useMemo(
    () => selectedEmployee?.submissions.filter((s) => s.type === 'MANAGER') ?? [],
    [selectedEmployee]
  );
  const peerSubmissions = useMemo(
    () => selectedEmployee?.submissions.filter((s) => s.type === 'PEER') ?? [],
    [selectedEmployee]
  );

  // Compiled summary data
  const compiledData = useMemo(() => {
    if (!selectedEmployee) return null;

    const submitted = selectedEmployee.submissions.filter(
      (s) =>
        s.overallRating !== null &&
        (s.status === 'SUBMITTED' || s.status === 'CALIBRATED' || s.status === 'FINALIZED' || s.status === 'ACKNOWLEDGED')
    );

    if (submitted.length === 0) return null;

    // Weighted average: Self 20%, Manager 50%, Peer 30%
    const weightMap: Record<string, number> = { SELF: 0.2, MANAGER: 0.5, PEER: 0.3 };
    let weightedSum = 0;
    let weightTotal = 0;

    for (const s of submitted) {
      const w = weightMap[s.type] || 0.2;
      weightedSum += (s.overallRating ?? 0) * w;
      weightTotal += w;
    }

    const weightedAvg = weightTotal > 0 ? weightedSum / weightTotal : 0;

    // Rating distribution
    const distribution = [0, 0, 0, 0, 0];
    for (const s of submitted) {
      const r = Math.round(s.overallRating ?? 0);
      if (r >= 1 && r <= 5) distribution[r - 1]++;
    }

    // Gap analysis: difference between self vs manager/peer averages
    const selfAvg =
      selfSubmissions.filter((s) => s.overallRating).length > 0
        ? selfSubmissions.reduce((a, s) => a + (s.overallRating ?? 0), 0) /
          selfSubmissions.filter((s) => s.overallRating).length
        : null;
    const managerAvg =
      managerSubmissions.filter((s) => s.overallRating).length > 0
        ? managerSubmissions.reduce((a, s) => a + (s.overallRating ?? 0), 0) /
          managerSubmissions.filter((s) => s.overallRating).length
        : null;
    const peerAvg =
      peerSubmissions.filter((s) => s.overallRating).length > 0
        ? peerSubmissions.reduce((a, s) => a + (s.overallRating ?? 0), 0) /
          peerSubmissions.filter((s) => s.overallRating).length
        : null;

    const gaps: { label: string; diff: number }[] = [];
    if (selfAvg !== null && managerAvg !== null) {
      gaps.push({ label: 'Self vs Manager', diff: parseFloat((selfAvg - managerAvg).toFixed(1)) });
    }
    if (selfAvg !== null && peerAvg !== null) {
      gaps.push({ label: 'Self vs Peers', diff: parseFloat((selfAvg - peerAvg).toFixed(1)) });
    }
    if (managerAvg !== null && peerAvg !== null) {
      gaps.push({ label: 'Manager vs Peers', diff: parseFloat((managerAvg - peerAvg).toFixed(1)) });
    }

    return {
      weightedAvg: parseFloat((weightedAvg ?? 0).toFixed(2)),
      distribution,
      gaps,
      selfAvg,
      managerAvg,
      peerAvg,
    };
  }, [selectedEmployee, selfSubmissions, managerSubmissions, peerSubmissions]);

  // Team-wide distribution chart data
  const teamDistributionData = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    for (const emp of employeeSummaries) {
      if (emp.computedRating !== null) {
        const r = Math.round(emp.computedRating);
        if (r >= 1 && r <= 5) dist[r - 1]++;
      }
    }
    return [
      { rating: '1 Star', count: dist[0], fill: '#ef4444' },
      { rating: '2 Stars', count: dist[1], fill: '#f97316' },
      { rating: '3 Stars', count: dist[2], fill: '#eab308' },
      { rating: '4 Stars', count: dist[3], fill: '#22c55e' },
      { rating: '5 Stars', count: dist[4], fill: '#3b82f6' },
    ];
  }, [employeeSummaries]);

  // Compiled summary per-reviewer distribution chart
  const compiledDistributionData = useMemo(() => {
    if (!compiledData) return [];
    return compiledData.distribution.map((count, i) => ({
      rating: `${i + 1} Star`,
      count,
      fill: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'][i],
    }));
  }, [compiledData]);

  // Mutations
  const calibrateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) return;
      // Use the first review submission for the employee to update
      const firstSubmission = selectedEmployee.submissions[0];
      if (!firstSubmission) return;
      return reviewsApi.submitReview(firstSubmission.reviewerId, {
        overallRating: calibrateRating,
        content: { calibrated: true, justification: calibrateJustification },
        summary: `Calibrated to ${calibrateRating}: ${calibrateJustification}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-reviews'] });
      setShowCalibrateModal(false);
      setCalibrateJustification('');
      toast.success('Rating calibrated successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to calibrate rating');
    },
  });

  const sendBackMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) return;
      // Conceptually sends back for revision; call update on the first submission
      const firstSubmission = selectedEmployee.submissions[0];
      if (!firstSubmission) return;
      return reviewsApi.saveDraft(firstSubmission.reviewerId, {
        content: { sentBack: true, revisionNotes: sendBackNotes },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-reviews'] });
      setShowSendBackModal(false);
      setSendBackNotes('');
      toast.success('Sent back for revision');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send back');
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) return;
      const firstSubmission = selectedEmployee.submissions[0];
      if (!firstSubmission) return;
      return reviewsApi.acknowledgeReview(firstSubmission.reviewerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moderator-reviews'] });
      toast.success('Review finalized');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to finalize review');
    },
  });

  // Loading state
  const isLoading = loadingCycles || loadingReviews;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Moderator Dashboard
          </h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Review and moderate employee performance evaluations across reviewer types
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="h-8 w-8 text-primary-500" />
        </div>
      </div>

      {/* Review Cycle Selector */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300 whitespace-nowrap">
            Review Cycle:
          </label>
          <div className="relative flex-1 max-w-sm">
            <select
              value={activeCycleId}
              onChange={(e) => {
                setSelectedCycleId(e.target.value);
                setSelectedEmployeeId(null);
              }}
              className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white pr-8"
            >
              {!cycles || cycles.length === 0 ? (
                <option value="">No review cycles available</option>
              ) : (
                cycles.map((cycle: ReviewCycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name} ({cycle.status})
                  </option>
                ))
              )}
            </select>
          </div>
          {cycleDetail && (
            <span
              className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium',
                cycleDetail.status === 'ACTIVE'
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/50 dark:text-primary-300'
                  : cycleDetail.status === 'COMPLETED'
                    ? 'bg-success-100 text-success-800 dark:bg-success-900/50 dark:text-success-300'
                    : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200'
              )}
            >
              {cycleDetail.status}
            </span>
          )}
        </div>
      </div>

      {/* Main Layout: Employee List + Main Panel */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="flex gap-6" style={{ minHeight: '70vh' }}>
          {/* Left Panel: Employee List (30%) */}
          <div className="w-[30%] flex-shrink-0 flex flex-col bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
            {/* Search & Filters */}
            <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employees..."
                  className="input pl-9 text-sm dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                />
              </div>
              <div className="flex gap-1">
                {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETE'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={clsx(
                      'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                      statusFilter === s
                        ? 'bg-primary-600 text-white'
                        : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-600'
                    )}
                  >
                    {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Employee List */}
            <div className="flex-1 overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <UserIcon className="h-10 w-10 mx-auto text-secondary-300 dark:text-secondary-600 mb-2" />
                  <p className="text-sm text-secondary-500 dark:text-secondary-400">
                    No employees found
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-secondary-100 dark:divide-secondary-700">
                  {filteredEmployees.map((emp) => (
                    <button
                      key={emp.employeeId}
                      onClick={() => setSelectedEmployeeId(emp.employeeId)}
                      className={clsx(
                        'w-full text-left px-4 py-3 transition-colors hover:bg-secondary-50 dark:hover:bg-secondary-700/50',
                        selectedEmployeeId === emp.employeeId &&
                          'bg-primary-50 dark:bg-primary-900/20 border-l-3 border-primary-500'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                            {emp.employeeName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
                            {emp.employeeName}
                          </p>
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 break-words">
                            {emp.jobTitle}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {emp.status === 'COMPLETE' ? (
                            <CheckCircleIcon className="h-4 w-4 text-success-500" />
                          ) : emp.status === 'IN_PROGRESS' ? (
                            <ClockIcon className="h-4 w-4 text-warning-500" />
                          ) : (
                            <ExclamationTriangleIcon className="h-4 w-4 text-secondary-400" />
                          )}
                          <span className="text-2xs font-medium text-secondary-500 dark:text-secondary-400">
                            {emp.completionPercent}%
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Main Content (70%) */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            {!selectedEmployee ? (
              <div className="flex items-center justify-center h-full bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700">
                <div className="text-center py-20 px-8">
                  <ChartBarIcon className="h-16 w-16 mx-auto text-secondary-300 dark:text-secondary-600 mb-4" />
                  <h3 className="text-lg font-medium text-secondary-700 dark:text-secondary-300">
                    Select an employee
                  </h3>
                  <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400 max-w-md">
                    Choose an employee from the list to view their segregated review inputs
                    from self-assessment, manager, and peer reviewers.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* a. Review Summary Card */}
                <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary-700 dark:text-primary-300">
                          {selectedEmployee.employeeName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
                          {selectedEmployee.employeeName}
                        </h2>
                        <p className="text-sm text-secondary-500 dark:text-secondary-400">
                          {selectedEmployee.jobTitle}
                        </p>
                        <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
                          {cycleDetail?.name || 'Review Cycle'} &middot;{' '}
                          <span
                            className={clsx(
                              'font-medium',
                              selectedEmployee.status === 'COMPLETE'
                                ? 'text-success-600 dark:text-success-400'
                                : selectedEmployee.status === 'IN_PROGRESS'
                                  ? 'text-warning-600 dark:text-warning-400'
                                  : 'text-secondary-500'
                            )}
                          >
                            {selectedEmployee.completionPercent}% complete
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {selectedEmployee.computedRating !== null && (
                        <div>
                          <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                            Average Rating
                          </p>
                          <p
                            className={clsx(
                              'text-3xl font-bold',
                              getRatingColor(selectedEmployee.computedRating)
                            )}
                          >
                            {selectedEmployee.computedRating}
                          </p>
                          <RatingStars rating={selectedEmployee.computedRating} size="md" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* b. Segregated Inputs Section */}
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                    Segregated Review Inputs
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <CompetencyColumn
                      title={`Self-Assessment (${selfSubmissions.length})`}
                      borderColor="border-l-blue-500"
                      bgAccent="text-blue-600 dark:text-blue-400"
                      submissions={selfSubmissions}
                    />
                    <CompetencyColumn
                      title={`Manager Review (${managerSubmissions.length})`}
                      borderColor="border-l-green-500"
                      bgAccent="text-green-600 dark:text-green-400"
                      submissions={managerSubmissions}
                    />
                    <CompetencyColumn
                      title={`Peer Feedback (${peerSubmissions.length})`}
                      borderColor="border-l-purple-500"
                      bgAccent="text-purple-600 dark:text-purple-400"
                      submissions={peerSubmissions}
                    />
                  </div>
                </div>

                {/* c. Compiled Summary */}
                {compiledData && (
                  <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6 space-y-6">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                      Compiled Summary
                    </h3>

                    {/* Weighted Average */}
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-xs text-secondary-500 dark:text-secondary-400 mb-1">
                          Weighted Average
                        </p>
                        <p className={clsx('text-4xl font-bold', getRatingColor(compiledData.weightedAvg))}>
                          {compiledData.weightedAvg}
                        </p>
                        <RatingStars rating={compiledData.weightedAvg} size="md" />
                        <p className="text-2xs text-secondary-400 dark:text-secondary-500 mt-1">
                          Self 20% / Manager 50% / Peer 30%
                        </p>
                      </div>
                      <div className="flex-1 border-l border-secondary-200 dark:border-secondary-700 pl-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-xs text-blue-500 font-medium">Self</p>
                            <p className="text-xl font-bold text-secondary-900 dark:text-white">
                              {compiledData.selfAvg?.toFixed(1) ?? '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-green-500 font-medium">Manager</p>
                            <p className="text-xl font-bold text-secondary-900 dark:text-white">
                              {compiledData.managerAvg?.toFixed(1) ?? '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-purple-500 font-medium">Peers</p>
                            <p className="text-xl font-bold text-secondary-900 dark:text-white">
                              {compiledData.peerAvg?.toFixed(1) ?? '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rating Distribution Chart */}
                    <div>
                      <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                        Rating Distribution Across Reviewers
                      </h4>
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={compiledDistributionData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                            <XAxis
                              dataKey="rating"
                              tick={{ fill: '#9ca3af', fontSize: 12 }}
                              axisLine={{ stroke: '#4b5563' }}
                            />
                            <YAxis
                              tick={{ fill: '#9ca3af', fontSize: 12 }}
                              axisLine={{ stroke: '#4b5563' }}
                              allowDecimals={false}
                            />
                            <Tooltip
                              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                              contentStyle={{
                                background: 'rgba(15, 23, 42, 0.80)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                border: '1px solid rgba(148, 163, 184, 0.15)',
                                borderRadius: '0.75rem',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                                fontSize: '0.75rem',
                                color: '#f1f5f9',
                              }}
                              labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                              itemStyle={{ color: '#e2e8f0' }}
                            />
                            <Bar
                              dataKey="count"
                              radius={[4, 4, 0, 0]}
                              fill="#6366f1"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Gap Analysis */}
                    {compiledData.gaps.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                          Gap Analysis
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {compiledData.gaps.map((gap) => (
                            <div
                              key={gap.label}
                              className={clsx(
                                'rounded-lg p-3 border',
                                Math.abs(gap.diff) >= 1.5
                                  ? 'border-danger-300 bg-danger-50 dark:border-danger-800 dark:bg-danger-900/20'
                                  : Math.abs(gap.diff) >= 0.75
                                    ? 'border-warning-300 bg-warning-50 dark:border-warning-800 dark:bg-warning-900/20'
                                    : 'border-secondary-200 bg-secondary-50 dark:border-secondary-700 dark:bg-secondary-900/30'
                              )}
                            >
                              <p className="text-xs font-medium text-secondary-600 dark:text-secondary-400">
                                {gap.label}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span
                                  className={clsx(
                                    'text-lg font-bold',
                                    gap.diff > 0
                                      ? 'text-danger-600 dark:text-danger-400'
                                      : gap.diff < 0
                                        ? 'text-primary-600 dark:text-primary-400'
                                        : 'text-secondary-600 dark:text-secondary-300'
                                  )}
                                >
                                  {gap.diff > 0 ? '+' : ''}
                                  {gap.diff}
                                </span>
                                {Math.abs(gap.diff) >= 1.5 && (
                                  <ExclamationTriangleIcon className="h-4 w-4 text-danger-500" />
                                )}
                              </div>
                              <p className="text-2xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                                {Math.abs(gap.diff) >= 1.5
                                  ? 'Significant gap detected'
                                  : Math.abs(gap.diff) >= 0.75
                                    ? 'Moderate difference'
                                    : 'Within expected range'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* d. Actions */}
                <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
                  <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-4">
                    Moderation Actions
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        setCalibrateRating(
                          selectedEmployee.computedRating
                            ? Math.round(selectedEmployee.computedRating)
                            : 3
                        );
                        setShowCalibrateModal(true);
                      }}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
                      Calibrate Rating
                    </button>
                    <button
                      onClick={() => setShowSendBackModal(true)}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-warning-600 text-white text-sm font-medium hover:bg-warning-700 transition-colors"
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-2" />
                      Send Back for Revision
                    </button>
                    <button
                      onClick={() => finalizeMutation.mutate()}
                      disabled={finalizeMutation.isPending}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-success-600 text-white text-sm font-medium hover:bg-success-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-2" />
                      {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize Review'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Team-Wide Rating Distribution (bottom) */}
      {employeeSummaries.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-1">
            Team Rating Distribution
          </h3>
          <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
            Distribution of average ratings across all employees in this review cycle.
            Helps identify potential bias patterns.
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamDistributionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="rating"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={{ stroke: '#4b5563' }}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                  contentStyle={{
                    background: 'rgba(15, 23, 42, 0.80)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(148, 163, 184, 0.15)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                    fontSize: '0.75rem',
                    color: '#f1f5f9',
                  }}
                  labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  fill="#8b5cf6"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Calibrate Rating Modal */}
      {/* ----------------------------------------------------------------- */}
      {showCalibrateModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCalibrateModal(false)}
            />
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-secondary-200/50 dark:border-secondary-700/50 animate-scale-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Calibrate Rating
                </h2>
                <button
                  onClick={() => setShowCalibrateModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
                    Employee: <span className="font-medium text-secondary-900 dark:text-white">{selectedEmployee.employeeName}</span>
                  </p>
                  {selectedEmployee.computedRating !== null && (
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      Current avg: <span className="font-bold">{selectedEmployee.computedRating}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2 block">
                    Final Calibrated Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCalibrateRating(r)}
                        className={clsx(
                          'w-12 h-12 rounded-lg font-bold text-lg transition-colors',
                          calibrateRating === r
                            ? 'bg-primary-600 text-white shadow-lg'
                            : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2 block">
                    Justification (required)
                  </label>
                  <textarea
                    value={calibrateJustification}
                    onChange={(e) => setCalibrateJustification(e.target.value)}
                    rows={4}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    placeholder="Explain the rationale for this calibration adjustment..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowCalibrateModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!calibrateJustification.trim()) {
                        toast.error('Please provide a justification');
                        return;
                      }
                      calibrateMutation.mutate();
                    }}
                    disabled={calibrateMutation.isPending}
                    className="btn-primary"
                  >
                    {calibrateMutation.isPending ? 'Applying...' : 'Apply Calibration'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Send Back for Revision Modal */}
      {/* ----------------------------------------------------------------- */}
      {showSendBackModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSendBackModal(false)}
            />
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-secondary-200/50 dark:border-secondary-700/50 animate-scale-in">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Send Back for Revision
                </h2>
                <button
                  onClick={() => setShowSendBackModal(false)}
                  className="p-1 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5">
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Send the review for <span className="font-medium text-secondary-900 dark:text-white">{selectedEmployee.employeeName}</span> back
                  to the reviewer(s) for additional input or corrections.
                </p>

                <div>
                  <label className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2 block">
                    Revision Notes
                  </label>
                  <textarea
                    value={sendBackNotes}
                    onChange={(e) => setSendBackNotes(e.target.value)}
                    rows={4}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    placeholder="Describe what needs to be revised or additional information needed..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowSendBackModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (!sendBackNotes.trim()) {
                        toast.error('Please provide revision notes');
                        return;
                      }
                      sendBackMutation.mutate();
                    }}
                    disabled={sendBackMutation.isPending}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-warning-600 text-white text-sm font-medium hover:bg-warning-700 transition-colors disabled:opacity-50"
                  >
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    {sendBackMutation.isPending ? 'Sending...' : 'Send Back'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
