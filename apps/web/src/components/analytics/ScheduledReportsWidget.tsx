import { useQuery } from '@tanstack/react-query';
import { ClockIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';

import { reportsApi } from '@/lib/api';
import { Badge, SkeletonCard } from '@/components/ui';

interface ScheduledReportsWidgetProps {
  className?: string;
}

function ScheduledReportsWidget({ className = '' }: ScheduledReportsWidgetProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-schedules'],
    queryFn: () => reportsApi.listSchedules(),
    staleTime: 120_000,
  });

  if (isLoading) return <SkeletonCard />;

  const schedules: any[] = data ?? [];
  const activeSchedules = schedules.filter((s: any) => s.status === 'ACTIVE' || s.isActive);

  return (
    <div className={`glass-deep rounded-2xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-300">Scheduled Reports</h3>
        </div>
        <Link
          to="/reports"
          className="text-[11px] font-medium text-primary-600 dark:text-primary-400 hover:underline"
        >
          Manage
        </Link>
      </div>

      {!activeSchedules.length ? (
        <div className="text-center py-4">
          <CalendarDaysIcon className="w-8 h-8 text-secondary-300 dark:text-secondary-600 mx-auto mb-2" />
          <p className="text-xs text-secondary-500 dark:text-secondary-400">No active report schedules.</p>
          <Link
            to="/reports"
            className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline mt-1 inline-block"
          >
            Create a schedule &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeSchedules.slice(0, 4).map((schedule: any) => (
            <div
              key={schedule.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-secondary-50 dark:bg-secondary-800/50"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-secondary-800 dark:text-secondary-200 break-words">
                  {schedule.reportType ?? schedule.name ?? 'Report'}
                </p>
                <p className="text-[11px] text-secondary-500 dark:text-secondary-400">
                  {schedule.frequency ?? schedule.schedule ?? 'Custom'}
                </p>
              </div>
              <Badge variant="success" size="sm">Active</Badge>
            </div>
          ))}
          {activeSchedules.length > 4 && (
            <p className="text-[11px] text-secondary-400 dark:text-secondary-500 text-center">
              +{activeSchedules.length - 4} more schedules
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ScheduledReportsWidget;
