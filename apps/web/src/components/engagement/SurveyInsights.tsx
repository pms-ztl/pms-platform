import { useMemo } from 'react';
import clsx from 'clsx';

interface InsightCardData {
  emoji: string;
  title: string;
  description: string;
  type: 'positive' | 'warning' | 'neutral';
}

interface SurveyInsightsProps {
  overview?: {
    averageMood: number;
    averageEnergy: number | null;
    averageStress: number | null;
    totalResponses: number;
    participationRate: number;
    trendDirection: string | null;
  };
  trends?: {
    date: string;
    averageMood: number;
    averageEnergy: number | null;
    averageStress: number | null;
    responseCount: number;
  }[];
  departments?: {
    departmentName: string;
    averageMood: number;
    responseCount: number;
    participationRate: number;
  }[];
  className?: string;
}

export function SurveyInsights({ overview, trends, departments, className }: SurveyInsightsProps) {
  const insights = useMemo(() => {
    const cards: InsightCardData[] = [];
    if (!overview) return cards;

    // 1. Mood trend insight
    if (overview.trendDirection === 'up') {
      cards.push({
        emoji: '📈',
        title: 'Mood Improving',
        description: `Average mood is trending upward at ${(overview.averageMood ?? 0).toFixed(1)}/5.`,
        type: 'positive',
      });
    } else if (overview.trendDirection === 'down') {
      cards.push({
        emoji: '📉',
        title: 'Mood Declining',
        description: `Average mood is trending downward at ${(overview.averageMood ?? 0).toFixed(1)}/5. Consider a team check-in.`,
        type: 'warning',
      });
    } else {
      cards.push({
        emoji: '📊',
        title: 'Mood Stable',
        description: `Average mood holding steady at ${(overview.averageMood ?? 0).toFixed(1)}/5.`,
        type: 'neutral',
      });
    }

    // 2. Energy insight
    if (overview.averageEnergy != null) {
      if (overview.averageEnergy < 2.5) {
        cards.push({
          emoji: '🔋',
          title: 'Low Energy Alert',
          description: `Team energy is at ${(overview.averageEnergy ?? 0).toFixed(1)}/5. Consider workload balance.`,
          type: 'warning',
        });
      } else if (overview.averageEnergy >= 4.0) {
        cards.push({
          emoji: '⚡',
          title: 'High Energy',
          description: `Team energy is strong at ${(overview.averageEnergy ?? 0).toFixed(1)}/5.`,
          type: 'positive',
        });
      }
    }

    // 3. Stress insight
    if (overview.averageStress != null && overview.averageStress >= 3.5) {
      cards.push({
        emoji: '🔥',
        title: 'Stress Alert',
        description: `Average stress is ${(overview.averageStress ?? 0).toFixed(1)}/5. Explore workload redistribution.`,
        type: 'warning',
      });
    }

    // 4. Participation insight
    if (overview.participationRate < 50) {
      cards.push({
        emoji: '📋',
        title: 'Low Participation',
        description: `Only ${(overview.participationRate ?? 0).toFixed(0)}% participation. Consider reminders or incentives.`,
        type: 'warning',
      });
    } else if (overview.participationRate >= 80) {
      cards.push({
        emoji: '🎯',
        title: 'Strong Participation',
        description: `${(overview.participationRate ?? 0).toFixed(0)}% participation rate — great engagement.`,
        type: 'positive',
      });
    }

    // 5. Peak day insight from trends
    if (trends && trends.length >= 3) {
      const sorted = [...trends].sort((a, b) => b.responseCount - a.responseCount);
      const peakDay = sorted[0];
      if (peakDay && peakDay.responseCount > 0) {
        const dayName = new Date(peakDay.date).toLocaleDateString('en-US', { weekday: 'long' });
        cards.push({
          emoji: '📅',
          title: 'Peak Activity Day',
          description: `Most check-ins happen on ${dayName}s (${peakDay.responseCount} responses).`,
          type: 'neutral',
        });
      }
    }

    // 6. Top & bottom department
    if (departments && departments.length >= 2) {
      const sortedDepts = [...departments].filter((d) => d.responseCount > 0).sort((a, b) => b.averageMood - a.averageMood);
      const topDept = sortedDepts[0];
      const bottomDept = sortedDepts[sortedDepts.length - 1];

      if (topDept && bottomDept && topDept.departmentName !== bottomDept.departmentName) {
        cards.push({
          emoji: '🏆',
          title: 'Top Department',
          description: `${topDept.departmentName} leads with ${(topDept.averageMood ?? 0).toFixed(1)}/5 mood.`,
          type: 'positive',
        });

        if (bottomDept.averageMood < 3.0) {
          cards.push({
            emoji: '👀',
            title: 'Needs Attention',
            description: `${bottomDept.departmentName} has the lowest mood at ${(bottomDept.averageMood ?? 0).toFixed(1)}/5.`,
            type: 'warning',
          });
        }
      }
    }

    return cards;
  }, [overview, trends, departments]);

  if (!overview || insights.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-3">
        Insights
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={clsx(
              'rounded-xl border p-4 transition-colors',
              insight.type === 'positive'
                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/50'
                : insight.type === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50'
                  : 'bg-secondary-50 dark:bg-secondary-800/50 border-secondary-200 dark:border-secondary-700'
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{insight.emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-secondary-900 dark:text-white">{insight.title}</p>
                <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-0.5 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
