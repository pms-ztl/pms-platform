import {
  FlagIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

import { riskBadge } from './dashboardUtils';

interface GoalsWithRiskProps {
  goalsData: any;
  goalRisks: any[] | undefined;
  goalMappings: any[] | undefined;
}

function GoalsWithRisk({ goalsData, goalRisks, goalMappings }: GoalsWithRiskProps) {
  const getRiskForGoal = (goalId: string) => goalRisks?.find((r: any) => r.goalId === goalId);
  const getMappingForGoal = (goalId: string) => goalMappings?.find((m: any) => m.goalId === goalId);

  return (
    <div className="lg:col-span-2 glass-deep rounded-2xl overflow-hidden group depth-shadow holo-shimmer">
      <div className="card-header flex items-center justify-between bg-gradient-to-r from-secondary-50/80 to-secondary-100/50 dark:from-white/[0.02] dark:to-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl shadow-lg group-hover:scale-110 group-hover:shadow-glow-sm transition-all duration-300">
            <FlagIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">My Goals</h2>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              {goalMappings && goalMappings.length > 0
                ? `Composite scores computed from ${goalMappings.reduce((s: number, m: any) => s + (m.childGoals?.length || 0), 0)} sub-goals`
                : 'Mathematical risk assessment per goal'}
            </p>
          </div>
        </div>
        <a href="/goals" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1 group/link neon-underline">
          View all
          <span className="group-hover/link:translate-x-1 transition-transform">&rarr;</span>
        </a>
      </div>
      <div className="card-body">
        {goalsData?.data?.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-cyan-100 dark:from-primary-900/30 dark:to-cyan-900/30 rounded-full animate-pulse" />
              <div className="absolute inset-2 bg-white dark:bg-secondary-800 rounded-full flex items-center justify-center">
                <FlagIcon className="w-10 h-10 text-secondary-300 dark:text-secondary-600" />
              </div>
            </div>
            <p className="text-secondary-500 dark:text-secondary-400 mb-2">No active goals yet</p>
            <a href="/goals" className="btn-primary inline-flex gap-2">
              <SparklesIcon className="w-4 h-4" />
              Create your first goal
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {goalsData?.data?.slice(0, 5).map((goal: any) => {
              const risk = getRiskForGoal(goal.id);
              const mapping = getMappingForGoal(goal.id);
              return (
                <div
                  key={goal.id}
                  className="group/item relative p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b from-primary-500 to-cyan-500"
                    style={{ opacity: goal.progress / 100 }}
                  />

                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0 pl-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-secondary-900 dark:text-white truncate">
                          {goal.title}
                        </h3>
                        {risk && riskBadge(risk.riskLevel)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="w-3 h-3" />
                          Due {goal.dueDate ? new Date(goal.dueDate).toLocaleDateString() : 'No date'}
                        </span>
                        {risk && risk.daysRemaining > 0 && (
                          <span>{risk.daysRemaining}d remaining</span>
                        )}
                        {mapping && mapping.compositeScore > 0 && (
                          <span className="text-primary-600 dark:text-primary-400 font-medium">
                            Composite: {mapping.compositeScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {goal.progress >= 100 && (
                        <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                      )}
                      <span className={clsx(
                        'text-lg font-bold',
                        goal.progress >= 100 ? 'text-emerald-500' : 'text-secondary-900 dark:text-white'
                      )}>
                        {goal.progress}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden ml-3">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden',
                        goal.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : goal.progress >= 70 ? 'bg-gradient-to-r from-primary-500 to-cyan-400'
                          : goal.progress >= 30 ? 'bg-gradient-to-r from-amber-500 to-orange-400'
                          : 'bg-gradient-to-r from-rose-500 to-pink-400'
                      )}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>

                  {/* Risk detail row */}
                  {risk && risk.riskLevel !== 'LOW' && (
                    <div className="mt-2 ml-3 flex items-center gap-4 text-xs">
                      <span className="text-secondary-400">
                        Schedule: <span className="font-medium text-secondary-600 dark:text-secondary-300">{risk.components.scheduleRisk}%</span>
                      </span>
                      <span className="text-secondary-400">
                        Velocity: <span className="font-medium text-secondary-600 dark:text-secondary-300">{risk.components.velocityRisk}%</span>
                      </span>
                      {risk.projectedCompletion < 100 && (
                        <span className="text-orange-500 font-medium">
                          Projected: {Math.round(risk.projectedCompletion)}% at deadline
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GoalsWithRisk;
