import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  UserGroupIcon,
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  MegaphoneIcon,
  CheckCircleIcon as CheckCircleOutline,
  ClockIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import {
  StarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';

import {
  api,
  usersApi,
  goalsApi,
  reviewsApi,
  feedbackApi,
  oneOnOnesApi,
  pipApi,
  performanceMathApi,
  licenseApi,
  type User,
  type Goal,
  type Review,
  type Feedback,
  type OneOnOne,
  type PIP,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DateRange = 'week' | 'month' | 'quarter';
type SortField = 'name' | 'performance' | 'goalProgress';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function avatarInitials(first: string, last: string) {
  return `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();
}

function progressColor(pct: number): string {
  if (pct >= 70) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 40) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function progressBarColor(pct: number): string {
  if (pct >= 70) return 'bg-emerald-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function statusDot(score: number) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  return <span className={clsx('inline-block w-2.5 h-2.5 rounded-full', color)} />;
}

function urgencyBadge(kind: 'overdue' | 'today' | 'upcoming') {
  const map = {
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    today: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    upcoming: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  const labels = { overdue: 'Overdue', today: 'Due Today', upcoming: 'Upcoming' };
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', map[kind])}>
      {labels[kind]}
    </span>
  );
}

function miniStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          className={clsx(
            'w-3.5 h-3.5',
            i <= Math.round(rating) ? 'text-amber-400' : 'text-secondary-300 dark:text-secondary-600',
          )}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Card wrapper
// ---------------------------------------------------------------------------

function SectionCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shadow-sm overflow-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function ManagerDashboardPage() {
  const { user } = useAuthStore();
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [sortField, setSortField] = useState<SortField>('name');

  // ── Data queries ────────────────────────────────────────────────────────

  const { data: directReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ['manager-direct-reports'],
    queryFn: () => usersApi.getMyReports(),
    staleTime: 60_000,
  });

  const { data: goalsData } = useQuery({
    queryKey: ['manager-team-goals'],
    queryFn: () => goalsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ['manager-reviews'],
    queryFn: () => reviewsApi.listMyReviews({ asReviewer: true }),
    staleTime: 60_000,
  });

  const { data: feedbackTeam } = useQuery({
    queryKey: ['manager-feedback-team'],
    queryFn: () => feedbackApi.listTeam({ limit: 50 }),
    staleTime: 60_000,
  });

  const { data: upcomingOneOnOnes } = useQuery({
    queryKey: ['manager-upcoming-1on1s'],
    queryFn: () => oneOnOnesApi.getUpcoming(),
    staleTime: 60_000,
  });

  const { data: pipsData } = useQuery({
    queryKey: ['manager-pips'],
    queryFn: () => pipApi.list({ status: 'ACTIVE', limit: 50 }),
    staleTime: 60_000,
  });

  const { data: teamAnalytics } = useQuery({
    queryKey: ['manager-team-analytics', user?.id],
    queryFn: () => performanceMathApi.getTeamAnalytics(user!.id),
    enabled: !!user?.id,
    staleTime: 120_000,
    retry: 1,
  });

  const { data: licenseInfo } = useQuery({
    queryKey: ['manager-license-info'],
    queryFn: () => licenseApi.getUsage(),
    staleTime: 120_000,
  });

  const { data: recentUploads } = useQuery({
    queryKey: ['manager-upload-history'],
    queryFn: async () => {
      const token = useAuthStore.getState().accessToken;
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
      const res = await fetch(`${API_BASE_URL}/excel-upload/history?limit=3`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      return data.data?.uploads ?? data.data ?? [];
    },
    staleTime: 60_000,
  });

  // ── Derived values ──────────────────────────────────────────────────────

  const teamSize = directReports.length;

  const allGoals: Goal[] = goalsData?.data ?? [];
  const teamGoals = allGoals.filter((g) =>
    directReports.some((r) => r.id === g.owner?.id),
  );
  const avgGoalProgress =
    teamGoals.length > 0
      ? Math.round(teamGoals.reduce((s, g) => s + g.progress, 0) / teamGoals.length)
      : 0;

  const pendingReviews: Review[] = (reviewsData ?? []).filter(
    (r: Review) => r.status === 'NOT_STARTED' || r.status === 'IN_PROGRESS',
  );

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const upcomingThisWeek = (upcomingOneOnOnes ?? []).filter((m: OneOnOne) => {
    const d = new Date(m.scheduledAt);
    return d <= endOfWeek;
  });

  const activePips = pipsData?.data ?? [];

  // Goal tracker breakdown
  const onTrackGoals = teamGoals.filter((g) => g.progress >= 60 || g.status === 'COMPLETED');
  const atRiskGoals = teamGoals.filter(
    (g) => g.progress >= 30 && g.progress < 60 && g.status !== 'COMPLETED',
  );
  const behindGoals = teamGoals.filter(
    (g) => g.progress < 30 && g.status !== 'COMPLETED',
  );
  const closestToCompletion = [...teamGoals]
    .filter((g) => g.progress < 100)
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);
  const mostAtRisk = [...teamGoals]
    .filter((g) => g.progress < 100)
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5);

  // Build action items
  type ActionItem = {
    id: string;
    icon: React.ElementType;
    iconColor: string;
    description: string;
    dueLabel: string;
    urgency: 'overdue' | 'today' | 'upcoming';
    actionLabel: string;
    actionHref: string;
  };

  const actionItems = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    pendingReviews.forEach((r) => {
      const isOverdue = r.cycle?.status === 'CLOSED';
      items.push({
        id: `review-${r.id}`,
        icon: ClipboardDocumentCheckIcon,
        iconColor: 'from-violet-500 to-purple-500',
        description: `Review pending for ${r.reviewee?.firstName} ${r.reviewee?.lastName}`,
        dueLabel: r.cycle?.name ?? 'Review cycle',
        urgency: isOverdue ? 'overdue' : 'upcoming',
        actionLabel: 'Complete Review',
        actionHref: `/reviews/${r.id}`,
      });
    });

    (upcomingOneOnOnes ?? []).slice(0, 5).forEach((m: OneOnOne) => {
      const meetDate = new Date(m.scheduledAt);
      const isToday = meetDate.toDateString() === now.toDateString();
      const isPast = meetDate < now;
      items.push({
        id: `1on1-${m.id}`,
        icon: CalendarDaysIcon,
        iconColor: 'from-teal-500 to-cyan-500',
        description: `1:1 with ${m.employee.firstName} ${m.employee.lastName}`,
        dueLabel: meetDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        urgency: isPast ? 'overdue' : isToday ? 'today' : 'upcoming',
        actionLabel: 'View Meeting',
        actionHref: `/one-on-ones/${m.id}`,
      });
    });

    activePips.forEach((p: PIP) => {
      const nextCheckIn = p.checkIns?.length
        ? undefined
        : p.startDate;
      items.push({
        id: `pip-${p.id}`,
        icon: ExclamationTriangleIcon,
        iconColor: 'from-red-500 to-orange-500',
        description: `PIP check-in due for ${p.user.firstName} ${p.user.lastName}`,
        dueLabel: p.pipTitle,
        urgency: 'upcoming',
        actionLabel: 'View PIP',
        actionHref: `/pip/${p.id}`,
      });
    });

    // Sort by urgency
    const urgencyOrder = { overdue: 0, today: 1, upcoming: 2 };
    items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);
    return items;
  }, [pendingReviews, upcomingOneOnOnes, activePips, now]);

  // Team members with performance data
  const teamMembersWithPerf = useMemo(() => {
    const memberScores = teamAnalytics?.memberZScores ?? [];
    return directReports.map((report) => {
      const scoreData = memberScores.find((m: any) => m.userId === report.id);
      const memberGoals = teamGoals.filter((g) => g.owner?.id === report.id);
      const memberGoalPct =
        memberGoals.length > 0
          ? Math.round(memberGoals.reduce((s, g) => s + g.progress, 0) / memberGoals.length)
          : 0;
      const memberReview = (reviewsData ?? []).find(
        (r: Review) => r.reviewee?.id === report.id && r.overallRating,
      );
      const memberFeedback = (feedbackTeam?.data ?? []).filter(
        (f: Feedback) => f.toUser?.id === report.id,
      );
      const feedbackScore =
        memberFeedback.length > 0
          ? Math.round(
              (memberFeedback.filter((f: Feedback) => f.type === 'PRAISE').length /
                memberFeedback.length) *
                100,
            )
          : 0;
      return {
        ...report,
        performanceScore: scoreData?.score ?? 0,
        goalProgress: memberGoalPct,
        lastRating: memberReview?.overallRating ?? 0,
        feedbackScore,
        category: scoreData?.category ?? 'average',
      };
    });
  }, [directReports, teamAnalytics, teamGoals, reviewsData, feedbackTeam]);

  const sortedTeamMembers = useMemo(() => {
    const sorted = [...teamMembersWithPerf];
    switch (sortField) {
      case 'name':
        sorted.sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
        );
        break;
      case 'performance':
        sorted.sort((a, b) => b.performanceScore - a.performanceScore);
        break;
      case 'goalProgress':
        sorted.sort((a, b) => b.goalProgress - a.goalProgress);
        break;
    }
    return sorted;
  }, [teamMembersWithPerf, sortField]);

  // Recent activity feed
  type ActivityEvent = {
    id: string;
    icon: React.ElementType;
    iconColor: string;
    title: string;
    description: string;
    timestamp: string;
  };

  const activityFeed = useMemo<ActivityEvent[]>(() => {
    const events: ActivityEvent[] = [];

    // Reviews completed
    (reviewsData ?? [])
      .filter((r: Review) => r.status === 'SUBMITTED' || r.status === 'FINALIZED')
      .slice(0, 3)
      .forEach((r: Review) => {
        events.push({
          id: `review-done-${r.id}`,
          icon: ClipboardDocumentCheckIcon,
          iconColor: 'from-violet-500 to-purple-500',
          title: 'Review completed',
          description: `Review for ${r.reviewee?.firstName} ${r.reviewee?.lastName} submitted`,
          timestamp: r.submittedAt ?? r.acknowledgedAt ?? '',
        });
      });

    // Goals achieved
    teamGoals
      .filter((g) => g.progress >= 100 || g.status === 'COMPLETED')
      .slice(0, 3)
      .forEach((g) => {
        events.push({
          id: `goal-done-${g.id}`,
          icon: FlagIcon,
          iconColor: 'from-emerald-500 to-teal-500',
          title: 'Goal achieved',
          description: `${g.owner?.firstName} ${g.owner?.lastName} completed "${g.title}"`,
          timestamp: g.dueDate ?? '',
        });
      });

    // Feedback given
    (feedbackTeam?.data ?? [])
      .slice(0, 3)
      .forEach((f: Feedback) => {
        events.push({
          id: `feedback-${f.id}`,
          icon: ChatBubbleLeftRightIcon,
          iconColor: 'from-blue-500 to-cyan-500',
          title: f.type === 'PRAISE' ? 'Recognition given' : 'Feedback shared',
          description: `${f.isAnonymous ? 'Anonymous' : f.fromUser ? `${f.fromUser.firstName} ${f.fromUser.lastName}` : 'Someone'} gave feedback to ${f.toUser.firstName} ${f.toUser.lastName}`,
          timestamp: f.createdAt,
        });
      });

    // Sort by time descending and take last 10
    events.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return events.slice(0, 10);
  }, [reviewsData, teamGoals, feedbackTeam]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8 pb-10">
      {/* ══════════════════════════ Header ══════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-white">
            Manager Dashboard
          </h1>
          <p className="mt-1 text-secondary-500 dark:text-secondary-400">
            Your team at a glance
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-1">
          {([
            ['week', 'This Week'],
            ['month', 'This Month'],
            ['quarter', 'This Quarter'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setDateRange(key)}
              className={clsx(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-colors',
                dateRange === key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════ Summary Cards ══════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Team Size */}
        <SectionCard>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 shadow">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                Team Size
              </span>
            </div>
            <p className="text-3xl font-bold text-secondary-900 dark:text-white">
              {reportsLoading ? '...' : teamSize}
            </p>
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
              Direct reports
            </p>
          </div>
        </SectionCard>

        {/* Avg Goal Progress */}
        <SectionCard>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 shadow">
                <FlagIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                Avg Goal Progress
              </span>
            </div>
            <p className={clsx('text-3xl font-bold', progressColor(avgGoalProgress))}>
              {avgGoalProgress}%
            </p>
            <div className="mt-2 h-1.5 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full transition-all duration-700', progressBarColor(avgGoalProgress))}
                style={{ width: `${avgGoalProgress}%` }}
              />
            </div>
          </div>
        </SectionCard>

        {/* Pending Reviews */}
        <SectionCard>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 shadow">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                Pending Reviews
              </span>
            </div>
            <p className="text-3xl font-bold text-secondary-900 dark:text-white">
              {pendingReviews.length}
            </p>
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
              {pendingReviews.length > 0 ? 'Needs your attention' : 'All caught up'}
            </p>
          </div>
        </SectionCard>

        {/* Upcoming 1:1s */}
        <SectionCard>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 shadow">
                <CalendarDaysIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                Upcoming 1:1s
              </span>
            </div>
            <p className="text-3xl font-bold text-secondary-900 dark:text-white">
              {upcomingThisWeek.length}
            </p>
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
              This week
            </p>
          </div>
        </SectionCard>

        {/* Active PIPs */}
        <SectionCard>
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 shadow">
                <ExclamationTriangleIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                Active PIPs
              </span>
            </div>
            <p className="text-3xl font-bold text-secondary-900 dark:text-white">
              {activePips.length}
            </p>
            <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
              Performance plans
            </p>
          </div>
        </SectionCard>
      </div>

      {/* ══════════════════════════ License & Uploads Row ══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* License Monitor Widget */}
        {licenseInfo && (
          <SectionCard>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow">
                  <ChartBarIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  License Usage
                </span>
                {(licenseInfo.usagePercent ?? 0) >= 90 && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    (licenseInfo.usagePercent ?? 0) >= 100
                      ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}>
                    {(licenseInfo.usagePercent ?? 0) >= 100 ? 'Full' : 'Near Limit'}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-secondary-900 dark:text-white">
                {licenseInfo.activeUsers}/{licenseInfo.licenseCount}
              </p>
              <div className="mt-2 h-2 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-500',
                    (licenseInfo.usagePercent ?? 0) >= 100 ? 'bg-red-500' :
                    (licenseInfo.usagePercent ?? 0) >= 90 ? 'bg-yellow-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(licenseInfo.usagePercent ?? 0, 100)}%` }}
                />
              </div>
              <p className="text-xs text-secondary-400 mt-1">{licenseInfo.remaining} seats available</p>
            </div>
          </SectionCard>
        )}

        {/* Recent Uploads Widget */}
        <SectionCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 shadow">
                  <DocumentTextIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
                  Recent Uploads
                </span>
              </div>
              <Link
                to="/excel-upload"
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Upload New
              </Link>
            </div>
            {Array.isArray(recentUploads) && recentUploads.length > 0 ? (
              <div className="space-y-2">
                {recentUploads.map((upload: any) => (
                  <div key={upload.id} className="flex items-center justify-between py-1.5 border-b border-secondary-100 dark:border-secondary-800 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">{upload.fileName}</p>
                      <p className="text-xs text-secondary-400">{new Date(upload.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                      upload.status === 'COMPLETED' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                      upload.status === 'FAILED' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                      'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                    }`}>
                      {upload.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-secondary-400 dark:text-secondary-500">No recent uploads</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* ══════════════════════════ Team Performance Overview ══════════════════════════ */}
      <SectionCard>
        <div className="px-6 py-4 border-b border-secondary-100 dark:border-secondary-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 shadow">
              <UserGroupIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Team Performance Overview
              </h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {teamSize} team member{teamSize !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-secondary-500 dark:text-secondary-400">Sort by:</label>
            <div className="flex items-center rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 p-0.5">
              {([
                ['name', 'Name'],
                ['performance', 'Performance'],
                ['goalProgress', 'Goal Progress'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSortField(key)}
                  className={clsx(
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                    sortField === key
                      ? 'bg-primary-600 text-white'
                      : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-700',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-secondary-100 dark:border-secondary-700 text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
                <th className="px-6 py-3">Team Member</th>
                <th className="px-6 py-3">Job Title</th>
                <th className="px-6 py-3">Goal Progress</th>
                <th className="px-6 py-3">Last Rating</th>
                <th className="px-6 py-3">Feedback</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-50 dark:divide-secondary-700/50">
              {sortedTeamMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-secondary-400 dark:text-secondary-500">
                    No direct reports found
                  </td>
                </tr>
              )}
              {sortedTeamMembers.map((member) => (
                <tr
                  key={member.id}
                  className="hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
                >
                  <td className="px-6 py-3">
                    <Link
                      to={`/employees/${member.id}`}
                      className="flex items-center gap-3 group"
                    >
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-secondary-100 dark:ring-secondary-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center text-white text-xs font-semibold">
                          {avatarInitials(member.firstName, member.lastName)}
                        </div>
                      )}
                      <span className="text-sm font-medium text-secondary-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {member.firstName} {member.lastName}
                      </span>
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-sm text-secondary-600 dark:text-secondary-400">
                    {member.jobTitle || '--'}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all',
                            progressBarColor(member.goalProgress),
                          )}
                          style={{ width: `${member.goalProgress}%` }}
                        />
                      </div>
                      <span className={clsx('text-xs font-semibold', progressColor(member.goalProgress))}>
                        {member.goalProgress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    {member.lastRating > 0 ? miniStars(member.lastRating) : (
                      <span className="text-xs text-secondary-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-secondary-600 dark:text-secondary-400">
                    {member.feedbackScore > 0 ? `${member.feedbackScore}%` : '--'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {statusDot(member.performanceScore || member.goalProgress)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-secondary-100 dark:border-secondary-700">
          <Link
            to="/team"
            className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            View Full Team →
          </Link>
        </div>
      </SectionCard>

      {/* ══════════════════════════ Action Items / Inbox ══════════════════════════ */}
      <SectionCard>
        <div className="px-6 py-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow">
              <ClockIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Action Items
              </h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {actionItems.length} item{actionItems.length !== 1 ? 's' : ''} needing your attention
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-secondary-50 dark:divide-secondary-700/50">
          {actionItems.length === 0 && (
            <div className="px-6 py-12 text-center">
              <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-secondary-600 dark:text-secondary-400 font-medium">
                All clear! No pending action items.
              </p>
            </div>
          )}
          {actionItems.map((item) => (
            <div
              key={item.id}
              className="px-6 py-4 flex items-center gap-4 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
            >
              <div
                className={clsx(
                  'flex-shrink-0 p-2 rounded-xl bg-gradient-to-br shadow',
                  item.iconColor,
                )}
              >
                <item.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                  {item.description}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                  {item.dueLabel}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {urgencyBadge(item.urgency)}
                <Link
                  to={item.actionHref}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-sm"
                >
                  {item.actionLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ══════════════════════════ Goal Tracker Section ══════════════════════════ */}
      <SectionCard>
        <div className="px-6 py-4 border-b border-secondary-100 dark:border-secondary-700 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow">
            <FlagIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              Goal Tracker
            </h2>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              Team goals progress summary
            </p>
          </div>
        </div>
        <div className="p-6">
          {/* Status counts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
              <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {onTrackGoals.length}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  On Track ({teamGoals.length > 0 ? Math.round((onTrackGoals.length / teamGoals.length) * 100) : 0}%)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
              <ExclamationCircleIcon className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {atRiskGoals.length}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  At Risk ({teamGoals.length > 0 ? Math.round((atRiskGoals.length / teamGoals.length) * 100) : 0}%)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {behindGoals.length}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  Behind ({teamGoals.length > 0 ? Math.round((behindGoals.length / teamGoals.length) * 100) : 0}%)
                </p>
              </div>
            </div>
          </div>

          {/* Two columns: closest to completion | most at risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Closest to Completion */}
            <div>
              <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2">
                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />
                Closest to Completion
              </h3>
              <div className="space-y-2">
                {closestToCompletion.length === 0 && (
                  <p className="text-sm text-secondary-400 dark:text-secondary-500 py-4 text-center">
                    No active goals
                  </p>
                )}
                {closestToCompletion.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                        {g.title}
                      </p>
                      <p className="text-xs text-secondary-400 dark:text-secondary-500">
                        {g.owner?.firstName} {g.owner?.lastName}
                      </p>
                    </div>
                    <span className={clsx('text-sm font-bold', progressColor(g.progress))}>
                      {g.progress}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Most At Risk */}
            <div>
              <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                Most At Risk
              </h3>
              <div className="space-y-2">
                {mostAtRisk.length === 0 && (
                  <p className="text-sm text-secondary-400 dark:text-secondary-500 py-4 text-center">
                    No active goals
                  </p>
                )}
                {mostAtRisk.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary-50 dark:bg-secondary-800/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                        {g.title}
                      </p>
                      <p className="text-xs text-secondary-400 dark:text-secondary-500">
                        {g.owner?.firstName} {g.owner?.lastName}
                        {g.dueDate && (
                          <span className="ml-2">
                            Due {new Date(g.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={clsx('text-sm font-bold', progressColor(g.progress))}>
                      {g.progress}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ══════════════════════════ Quick Actions Grid ══════════════════════════ */}
      <div>
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: 'Schedule 1:1',
              description: 'Set up a one-on-one meeting with a report',
              href: '/one-on-ones',
              icon: CalendarDaysIcon,
              gradient: 'from-teal-500 to-cyan-500',
              bgHover: 'hover:bg-teal-50 dark:hover:bg-teal-900/10',
            },
            {
              label: 'Give Feedback',
              description: 'Share feedback or recognition with your team',
              href: '/feedback',
              icon: ChatBubbleLeftRightIcon,
              gradient: 'from-blue-500 to-cyan-500',
              bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/10',
            },
            {
              label: 'Start Review',
              description: 'Begin a performance review for a team member',
              href: '/reviews',
              icon: ClipboardDocumentCheckIcon,
              gradient: 'from-violet-500 to-purple-500',
              bgHover: 'hover:bg-violet-50 dark:hover:bg-violet-900/10',
            },
            {
              label: 'Create Goal',
              description: 'Set a new goal for yourself or your team',
              href: '/goals',
              icon: FlagIcon,
              gradient: 'from-emerald-500 to-teal-500',
              bgHover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/10',
            },
            {
              label: 'View Reports',
              description: 'Access performance and analytics reports',
              href: '/reports',
              icon: DocumentTextIcon,
              gradient: 'from-amber-500 to-orange-500',
              bgHover: 'hover:bg-amber-50 dark:hover:bg-amber-900/10',
            },
            {
              label: 'Team Analytics',
              description: 'Dive into team performance data and trends',
              href: '/analytics',
              icon: ChartBarIcon,
              gradient: 'from-rose-500 to-pink-500',
              bgHover: 'hover:bg-rose-50 dark:hover:bg-rose-900/10',
            },
          ].map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className={clsx(
                'group flex items-start gap-4 p-5 rounded-2xl bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5',
                action.bgHover,
              )}
            >
              <div
                className={clsx(
                  'flex-shrink-0 p-3 rounded-xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform',
                  action.gradient,
                )}
              >
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════ Recent Activity Feed ══════════════════════════ */}
      <SectionCard>
        <div className="px-6 py-4 border-b border-secondary-100 dark:border-secondary-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow">
              <ArrowPathIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Recent Activity
              </h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                Latest team activity feed
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {activityFeed.length === 0 && (
            <div className="text-center py-8">
              <ArrowPathIcon className="w-10 h-10 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
              <p className="text-secondary-500 dark:text-secondary-400 text-sm">
                No recent team activity to display
              </p>
            </div>
          )}
          <div className="space-y-1">
            {activityFeed.map((event, idx) => (
              <div
                key={event.id}
                className="flex gap-4 p-3 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br',
                      event.iconColor,
                    )}
                  >
                    <event.icon className="w-4 h-4 text-white" />
                  </div>
                  {idx < activityFeed.length - 1 && (
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-secondary-200 dark:bg-secondary-700" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    {event.title}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 truncate">
                    {event.description}
                  </p>
                </div>
                <span className="text-xs text-secondary-400 dark:text-secondary-500 whitespace-nowrap flex-shrink-0">
                  {event.timestamp ? relativeTime(event.timestamp) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
