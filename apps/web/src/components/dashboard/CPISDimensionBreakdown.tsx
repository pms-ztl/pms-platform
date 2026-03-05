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
import { ChartBarIcon } from '@heroicons/react/20/solid';
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
              <h2 className="text-lg font-bold text-secondary-900 dark:text-white"><MetricTooltip code="CPIS">CPIS</MetricTooltip> Dimensions</h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">8-dimensional performance intelligence breakdown</p>
            </div>
          </div>
          {cpisData?.confidence && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-gradient-to-r from-cyan-100 to-violet-100 dark:from-cyan-500/[0.12] dark:to-violet-500/[0.1] text-violet-600 dark:text-violet-300 border border-violet-200/60 dark:border-violet-400/20 shadow-sm">
              <ChartBarIcon className="w-3.5 h-3.5" />
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
                  className="group relative p-4 rounded-xl bg-secondary-50/80 dark:bg-secondary-800/40 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700 cascade-in flex flex-col"
                  style={{ animationDelay: `${index * 0.06}s` }}
                >
                  {/* Top accent */}
                  <div className={clsx('absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity', dimColors[index])} />
                  {/* Grade badge — pinned top-right for uniform alignment */}
                  <span className={clsx('absolute top-3 right-3 text-xs font-black px-2 py-0.5 rounded z-10', gradeColor)}>
                    {dim.grade}
                  </span>
                  <div className="flex items-start gap-2 mb-2.5 pr-10">
                    <div className={clsx('p-1.5 rounded-lg bg-gradient-to-br shadow-sm flex-shrink-0 mt-0.5', dimColors[index])}>
                      <IconComp className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <MetricTooltip code={dim.code} className="text-sm font-bold text-secondary-700 dark:text-secondary-300 leading-tight">{dim.name}</MetricTooltip>
                      <span className="text-2xs text-secondary-400 dark:text-secondary-500 block">{Math.round(dim.weight * 100)}% weight</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 mb-2 mt-auto">
                    {dim.rawScore > 0 ? (
                      <>
                        <span className="text-xl font-bold text-secondary-900 dark:text-white">{Math.round(dim.rawScore)}</span>
                        <span className="text-xs text-secondary-400 mb-0.5">/100</span>
                      </>
                    ) : (
                      <span className="text-sm font-medium text-secondary-400 dark:text-secondary-500 italic">No data yet</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700/60 rounded-full overflow-hidden">
                    {dim.rawScore > 0 ? (
                      <div
                        className={clsx('h-full rounded-full bg-gradient-to-r transition-all duration-1000', dimColors[index])}
                        style={{ width: `${Math.min(100, dim.rawScore)}%` }}
                      />
                    ) : (
                      <div
                        className="h-full rounded-full bg-secondary-300/40 dark:bg-secondary-600/30 transition-all duration-1000"
                        style={{ width: '3%' }}
                      />
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Strengths & Growth Areas */}
        {(cpisData?.strengths?.length > 0 || cpisData?.growthAreas?.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-secondary-200/60 dark:border-secondary-700/40">
            {cpisData.strengths?.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 shadow-sm">
                  <TrophyIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Top Strengths</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cpisData.strengths.map((s: string) => (
                      <span key={s} className="text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{s}</span>
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
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1">Growth Areas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {cpisData.growthAreas.map((g: string) => (
                      <span key={g} className="text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{g}</span>
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
