import {
  FlagIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftRightIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  BeakerIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import MetricTooltip from './MetricTooltip';

interface CPISDimensionBreakdownProps {
  dimensions: Array<{ code: string; rawScore: number; weight: number; name: string; grade?: string }>;
  cpisData: any;
}

function CPISDimensionBreakdown({ dimensions, cpisData }: CPISDimensionBreakdownProps) {
  if (dimensions.length === 0) return null;

  return (
    <div className="glass-deep rounded-2xl overflow-hidden depth-shadow">
      <div className="card-header bg-gradient-to-r from-cyan-50/80 to-violet-50/50 dark:from-cyan-500/[0.06] dark:to-violet-500/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl shadow-lg">
              <BeakerIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white"><MetricTooltip code="CPIS">CPIS</MetricTooltip> Dimensions</h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">8-dimensional performance intelligence breakdown</p>
            </div>
          </div>
          {cpisData?.confidence && (
            <span className="text-xs font-medium text-secondary-500 dark:text-secondary-400 bg-secondary-100 dark:bg-white/5 px-3 py-1 rounded-full">
              {cpisData.confidence.dataPoints} data points
            </span>
          )}
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(() => {
            const dimColors = [
              'from-blue-500 to-cyan-400',
              'from-violet-500 to-purple-400',
              'from-emerald-500 to-teal-400',
              'from-amber-500 to-orange-400',
              'from-rose-500 to-pink-400',
              'from-indigo-500 to-blue-400',
              'from-teal-500 to-cyan-400',
              'from-fuchsia-500 to-violet-400',
            ];
            const dimIcons = [FlagIcon, ClipboardDocumentCheckIcon, ChatBubbleLeftRightIcon, UserGroupIcon, ShieldCheckIcon, ArrowTrendingUpIcon, LightBulbIcon, RocketLaunchIcon];
            return dimensions.map((dim: any, index: number) => {
              const gradeColor = dim.grade === 'A+' || dim.grade === 'A' ? 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30'
                : dim.grade === 'B+' || dim.grade === 'B' ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
                : dim.grade === 'C+' || dim.grade === 'C' ? 'text-amber-500 bg-amber-100 dark:bg-amber-900/30'
                : 'text-red-500 bg-red-100 dark:bg-red-900/30';
              const IconComp = dimIcons[index] || BeakerIcon;
              return (
                <div
                  key={dim.code}
                  className="group relative p-4 rounded-xl bg-secondary-50/80 dark:bg-secondary-800/40 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700 cascade-in"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  {/* Top accent */}
                  <div className={clsx('absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity', dimColors[index])} />
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={clsx('p-1.5 rounded-lg bg-gradient-to-br shadow-sm', dimColors[index])}>
                        <IconComp className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <MetricTooltip code={dim.code} className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 leading-tight">{dim.name}</MetricTooltip>
                        <span className="text-3xs text-secondary-400 dark:text-secondary-500 block">{Math.round(dim.weight * 100)}% weight</span>
                      </div>
                    </div>
                    <span className={clsx('text-2xs font-black px-1.5 py-0.5 rounded', gradeColor)}>
                      {dim.grade}
                    </span>
                  </div>
                  <div className="flex items-end gap-1 mb-2">
                    <span className="text-2xl font-bold text-secondary-900 dark:text-white">{Math.round(dim.rawScore)}</span>
                    <span className="text-xs text-secondary-400 mb-0.5">/100</span>
                  </div>
                  <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700/60 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', dimColors[index])}
                      style={{ width: `${Math.min(100, dim.rawScore)}%` }}
                    />
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Strengths & Growth Areas */}
        {(cpisData?.strengths?.length > 0 || cpisData?.growthAreas?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-secondary-200/60 dark:border-secondary-700/40">
            {cpisData.strengths?.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 shadow-sm">
                  <TrophyIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Top Strengths</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cpisData.strengths.map((s: string) => (
                      <span key={s} className="text-2xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {cpisData.growthAreas?.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-400 shadow-sm">
                  <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Growth Areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cpisData.growthAreas.map((g: string) => (
                      <span key={g} className="text-2xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{g}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CPISDimensionBreakdown;
