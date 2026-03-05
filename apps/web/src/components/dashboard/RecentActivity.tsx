import { ChartBarIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface ActivityItem {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  title: string;
  desc: string;
  time: string;
}

interface RecentActivityProps {
  recentActivity: ActivityItem[];
}

function RecentActivity({ recentActivity }: RecentActivityProps) {
  return (
    <div className="glass-deep rounded-2xl overflow-hidden depth-shadow frosted-noise">
      <div className="card-header bg-gradient-to-r from-secondary-50/80 to-secondary-100/50 dark:from-white/[0.02] dark:to-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl shadow-lg shadow-primary-500/20">
            <ChartBarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-secondary-900 dark:text-white">Recent Activity</h2>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">Real events from your data</p>
          </div>
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1">
          {recentActivity.map((item, index) => (
            <div key={index} className="flex gap-3 group p-2.5 rounded-xl hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors cursor-pointer cascade-in" style={{ animationDelay: `${index * 0.08}s` }}>
              <div className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110 group-hover:shadow-lg',
                item.color === 'emerald' && 'bg-gradient-to-br from-emerald-500 to-teal-500',
                item.color === 'primary' && 'bg-gradient-to-br from-primary-500 to-cyan-500',
                item.color === 'violet' && 'bg-gradient-to-br from-violet-500 to-purple-500',
                item.color === 'amber' && 'bg-gradient-to-br from-amber-500 to-orange-500'
              )}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-secondary-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">{item.title}</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5 truncate">{item.desc}</p>
                <p className="text-2xs text-secondary-400 dark:text-secondary-500 mt-0.5">{item.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RecentActivity;
