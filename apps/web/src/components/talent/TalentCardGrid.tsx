import { useState } from 'react';
import { Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { TalentCard, type TalentCardData } from './TalentCard';

interface TalentCardGridProps {
  employees: TalentCardData[];
  compact?: boolean;
}

export function TalentCardGrid({ employees, compact = false }: TalentCardGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (employees.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-secondary-400">No employees to display</p>
      </div>
    );
  }

  return (
    <div>
      {/* View toggle */}
      {!compact && (
        <div className="flex items-center justify-end gap-1 mb-3">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              viewMode === 'grid' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-secondary-400 hover:text-secondary-600'
            )}
          >
            <Squares2X2Icon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              viewMode === 'list' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'text-secondary-400 hover:text-secondary-600'
            )}
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {viewMode === 'grid' || compact ? (
        <div className={clsx(
          'grid gap-3',
          compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        )}>
          {employees.map((emp) => (
            <TalentCard key={emp.id} data={emp} compact={compact} showActions={!compact} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => (
            <TalentCard key={emp.id} data={emp} compact showActions={false} />
          ))}
        </div>
      )}
    </div>
  );
}
