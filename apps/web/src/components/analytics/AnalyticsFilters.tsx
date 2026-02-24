import { FunnelIcon } from '@heroicons/react/24/outline';

export interface FilterState {
  months: number;
  cycleId: string;
}

interface AnalyticsFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  cycles?: Array<{ id: string; name: string }>;
}

function AnalyticsFilters({ filters, onChange, cycles }: AnalyticsFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1">
      <div className="flex items-center gap-1.5 text-secondary-500 dark:text-secondary-400">
        <FunnelIcon className="w-4 h-4" />
        <span className="text-xs font-medium tracking-wider">Filters</span>
      </div>

      {/* Time range */}
      <select
        value={filters.months}
        onChange={(e) => onChange({ ...filters, months: Number(e.target.value) })}
        className="text-xs rounded-lg border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl text-secondary-700 dark:text-secondary-300 px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value={3}>Last 3 months</option>
        <option value={6}>Last 6 months</option>
        <option value={12}>Last 12 months</option>
        <option value={24}>Last 2 years</option>
      </select>

      {/* Review cycle */}
      {cycles && cycles.length > 0 && (
        <select
          value={filters.cycleId}
          onChange={(e) => onChange({ ...filters, cycleId: e.target.value })}
          className="text-xs rounded-lg border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl text-secondary-700 dark:text-secondary-300 px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Cycles</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default AnalyticsFilters;
