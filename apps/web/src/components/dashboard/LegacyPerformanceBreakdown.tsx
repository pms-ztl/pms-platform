import {
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LegacyPerformanceBreakdownProps {
  perfScore: any;
  goalAttainment: number;
  reviewScoreVal: number;
  feedbackScoreVal: number;
}

function LegacyPerformanceBreakdown({ perfScore, goalAttainment, reviewScoreVal, feedbackScoreVal }: LegacyPerformanceBreakdownProps) {
  const items = [
    { label: 'Goal Attainment', value: Math.round(goalAttainment), weight: perfScore.weights.goals, color: 'from-blue-500 to-cyan-400', icon: FlagIcon },
    { label: 'Review Score', value: Math.round(reviewScoreVal), weight: perfScore.weights.reviews, color: 'from-violet-500 to-purple-400', icon: ClipboardDocumentCheckIcon },
    { label: 'Feedback Sentiment', value: Math.round(feedbackScoreVal), weight: perfScore.weights.feedback, color: 'from-emerald-500 to-teal-400', icon: ChatBubbleLeftRightIcon },
    { label: 'Overall Score', value: Math.round(perfScore.overallScore), weight: 1.0, color: 'from-amber-500 to-orange-400', icon: BeakerIcon },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-container">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="glass-stat p-5 cascade-in holo-shimmer magnetic-glow"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={clsx('p-1.5 rounded-lg bg-gradient-to-br', item.color)}>
                  <item.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400">{item.label}</span>
              </div>
              <span className="text-2xs font-semibold text-secondary-400 dark:text-secondary-500 bg-secondary-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {Math.round(item.weight * 100)}%
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold text-secondary-900 dark:text-white">{item.value}</span>
              <span className="text-sm text-secondary-400 mb-0.5">/100</span>
            </div>
            <div className="mt-3 h-1.5 bg-secondary-100 dark:bg-white/5 rounded-full overflow-hidden">
              <div
                className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', item.color)}
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default LegacyPerformanceBreakdown;
