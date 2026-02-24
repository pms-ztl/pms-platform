import { UserGroupIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import type { Goal } from '@/lib/api';

interface ManagerGoalCascadeProps {
  teamTreeData: Goal[];
  userId: string | undefined;
}

function ManagerGoalCascade({ teamTreeData, userId }: ManagerGoalCascadeProps) {
  // Compute cascade stats
  const countAll = (goals: Goal[]): { total: number; completed: number; progressSum: number; owners: Set<string> } => {
    const result = { total: 0, completed: 0, progressSum: 0, owners: new Set<string>() };
    const walk = (gs: Goal[]) => {
      for (const g of gs) {
        result.total++;
        result.progressSum += g.progress;
        if (g.progress >= 100 || g.status === 'COMPLETED') result.completed++;
        if (g.owner?.id) result.owners.add(g.owner.id);
        if (g.childGoals && g.childGoals.length > 0) walk(g.childGoals);
      }
    };
    walk(goals);
    return result;
  };
  const cascadeStats = countAll(teamTreeData);
  const avgTeamProgress = cascadeStats.total > 0 ? Math.round(cascadeStats.progressSum / cascadeStats.total) : 0;

  return (
    <div className="glass-deep rounded-2xl overflow-hidden morph-border depth-shadow">
      <div className="card-header bg-gradient-to-r from-purple-50/80 to-violet-50/50 dark:from-purple-500/[0.06] dark:to-violet-500/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl shadow-lg shadow-primary-500/20">
              <UserGroupIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Goal Cascade Overview</h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                Cascading goals across your team
              </p>
            </div>
          </div>
          <a href="/goals" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
            View tree &rarr;
          </a>
        </div>
      </div>
      <div className="card-body">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-purple-50 dark:bg-purple-500/[0.08] border-purple-100 dark:border-purple-500/10">
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{cascadeStats.total}</p>
            <p className="text-xs text-purple-600 dark:text-purple-400">Total Goals</p>
          </div>
          <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-emerald-50 dark:bg-emerald-500/[0.08] border-emerald-100 dark:border-emerald-500/10">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{cascadeStats.completed}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Completed</p>
          </div>
          <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-blue-50 dark:bg-blue-500/[0.08] border-blue-100 dark:border-blue-500/10">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{avgTeamProgress}%</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">Average Progress</p>
          </div>
          <div className="text-center p-4 rounded-xl border transition-all duration-300 elastic-scale bg-amber-50 dark:bg-amber-500/[0.08] border-amber-100 dark:border-amber-500/10">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{cascadeStats.owners.size}</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Team Members</p>
          </div>
        </div>

        {/* Top-level cascaded goals */}
        <div className="space-y-3">
          {teamTreeData.slice(0, 5).map((goal: Goal) => {
            const childCount = goal.childGoals?.length || 0;
            return (
              <a
                key={goal.id}
                href={`/goals/${goal.id}`}
                className="block p-4 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-md transition-all border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={clsx(
                      'text-2xs font-semibold px-1.5 py-0.5 rounded',
                      goal.type === 'COMPANY' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                        : goal.type === 'DEPARTMENT' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        : goal.type === 'TEAM' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
                        : 'bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-400'
                    )}>
                      {goal.type?.replace('_', ' ')}
                    </span>
                    <span className="text-sm font-medium text-secondary-900 dark:text-white break-words">{goal.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {childCount > 0 && (
                      <span className="text-xs text-secondary-400 dark:text-secondary-500">
                        {childCount} sub-goal{childCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-sm font-bold text-secondary-900 dark:text-white">{goal.progress}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary-200 dark:bg-secondary-700 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      goal.progress >= 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : goal.progress >= 50 ? 'bg-gradient-to-r from-primary-500 to-cyan-400'
                        : 'bg-gradient-to-r from-amber-500 to-orange-400'
                    )}
                    style={{ width: `${Math.min(goal.progress, 100)}%` }}
                  />
                </div>
                {/* Show owner if different from current user */}
                {goal.owner && goal.owner.id !== userId && (
                  <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1.5">
                    Owner: {goal.owner.firstName} {goal.owner.lastName}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ManagerGoalCascade;
