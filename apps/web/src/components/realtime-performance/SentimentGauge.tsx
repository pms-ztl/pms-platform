/**
 * Feature 7: Real-Time Communication Sentiment Gauge
 *
 * Sentiment analysis for internal communications to track team morale
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
              className="text-gray-200 dark:text-gray-700"
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
            <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mt-1">
              {((score ?? 0) * 100).toFixed(0)}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500 truncate px-1">Sentiment Score</span>
          </div>
        </div>
      </div>
      <div className={clsx(
        'text-center mt-2 px-3 py-1 rounded-full text-xs font-medium truncate',
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
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 overflow-hidden">
    <div className="flex items-center justify-between mb-2">
      <Icon className={clsx('h-4 w-4 flex-shrink-0', color)} />
      {subtext && <span className="text-xs text-gray-500 flex-shrink-0">{subtext}</span>}
    </div>
    <div className={clsx('text-xl font-bold truncate', color)}>
      {((value ?? 0) * 100).toFixed(0)}%
    </div>
    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{label}</div>
    <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={clsx('h-1.5 rounded-full', color.replace('text-', 'bg-'))}
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);

const TeamMemberCard = ({ member }: { member: TeamMorale['teamMembers'][0] }) => {
  const color = getSentimentColor(member.overallScore);

  return (
    <div className={clsx(
      'rounded-xl border p-4',
      member.moraleAlert
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <span className="text-sm font-medium">{member.name.charAt(0)}</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
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
          <div className="text-gray-500">Positivity</div>
          <div className="font-semibold">{((member.positivityRatio ?? 0) * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-gray-500">Collaboration</div>
          <div className="font-semibold">{((member.collaborationSentiment ?? 0) * 100).toFixed(0)}%</div>
        </div>
        <div>
          <div className="text-gray-500">Stress</div>
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
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
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
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-lg">
            <HeartIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Communication Sentiment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track team morale through communication analysis
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('personal')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'personal'
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400'
            )}
          >
            My Sentiment
          </button>
          <button
            onClick={() => setViewMode('team')}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'team'
                ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400'
            )}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-1" />
            Team Morale
          </button>
        </div>
      </div>

      {viewMode === 'personal' && sentiment && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sentiment Meter */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center overflow-hidden">
            <SentimentMeter score={sentiment.overallScore} />
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
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Sentiment Profile
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Sentiment"
                      dataKey="value"
                      stroke="#ec4899"
                      fill="#ec4899"
                      fillOpacity={0.3}
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
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="text-sm text-gray-500">Morale Index</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(teamMorale.teamMetrics?.moraleIndex ?? 0).toFixed(0)}
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
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Team Sentiment Distribution
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamBarData}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
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
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Team Data Available</h3>
              <p className="text-gray-500 dark:text-gray-400">
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
