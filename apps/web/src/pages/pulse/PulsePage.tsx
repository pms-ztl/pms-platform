import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  EyeSlashIcon,
  ClockIcon,
  SparklesIcon,
  HeartIcon,
  BoltIcon,
  FireIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

import {
  pulseApi,
  type PulseSubmission,
  type PulseResponse,
  type PulseAnalyticsOverview,
  type PulseTrendPoint,
  type PulseDepartmentData,
} from '@/lib/api/pulse';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';
import { SurveyInsights, EngagementHeatmap } from '@/components/engagement';
import { MoodFaceIcon } from '@/components/ui/MoodFaceIcon';

// ── Constants ──

const MOOD_OPTIONS = [
  { score: 1 as const, label: 'Very Low', color: 'from-red-400 to-red-500', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-300 dark:border-red-700', ring: 'ring-red-400', text: 'text-red-700 dark:text-red-300' },
  { score: 2 as const, label: 'Low', color: 'from-orange-400 to-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-700', ring: 'ring-orange-400', text: 'text-orange-700 dark:text-orange-300' },
  { score: 3 as const, label: 'Neutral', color: 'from-yellow-400 to-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-300 dark:border-yellow-700', ring: 'ring-yellow-400', text: 'text-yellow-700 dark:text-yellow-300' },
  { score: 4 as const, label: 'Good', color: 'from-lime-400 to-green-500', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-300 dark:border-green-700', ring: 'ring-green-400', text: 'text-green-700 dark:text-green-300' },
  { score: 5 as const, label: 'Great', color: 'from-emerald-400 to-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-300 dark:border-emerald-700', ring: 'ring-emerald-400', text: 'text-emerald-700 dark:text-emerald-300' },
];

const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

const TREND_LINE_COLORS = {
  mood: '#8b5cf6',
  energy: '#f59e0b',
  stress: '#ef4444',
};

// ── Helpers ──

function getMoodLabel(score: number): string {
  return MOOD_OPTIONS.find((m) => m.score === score)?.label || 'Unknown';
}

function getMoodEmoji(score: number): string {
  const emojis: Record<number, string> = { 1: '😢', 2: '😟', 3: '😐', 4: '😊', 5: '🤩' };
  return emojis[score] || '😐';
}

// ── Sub-Components ──

function SliderControl({
  label,
  icon: Icon,
  value,
  onChange,
  lowLabel,
  highLabel,
  color,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={clsx('h-4 w-4', color)} />
          <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{label}</span>
        </div>
        <span className={clsx('text-sm font-bold', color)}>{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-secondary-200 dark:bg-secondary-700 accent-primary-600"
      />
      <div className="flex justify-between text-xs text-secondary-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

function PersonalSparkline({ history }: { history: PulseResponse[] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-secondary-400 dark:text-secondary-500">
        No check-in history yet. Submit your first check-in above!
      </div>
    );
  }

  const chartData = [...history]
    .reverse()
    .map((h) => ({
      date: format(new Date(h.surveyDate), 'MMM d'),
      mood: h.moodScore,
    }));

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-secondary-600 dark:text-secondary-400 mb-2">
        Your mood - last {history.length} check-ins
      </h4>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 10 }} stroke="#9ca3af" width={20} />
            <Tooltip
              cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-xl px-3 py-2 border border-white/10 text-xs">
                    <p className="font-medium text-white">{d.date}</p>
                    <p className="text-slate-300 flex items-center gap-1.5">
                      <MoodFaceIcon score={d.mood as 1|2|3|4|5} className="w-4 h-4" />
                      {getMoodLabel(d.mood)} ({d.mood}/5)
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={{ fill: '#8b5cf6', r: 3 }}
              activeDot={{ fill: '#7c3aed', r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SuccessAnimation({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center py-8 animate-in fade-in zoom-in duration-500">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center animate-bounce">
          <CheckCircleIcon className="h-12 w-12 text-green-500" />
        </div>
        <div className="absolute -top-1 -right-1">
          <SparklesIcon className="h-6 w-6 text-yellow-400 animate-pulse" />
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold text-green-700 dark:text-green-300">Check-in submitted!</p>
      <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">Thanks for sharing how you feel today</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  suffix,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  suffix?: string;
  trend?: string | null;
}) {
  const trendIcon =
    trend === 'up' ? (
      <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
    ) : trend === 'down' ? (
      <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
    ) : (
      <MinusIcon className="h-4 w-4 text-secondary-400" />
    );

  return (
    <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-5">
      <div className="flex items-center justify-between">
        <div className={clsx('p-3 rounded-lg', iconBg)}>
          <Icon className={clsx('h-6 w-6', iconColor)} />
        </div>
        {trend !== undefined && <div>{trendIcon}</div>}
      </div>
      <div className="mt-3">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">{label}</p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-white mt-0.5">
          {value}
          {suffix && <span className="text-sm font-normal text-secondary-400 ml-1">{suffix}</span>}
        </p>
      </div>
    </div>
  );
}

// ── Main Component ──

export function PulsePage() {
  usePageTitle('Pulse Survey');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isManager = user?.roles?.some((r) =>
    ['SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'].includes(r)
  );

  // Check-in form state
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [energyScore, setEnergyScore] = useState(3);
  const [stressScore, setStressScore] = useState(3);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Analytics period
  const [analyticsDays, setAnalyticsDays] = useState(30);

  // ── Queries ──

  const { data: canSubmitData, isLoading: loadingCanSubmit } = useQuery({
    queryKey: ['pulse', 'can-submit'],
    queryFn: () => pulseApi.canSubmit(),
  });

  const { data: myHistory } = useQuery({
    queryKey: ['pulse', 'my-history'],
    queryFn: () => pulseApi.getMyHistory({ limit: 14 }),
  });

  const { data: analyticsOverview } = useQuery({
    queryKey: ['pulse', 'analytics', 'overview', analyticsDays],
    queryFn: () => pulseApi.getAnalyticsOverview({ days: analyticsDays }),
    enabled: !!isManager,
  });

  const { data: trendData } = useQuery({
    queryKey: ['pulse', 'analytics', 'trends', analyticsDays],
    queryFn: () => pulseApi.getAnalyticsTrends({ days: analyticsDays }),
    enabled: !!isManager,
  });

  const { data: departmentData } = useQuery({
    queryKey: ['pulse', 'analytics', 'departments'],
    queryFn: () => pulseApi.getAnalyticsDepartments(),
    enabled: !!isManager,
  });

  const { data: distributionData } = useQuery({
    queryKey: ['pulse', 'analytics', 'distribution', analyticsDays],
    queryFn: () => pulseApi.getAnalyticsDistribution({ days: analyticsDays }),
    enabled: !!isManager,
  });

  // ── Mutation ──

  const submitMutation = useMutation({
    mutationFn: (data: PulseSubmission) => pulseApi.submit(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pulse'] });
      setShowSuccess(true);
      toast.success('Pulse check-in recorded!');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit check-in');
    },
  });

  const handleSubmit = () => {
    if (!selectedMood) return;

    const data: PulseSubmission = {
      moodScore: selectedMood,
      ...(showDetails && { energyScore, stressScore }),
      ...(comment.trim() && { comment: comment.trim() }),
      isAnonymous,
    };

    submitMutation.mutate(data);
  };

  const resetForm = () => {
    setSelectedMood(null);
    setEnergyScore(3);
    setStressScore(3);
    setComment('');
    setIsAnonymous(false);
    setShowDetails(false);
    setShowSuccess(false);
  };

  // ── Derived Data ──

  const canSubmit = canSubmitData?.canSubmit ?? true;
  const nextAvailable = canSubmitData?.nextAvailable;

  // Pie chart data from distribution
  const pieData = distributionData
    ? Object.entries(distributionData).map(([key, value]) => ({
        name: getMoodLabel(Number(key)),
        value: value,
        score: Number(key),
      }))
    : [];

  // Trend chart data
  const trendChartData = (trendData || []).map((point: PulseTrendPoint) => ({
    date: format(new Date(point.date), 'MMM d'),
    mood: point.averageMood ? Number(point.averageMood.toFixed(1)) : null,
    energy: point.averageEnergy ? Number(point.averageEnergy.toFixed(1)) : null,
    stress: point.averageStress ? Number(point.averageStress.toFixed(1)) : null,
    responses: point.responseCount,
  }));

  // Department bar chart data
  const deptChartData = (departmentData || []).map((d: PulseDepartmentData) => ({
    name: d.departmentName,
    fullName: d.departmentName,
    mood: Number((d.averageMood ?? 0).toFixed(1)),
    participation: d.participationRate,
    responses: d.responseCount,
  }));

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <PageHeader title="Pulse Survey & Mood Tracker" subtitle="How are you feeling today? Your well-being matters." />

      {/* ══════════════════════════════════════════════════════════════════════
         SECTION 1: MOOD CHECK-IN (All Users)
         ══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-secondary-800 dark:via-secondary-800 dark:to-secondary-800 rounded-2xl shadow-sm border border-violet-200/60 dark:border-secondary-700 overflow-hidden">
        <div className="p-6 sm:p-8">
          {/* Header area */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
              <HeartIcon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Daily Check-in</h2>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                {canSubmitData?.surveyType === 'WEEKLY' ? 'Weekly pulse survey' : 'Quick daily mood check'}
              </p>
            </div>
          </div>

          {showSuccess ? (
            <SuccessAnimation onComplete={resetForm} />
          ) : !canSubmit ? (
            /* Already submitted */
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="h-9 w-9 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                You've already checked in!
              </h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-2 flex items-center justify-center gap-1.5">
                <ClockIcon className="h-4 w-4" />
                {nextAvailable
                  ? `Next check-in available ${format(new Date(nextAvailable), 'MMM d \'at\' h:mm a')}`
                  : 'Come back tomorrow'}
              </p>

              {/* Show sparkline even when already submitted */}
              <div className="mt-6 max-w-md mx-auto">
                <PersonalSparkline history={myHistory || []} />
              </div>
            </div>
          ) : (
            /* Check-in Form */
            <div className="space-y-6">
              {/* Mood Buttons */}
              <div>
                <p className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-4 text-center">
                  How are you feeling right now?
                </p>
                <div className="flex justify-center gap-3 sm:gap-4 flex-wrap">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.score}
                      onClick={() => setSelectedMood(mood.score)}
                      className={clsx(
                        'group relative flex flex-col items-center gap-2 rounded-2xl px-4 py-4 sm:px-5 sm:py-5 border-2 transition-all duration-200',
                        'hover:scale-105 hover:shadow-lg active:scale-95',
                        selectedMood === mood.score
                          ? clsx(mood.bg, mood.border, 'ring-2', mood.ring, 'shadow-md scale-105')
                          : 'border-secondary-200 dark:border-secondary-600 bg-white dark:bg-secondary-700/50 hover:border-secondary-300 dark:hover:border-secondary-500'
                      )}
                    >
                      <MoodFaceIcon
                        score={mood.score}
                        className="w-10 h-10 sm:w-12 sm:h-12 transition-transform duration-200 group-hover:scale-110"
                        selected={selectedMood === mood.score}
                      />
                      <span
                        className={clsx(
                          'text-xs sm:text-sm font-medium transition-colors',
                          selectedMood === mood.score
                            ? mood.text
                            : 'text-secondary-600 dark:text-secondary-400'
                        )}
                      >
                        {mood.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Details Toggle */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-1.5 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  {showDetails ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      Add details (energy, stress, comment)
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Details */}
              {showDetails && (
                <div className="space-y-5 bg-white/60 dark:bg-secondary-700/40 rounded-xl p-5 border border-secondary-200/50 dark:border-secondary-600/50 animate-in slide-in-from-top duration-300">
                  {/* Energy Slider */}
                  <SliderControl
                    label="Energy Level"
                    icon={BoltIcon}
                    value={energyScore}
                    onChange={setEnergyScore}
                    lowLabel="Drained"
                    highLabel="Energized"
                    color="text-amber-500"
                  />

                  {/* Stress Slider */}
                  <SliderControl
                    label="Stress Level"
                    icon={FireIcon}
                    value={stressScore}
                    onChange={setStressScore}
                    lowLabel="Relaxed"
                    highLabel="Very stressed"
                    color="text-red-500"
                  />

                  {/* Comment */}
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1.5">
                      Anything on your mind? (optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Share what's influencing your mood today..."
                      className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 placeholder-secondary-400 resize-none"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAnonymous}
                          onChange={(e) => setIsAnonymous(e.target.checked)}
                          className="h-4 w-4 text-violet-600 rounded border-secondary-300 dark:border-secondary-600 dark:bg-secondary-700 focus:ring-violet-500"
                        />
                        <span className="flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400">
                          <EyeSlashIcon className="h-3.5 w-3.5" />
                          Submit anonymously
                        </span>
                      </label>
                      <span className="text-xs text-secondary-400">{comment.length}/500</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleSubmit}
                  disabled={!selectedMood || submitMutation.isPending || loadingCanSubmit}
                  className={clsx(
                    'px-8 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
                    selectedMood
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 hover:shadow-xl active:scale-95'
                      : 'bg-secondary-400 dark:bg-secondary-600'
                  )}
                >
                  {submitMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                      Submitting...
                    </span>
                  ) : (
                    'Submit Check-in'
                  )}
                </button>
              </div>

              {/* Personal History Sparkline */}
              <div className="max-w-lg mx-auto">
                <PersonalSparkline history={myHistory || []} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
         SECTION 2: TEAM ANALYTICS (Manager+ only)
         ══════════════════════════════════════════════════════════════════════ */}
      {isManager && (
        <div className="space-y-6">
          {/* Section header with period selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                <ChartBarIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Team Analytics</h2>
                <p className="text-sm text-secondary-500 dark:text-secondary-400">
                  Understand your team's pulse
                </p>
              </div>
            </div>
            <select
              value={analyticsDays}
              onChange={(e) => setAnalyticsDays(Number(e.target.value))}
              className="text-sm border border-secondary-300 dark:border-secondary-600 rounded-lg px-3 py-1.5 bg-white dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Average Team Mood"
              value={analyticsOverview?.averageMood?.toFixed(1) || '--'}
              suffix="/5"
              icon={HeartIcon}
              iconBg="bg-violet-100 dark:bg-violet-900/30"
              iconColor="text-violet-600 dark:text-violet-400"
              trend={analyticsOverview?.trendDirection}
            />
            <StatCard
              label="Average Energy"
              value={analyticsOverview?.averageEnergy?.toFixed(1) || '--'}
              suffix="/5"
              icon={BoltIcon}
              iconBg="bg-amber-100 dark:bg-amber-900/30"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              label="Participation Rate"
              value={analyticsOverview?.participationRate != null ? `${Math.round(analyticsOverview.participationRate)}` : '--'}
              suffix="%"
              icon={UserGroupIcon}
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              label="Total Responses"
              value={analyticsOverview?.totalResponses ?? '--'}
              icon={ChartBarIcon}
              iconBg="bg-green-100 dark:bg-green-900/30"
              iconColor="text-green-600 dark:text-green-400"
              trend={analyticsOverview?.trendDirection}
            />
          </div>

          {/* Insights Panel */}
          <SurveyInsights
            overview={analyticsOverview as any}
            trends={trendData as any}
            departments={departmentData as any}
          />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Mood Distribution Pie Chart */}
            <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">Mood Distribution</h3>
              {pieData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[entry.score - 1] || PIE_COLORS[2]}
                            stroke="none"
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-xl px-3 py-2 border border-white/10 text-xs">
                              <p className="font-medium text-white">
                                {getMoodEmoji(d.score)} {d.name}
                              </p>
                              <p className="text-slate-300">
                                {d.value} responses
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs text-secondary-600 dark:text-secondary-400">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-secondary-400">
                  No data available for this period
                </div>
              )}
            </div>

            {/* Trend Line Chart */}
            <div className="lg:col-span-2 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">Mood Trends</h3>
              {trendChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} stroke="#9ca3af" width={25} />
                      <Tooltip
                        cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-xl px-3 py-2 border border-white/10 text-xs space-y-1">
                              <p className="font-medium text-white">{label}</p>
                              {payload.map((p: any) => (
                                <p key={p.dataKey} style={{ color: p.color }}>
                                  {p.dataKey === 'mood' ? 'Mood' : p.dataKey === 'energy' ? 'Energy' : 'Stress'}: {p.value}
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs text-secondary-600 dark:text-secondary-400 capitalize">{value}</span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        stroke={TREND_LINE_COLORS.mood}
                        strokeWidth={2.5}
                        dot={{ fill: TREND_LINE_COLORS.mood, r: 3 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="energy"
                        stroke={TREND_LINE_COLORS.energy}
                        strokeWidth={2}
                        dot={{ fill: TREND_LINE_COLORS.energy, r: 2.5 }}
                        activeDot={{ r: 4 }}
                        connectNulls
                        strokeDasharray="5 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="stress"
                        stroke={TREND_LINE_COLORS.stress}
                        strokeWidth={2}
                        dot={{ fill: TREND_LINE_COLORS.stress, r: 2.5 }}
                        activeDot={{ r: 4 }}
                        connectNulls
                        strokeDasharray="3 3"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-sm text-secondary-400">
                  No trend data available for this period
                </div>
              )}
            </div>
          </div>

          {/* Pulse Activity Heatmap */}
          {trendData && Array.isArray(trendData) && trendData.length > 0 && (
            <EngagementHeatmap
              trends={(trendData as PulseTrendPoint[]).map((t) => ({ date: t.date, score: t.averageMood }))}
              mode="pulse"
            />
          )}

          {/* Department Heatmap / Bar Chart */}
          {deptChartData.length > 0 && (
            <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-5">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-4">Department Breakdown</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptChartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      stroke="#9ca3af"
                      width={100}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-xl px-3 py-2 border border-white/10 text-xs space-y-1">
                            <p className="font-medium text-white">{d.fullName}</p>
                            <p className="text-slate-300">
                              Average Mood: {getMoodEmoji(Math.round(d.mood))} {d.mood}/5
                            </p>
                            <p className="text-slate-300">
                              Participation: {d.participation}%
                            </p>
                            <p className="text-slate-300">
                              Responses: {d.responses}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="mood"
                      radius={[0, 6, 6, 0]}
                      maxBarSize={28}
                    >
                      {deptChartData.map((entry: any, index: number) => {
                        const colorIndex = Math.min(Math.max(Math.round(entry.mood) - 1, 0), 4);
                        return <Cell key={`bar-${index}`} fill={PIE_COLORS[colorIndex]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Department detail cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
                {(departmentData || []).map((dept: PulseDepartmentData) => {
                  const moodColor =
                    dept.averageMood >= 4
                      ? 'text-green-600 dark:text-green-400'
                      : dept.averageMood >= 3
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400';

                  return (
                    <div
                      key={dept.departmentId}
                      className="flex items-center gap-3 bg-secondary-50 dark:bg-secondary-700/40 rounded-lg p-3"
                    >
                      <span className="text-2xl">{getMoodEmoji(Math.round(dept.averageMood))}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-900 dark:text-white break-words">
                          {dept.departmentName}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400">
                          <span className={clsx('font-semibold', moodColor)}>
                            {(dept.averageMood ?? 0).toFixed(1)}
                          </span>
                          <span>{dept.participationRate}% participation</span>
                          <span>{dept.responseCount} responses</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
