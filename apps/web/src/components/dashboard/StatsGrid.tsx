import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export interface StatItem {
  name: string;
  value: number | string;
  suffix?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  change: string;
  changeType: string;
  gradient: string;
  bgGradient: string;
  iconBg: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 perspective-container">
      {stats.map((stat, index) => (
        <div
          key={stat.name}
          className="group glass-stat card-3d-tilt p-6 cursor-pointer cascade-in spotlight-reveal frosted-noise"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {/* Top gradient line */}
          <div className={clsx('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500', stat.gradient)} />

          {/* Background orb */}
          <div className={clsx('absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br opacity-[0.06] group-hover:opacity-[0.12] group-hover:scale-125 transition-all duration-700', stat.gradient)} />

          <div className="relative z-10">
            <div className={clsx('inline-flex p-3 rounded-xl shadow-lg mb-4 group-hover:scale-110 group-hover:shadow-xl transition-all duration-300', stat.iconBg)}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">{stat.name}</p>
            <p className="text-3xl font-bold text-secondary-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left duration-300 counter-reveal">
              {stat.value}
              {stat.suffix && <span className="text-lg text-secondary-400">{stat.suffix}</span>}
            </p>
            <div className="mt-4 flex items-center gap-2">
              {stat.changeType === 'positive' && <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />}
              {stat.changeType === 'negative' && <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />}
              <span className={clsx(
                'text-sm font-medium',
                stat.changeType === 'positive' && 'text-emerald-600 dark:text-emerald-400',
                stat.changeType === 'negative' && 'text-red-600 dark:text-red-400',
                stat.changeType === 'neutral' && 'text-secondary-500 dark:text-secondary-400'
              )}>
                {stat.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsGrid;
