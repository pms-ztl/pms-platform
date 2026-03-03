import { UsersIcon } from '@heroicons/react/24/outline';

interface PeerComparisonProps {
  percentile: number | null;
  score: number;
  dimensions?: Array<{ code: string; rawScore: number; name: string }>;
}

function PeerComparison({ percentile, score, dimensions }: PeerComparisonProps) {
  if (percentile === null || percentile <= 0) {
    return null; // Don't render if no percentile data
  }

  const topPercent = Math.max(1, 100 - percentile);
  const position = percentile; // 0-100 where 100 is the best

  const getColor = () => {
    if (topPercent <= 10) return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', label: 'Exceptional' };
    if (topPercent <= 25) return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', label: 'Above Average' };
    if (topPercent <= 50) return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'Average' };
    return { bg: 'bg-secondary-400', text: 'text-secondary-600 dark:text-secondary-400', label: 'Developing' };
  };

  const colors = getColor();

  // Build distribution segments for the visual bar
  const segments = [
    { label: '0-25', width: '25%', opacity: 'opacity-20' },
    { label: '25-50', width: '25%', opacity: 'opacity-40' },
    { label: '50-75', width: '25%', opacity: 'opacity-60' },
    { label: '75-100', width: '25%', opacity: 'opacity-80' },
  ];

  return (
    <div className="glass-deep rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Peer Comparison</h3>
        </div>
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${colors.text} bg-current/10`}>
          Top {topPercent}%
        </div>
      </div>

      {/* Distribution bar */}
      <div className="relative mb-4">
        <div className="flex h-4 rounded-full overflow-hidden bg-secondary-100 dark:bg-secondary-800">
          {segments.map((seg, i) => (
            <div
              key={i}
              className={`${colors.bg} ${seg.opacity}`}
              style={{ width: seg.width }}
            />
          ))}
        </div>

        {/* Position marker */}
        <div
          className="absolute top-0 -mt-1 flex flex-col items-center"
          style={{ left: `${Math.min(97, Math.max(3, position))}%`, transform: 'translateX(-50%)' }}
        >
          <div className={`w-3 h-6 rounded-full ${colors.bg} ring-2 ring-white dark:ring-secondary-900 shadow-lg`} />
          <span className="text-2xs font-bold text-secondary-600 dark:text-secondary-400 mt-1">You</span>
        </div>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-secondary-500 dark:text-secondary-400">Your Score</span>
          <p className="text-lg font-bold text-secondary-900 dark:text-white">{Math.round(score)}<span className="text-xs text-secondary-400 font-normal">/100</span></p>
        </div>
        <div className="text-right">
          <span className="text-xs text-secondary-500 dark:text-secondary-400">Standing</span>
          <p className={`text-sm font-semibold ${colors.text}`}>{colors.label}</p>
        </div>
      </div>

      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-3">
        Anonymous comparison across your organization. No individual data is shared.
      </p>

      {/* Dimension Score Breakdown */}
      {dimensions && dimensions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-secondary-100 dark:border-white/[0.06]">
          <p className="text-xs font-semibold text-secondary-500 dark:text-secondary-400 mb-2.5">Score Breakdown</p>
          <div className="space-y-2">
            {dimensions.slice(0, 4).map((d) => {
              const barColor = d.rawScore >= 80 ? 'bg-emerald-500' : d.rawScore >= 60 ? 'bg-blue-500' : d.rawScore >= 40 ? 'bg-amber-500' : 'bg-red-400';
              return (
                <div key={d.code} className="flex items-center gap-2">
                  <span className="text-2xs font-medium text-secondary-500 dark:text-secondary-400 w-8 shrink-0">{d.code}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary-100 dark:bg-white/[0.06]">
                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(d.rawScore, 100)}%` }} />
                  </div>
                  <span className="text-2xs font-semibold text-secondary-600 dark:text-secondary-300 w-6 text-right">{Math.round(d.rawScore)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default PeerComparison;
