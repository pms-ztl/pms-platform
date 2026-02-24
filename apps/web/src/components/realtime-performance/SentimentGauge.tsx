/**
 * Feature 7: Real-Time Communication Sentiment Gauge
 *
 * Sentiment analysis for internal communications to track team morale
 * — Frosted glassmorphism styling for premium look in all themes
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FaceSmileIcon,
  FaceFrownIcon,
  ChatBubbleBottomCenterTextIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  SparklesIcon,
  ClockIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckBadgeIcon,
  LightBulbIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import clsx from 'clsx';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

interface SentimentAnalysis {
  overallScore: number;
  positivityRatio: number;
  collaborationSentiment: number;
  stressIndicators: number;
  moraleAlert: boolean;
  moraleAlertReason?: string;
}

interface TeamMorale {
  teamMembers: Array<{
    userId: string;
    name: string;
    overallScore: number;
    positivityRatio: number;
    collaborationSentiment: number;
    stressIndicators: number;
    moraleAlert: boolean;
  }>;
  teamMetrics: {
    avgSentimentScore: number;
    moraleIndex: number;
    highMoraleCount: number;
    neutralMoraleCount: number;
    lowMoraleCount: number;
    membersWithAlerts: number;
  };
}

const api = {
  getSentiment: async (): Promise<SentimentAnalysis> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/sentiment');
    const data = await res.json();
    return data.data;
  },
  getTeamMorale: async (): Promise<TeamMorale> => {
    const res = await fetchWithAuth('/api/v1/realtime-performance/sentiment/team');
    const data = await res.json();
    return data.data;
  },
};

/* ── Glass card base class ─────────────────────────────────────────────── */
const glassCard =
  'rounded-xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.04] backdrop-blur-xl shadow-sm';

const getSentimentColor = (score: number) => {
  if (score >= 0.3) return 'green';
  if (score >= -0.3) return 'yellow';
  return 'red';
};

const getSentimentLabel = (score: number) => {
  if (score >= 0.5) return 'Very Positive';
  if (score >= 0.3) return 'Positive';
  if (score >= 0) return 'Neutral';
  if (score >= -0.3) return 'Mixed';
  return 'Needs Attention';
};

const SentimentMeter = ({ score }: { score: number }) => {
  // Convert -1 to 1 scale to 0-100 for display
  const displayValue = ((score + 1) / 2) * 100;
  const color = getSentimentColor(score);

  return (
    <div className="relative w-full max-w-[260px] mx-auto">
      <div className="flex items-center justify-center">
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 flex-shrink-0">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-secondary-200 dark:text-secondary-700"
            />
            {/* Gradient segments */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="url(#sentimentGradient)"
              strokeWidth="12"
              strokeDasharray={`${displayValue * 4.4} 440`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {score >= 0 ? (
              <FaceSmileIcon className={clsx(
                'h-8 w-8 sm:h-10 sm:w-10',
                color === 'green' ? 'text-green-500' : 'text-yellow-500'
              )} />
            ) : (
              <FaceFrownIcon className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
            )}
            <span className="text-lg sm:text-xl font-bold text-secondary-900 dark:text-white mt-1">
              {((score ?? 0) * 100).toFixed(0)}
            </span>
            <span className="text-2xs sm:text-xs text-secondary-500 dark:text-secondary-400 break-words px-1">Sentiment Score</span>
          </div>
        </div>
      </div>
      <div className={clsx(
        'text-center mt-2 px-3 py-1 rounded-full text-xs font-medium break-words',
        color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
        color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      )}>
        {getSentimentLabel(score)}
      </div>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  icon: Icon,
  color,
  subtext,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}) => (
  <div className={clsx(glassCard, 'p-3 overflow-hidden')}>
    <div className="flex items-center justify-between mb-2">
      <Icon className={clsx('h-4 w-4 flex-shrink-0', color)} />
      {subtext && <span className="text-xs text-secondary-500 dark:text-secondary-400 flex-shrink-0">{subtext}</span>}
    </div>
    <div className={clsx('text-xl font-bold break-words', color)}>
      {((value ?? 0) * 100).toFixed(0)}%
    </div>
    <div className="text-xs text-secondary-600 dark:text-secondary-400 break-words">{label}</div>
    <div className="mt-2 h-1.5 bg-secondary-200/60 dark:bg-secondary-700/50 rounded-full overflow-hidden">
      <div
        className={clsx('h-1.5 rounded-full', color.replace('text-', 'bg-'))}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);

/* ── Mock data for sentiment trend (7-day) ─────────────────────────── */
const SENTIMENT_TREND_DATA = [
  { day: 'Mon', score: 42, messages: 18 },
  { day: 'Tue', score: 55, messages: 24 },
  { day: 'Wed', score: 48, messages: 21 },
  { day: 'Thu', score: 62, messages: 29 },
  { day: 'Fri', score: 58, messages: 16 },
  { day: 'Sat', score: 45, messages: 5 },
  { day: 'Sun', score: 50, messages: 3 },
];

const COMMUNICATION_STATS = [
  { label: 'Messages Analyzed', value: '142', icon: EnvelopeIcon, color: 'text-violet-500' },
  { label: 'Avg Response Time', value: '12m', icon: ClockIcon, color: 'text-cyan-500' },
  { label: 'Active Conversations', value: '8', icon: ChatBubbleLeftRightIcon, color: 'text-amber-500' },
  { label: 'Sentiment Streak', value: '5d', icon: BoltIcon, color: 'text-emerald-500' },
];

const KEY_INSIGHTS = [
  { text: 'Positivity ratio above team average', positive: true },
  { text: 'Communication volume increased 15% this week', positive: true },
  { text: 'Stress indicators stable over last 7 days', positive: true },
  { text: 'Collaboration sentiment slightly below average', positive: false },
];

/** Mini 7-day sentiment trend sparkline */
const SentimentTrendMini = () => (
  <div className={clsx(glassCard, 'p-4 overflow-hidden')}>
    <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
      7-Day Sentiment Trend
    </h4>
    <div className="h-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={SENTIMENT_TREND_DATA} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="sentimentAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} className="fill-secondary-400 dark:fill-secondary-500" />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#ec4899"
            strokeWidth={2}
            fill="url(#sentimentAreaGrad)"
            dot={{ r: 2.5, fill: '#ec4899', stroke: '#1e293b', strokeWidth: 1.5 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
            contentStyle={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(148, 163, 184, 0.15)',
              borderRadius: '0.5rem',
              fontSize: '0.7rem',
              color: '#f1f5f9',
              padding: '4px 8px',
            }}
            formatter={(value: number) => [`${value}%`, 'Sentiment']}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

/** Communication activity stats grid */
const CommunicationStats = () => (
  <div className={clsx(glassCard, 'p-4 overflow-hidden')}>
    <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
      Communication Activity
    </h4>
    <div className="grid grid-cols-2 gap-3">
      {COMMUNICATION_STATS.map((stat) => (
        <div key={stat.label} className="flex items-center space-x-2">
          <div className="p-1.5 rounded-md bg-secondary-100/60 dark:bg-white/[0.04]">
            <stat.icon className={clsx('h-3.5 w-3.5', stat.color)} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-secondary-900 dark:text-white break-words">{stat.value}</div>
            <div className="text-2xs text-secondary-500 dark:text-secondary-400 break-words">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/** Key insights list */
const KeyInsights = () => (
  <div className={clsx(glassCard, 'p-4 overflow-hidden')}>
    <h4 className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 uppercase tracking-wider mb-3">
      Key Insights
    </h4>
    <ul className="space-y-2">
      {KEY_INSIGHTS.map((insight, i) => (
        <li key={i} className="flex items-start space-x-2">
          {insight.positive ? (
            <ArrowTrendingUpIcon className="h-3.5 w-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
          ) : (
            <ArrowTrendingDownIcon className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          )}
          <span className="text-xs text-secondary-600 dark:text-secondary-300 leading-tight">{insight.text}</span>
        </li>
      ))}
    </ul>
  </div>
);

const TeamMemberCard = ({ member }: { member: TeamMorale['teamMembers'][0] }) => {
  const color = getSentimentColor(member.overallScore);

  return (
    <div className={clsx(
      'rounded-xl border p-4',
      member.moraleAlert
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : glassCard
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-secondary-200/60 dark:bg-secondary-700/50 flex items-center justify-center">
            <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">{member.name.charAt(0)}</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-secondary-900 dark:text-white">
              {member.name}
            </div>
            <div className={clsx(
              'text-xs',
              color === 'green' ? 'text-green-600' :
              color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
            )}>
              {getSentimentLabel(member.overallScore)}
            </div>
          </div>
        </div>
        {member.moraleAlert && (
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="text-secondary-500 dark:text-secondary-400">Positivity</div>
          <div className="font-semibold text-secondary-900 dark:text-white">{((member.positivityRatio ?? 0) * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-secondary-500 dark:text-secondary-400">Collaboration</div>
          <div className="font-semibold text-secondary-900 dark:text-white">{((member.collaborationSentiment ?? 0) * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-secondary-500 dark:text-secondary-400">Stress</div>
          <div className={clsx(
            'font-semibold',
            member.stressIndicators > 0.5 ? 'text-red-500' : 'text-green-500'
          )}>
            {((member.stressIndicators ?? 0) * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
};

export function SentimentGauge() {
  const [viewMode, setViewMode] = useState<'personal' | 'team'>('personal');

  const { data: sentiment, isLoading: loadingPersonal } = useQuery({
    queryKey: ['sentiment'],
    queryFn: api.getSentiment,
    enabled: viewMode === 'personal',
  });

  const { data: teamMorale, isLoading: loadingTeam } = useQuery({
    queryKey: ['teamMorale'],
    queryFn: api.getTeamMorale,
    enabled: viewMode === 'team',
  });

  const isLoading = viewMode === 'personal' ? loadingPersonal : loadingTeam;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-200/60 dark:bg-secondary-700/50 rounded w-1/3" />
        <div className="h-64 bg-secondary-200/60 dark:bg-secondary-700/50 rounded-xl" />
      </div>
    );
  }

  const radarData = sentiment ? [
    { metric: 'Positivity', value: sentiment.positivityRatio * 100 },
    { metric: 'Collaboration', value: sentiment.collaborationSentiment * 100 },
    { metric: 'Engagement', value: (1 - sentiment.stressIndicators) * 100 },
    { metric: 'Communication', value: ((sentiment.overallScore + 1) / 2) * 100 },
  ] : [];

  const teamBarData = teamMorale?.teamMembers.map(m => ({
    name: m.name.split(' ')[0],
    score: ((m.overallScore + 1) / 2) * 100,
    color: getSentimentColor(m.overallScore),
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg shadow-lg">
            <HeartIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary-900 dark:text-white">
              Communication Sentiment
            </h2>
            <p className="text-sm text-secondary-500 dark:text-secondary-400">
              Track team morale through communication analysis
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-secondary-100/60 dark:bg-white/[0.04] backdrop-blur-sm rounded-lg p-1 border border-secondary-200/40 dark:border-white/[0.06]">
          <button
            onClick={() => setViewMode('personal')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'personal'
                ? 'bg-white dark:bg-white/10 shadow text-secondary-900 dark:text-white'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
            )}
          >
            My Sentiment
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'team'
                ? 'bg-white dark:bg-white/10 shadow text-secondary-900 dark:text-white'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
            )}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-1" />
            Team Morale
          </button>
        </div>
      </div>

      {viewMode === 'personal' && sentiment && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Meter + Stats */}
          <div className="lg:col-span-1 space-y-4 overflow-hidden">
            <div className={clsx(glassCard, 'p-6 flex flex-col items-center')}>
              <SentimentMeter score={sentiment.overallScore} />
            </div>
            <SentimentTrendMini />
            <CommunicationStats />
            <KeyInsights />
          </div>

          {/* Metrics & Radar */}
          <div className="lg:col-span-2 space-y-6 overflow-hidden">
            {/* Alert */}
            {sentiment.moraleAlert && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                      Morale Alert
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {sentiment.moraleAlertReason || 'Your communication sentiment indicators suggest you may be experiencing stress.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Positivity"
                value={sentiment.positivityRatio}
                icon={SparklesIcon}
                color="text-yellow-500"
              />
              <MetricCard
                label="Collaboration"
                value={sentiment.collaborationSentiment}
                icon={UserGroupIcon}
                color="text-blue-500"
              />
              <MetricCard
                label="Communication"
                value={(sentiment.overallScore + 1) / 2}
                icon={ChatBubbleBottomCenterTextIcon}
                color="text-green-500"
              />
              <MetricCard
                label="Stress Level"
                value={sentiment.stressIndicators}
                icon={ExclamationTriangleIcon}
                color={sentiment.stressIndicators > 0.5 ? 'text-red-500' : 'text-green-500'}
                subtext={sentiment.stressIndicators > 0.5 ? 'High' : 'Low'}
              />
            </div>

            {/* Radar Chart */}
            <div className={clsx(glassCard, 'p-6 overflow-hidden')}>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                Sentiment Profile
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid
                      className="stroke-secondary-300/40 dark:stroke-secondary-600/25"
                      gridType="polygon"
                    />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 12, fill: 'currentColor' }}
                      className="[&_text]:fill-secondary-600 dark:[&_text]:fill-secondary-300"
                      stroke="transparent"
                      axisLine={{ stroke: 'transparent', fill: 'none' }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10 }}
                      className="fill-secondary-400 dark:fill-secondary-500"
                      stroke="transparent"
                    />
                    <Radar
                      name="Sentiment"
                      dataKey="value"
                      stroke="#f472b6"
                      fill="#ec4899"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={{
                        r: 4,
                        fill: '#f472b6',
                        fillOpacity: 1,
                        stroke: '#1e293b',
                        strokeWidth: 2,
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                      contentStyle={{
                        background: 'rgba(15, 23, 42, 0.80)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        color: '#f1f5f9',
                      }}
                      formatter={(value: number) => [`${Number(value).toFixed(0)}%`, '']}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'team' && teamMorale && (
        <div className="space-y-6">
          {/* Team Metrics */}
          {teamMorale.teamMembers && teamMorale.teamMembers.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={clsx(glassCard, 'p-4')}>
                  <div className="text-sm text-secondary-500 dark:text-secondary-400">Morale Index</div>
                  <div className="text-2xl font-bold text-secondary-900 dark:text-white">
                    {Number(teamMorale.teamMetrics?.moraleIndex ?? 0).toFixed(0)}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4">
                  <div className="text-sm text-green-600 dark:text-green-400">High Morale</div>
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {teamMorale.teamMetrics?.highMoraleCount ?? 0}
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Neutral</div>
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {teamMorale.teamMetrics?.neutralMoraleCount ?? 0}
                  </div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
                  <div className="text-sm text-red-600 dark:text-red-400">Needs Attention</div>
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {teamMorale.teamMetrics?.lowMoraleCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Team Chart */}
              <div className={clsx(glassCard, 'p-6')}>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                  Team Sentiment Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamBarData}>
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12 }}
                        className="fill-secondary-500 dark:fill-secondary-400"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        className="fill-secondary-500 dark:fill-secondary-400"
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                        contentStyle={{
                          background: 'rgba(15, 23, 42, 0.80)',
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          border: '1px solid rgba(148, 163, 184, 0.15)',
                          borderRadius: '0.75rem',
                          fontSize: '0.75rem',
                          color: '#f1f5f9',
                        }}
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {teamBarData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.color === 'green' ? '#10b981' :
                              entry.color === 'yellow' ? '#f59e0b' : '#ef4444'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Team Members */}
              <div className={clsx(glassCard, 'p-6')}>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                  Team Members
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {teamMorale.teamMembers.map((member) => (
                    <TeamMemberCard key={member.userId} member={member} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className={clsx(glassCard, 'p-8 text-center')}>
              <UserGroupIcon className="h-12 w-12 mb-3 text-secondary-300 dark:text-secondary-600 mx-auto" />
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">No Team Data Available</h3>
              <p className="text-secondary-500 dark:text-secondary-400">
                No direct reports found. Team morale data will appear here when you have team members reporting to you.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SentimentGauge;
