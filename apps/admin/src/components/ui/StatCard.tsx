import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  const isPositive = trend && trend.value >= 0;

  return (
    <div className={clsx('rounded-xl border border-gray-200 bg-white p-5 transition-all duration-200 hover:shadow-md', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={clsx('text-xs font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
                {isPositive ? '+' : ''}{trend.value}%
              </span>
              {trend.label && <span className="text-xs text-gray-400">{trend.label}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 rounded-xl bg-primary-50 p-2.5">
            <div className="h-6 w-6 text-primary-600">{icon}</div>
          </div>
        )}
      </div>
    </div>
  );
}
