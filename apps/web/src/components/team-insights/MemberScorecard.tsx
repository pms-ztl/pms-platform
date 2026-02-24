import { useState, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface MemberScore {
  userId: string;
  name: string;
  score: number;
  zScore: number;
  category: 'high' | 'average' | 'low';
}

interface AtRiskEmployee {
  userId: string;
  riskLevel: string | null;
  overallScore: number;
}

interface MemberScorecardProps {
  members: MemberScore[];
  atRiskEmployees: AtRiskEmployee[];
  className?: string;
}

type SortField = 'name' | 'score' | 'risk';
type SortDir = 'asc' | 'desc';

const CATEGORY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'High' },
  average: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'On Track' },
  low: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Needs Focus' },
};

const RISK_BADGE: Record<string, { bg: string; text: string }> = {
  HIGH: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400' },
  MEDIUM: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400' },
  LOW: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400' },
};

export function MemberScorecard({ members, atRiskEmployees, className }: MemberScorecardProps) {
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const riskMap = useMemo(() => {
    const map = new Map<string, string>();
    atRiskEmployees.forEach((e) => {
      if (e.riskLevel) map.set(e.userId, e.riskLevel);
    });
    return map;
  }, [atRiskEmployees]);

  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name': return dir * (a.name ?? '').localeCompare(b.name ?? '');
        case 'score': return dir * (a.score - b.score);
        case 'risk': {
          const riskOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          const rA = riskOrder[riskMap.get(a.userId) || ''] || 0;
          const rB = riskOrder[riskMap.get(b.userId) || ''] || 0;
          return dir * (rA - rB);
        }
        default: return 0;
      }
    });
  }, [members, sortField, sortDir, riskMap]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = sortDir === 'asc' ? ChevronUpIcon : ChevronDownIcon;

  if (members.length === 0) {
    return (
      <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6', className)}>
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Team Members</h3>
        <p className="text-sm text-secondary-400 text-center py-8">No team members found.</p>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700', className)}>
      <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Team Members</h3>
        <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{members.length} direct reports</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-secondary-200 dark:divide-secondary-700">
          <thead className="bg-secondary-50 dark:bg-secondary-900/50">
            <tr>
              <th
                onClick={() => toggleSort('name')}
                className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300"
              >
                <span className="inline-flex items-center gap-1">
                  Name {sortField === 'name' && <SortIcon className="h-3 w-3" />}
                </span>
              </th>
              <th
                onClick={() => toggleSort('score')}
                className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300"
              >
                <span className="inline-flex items-center gap-1">
                  Score {sortField === 'score' && <SortIcon className="h-3 w-3" />}
                </span>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                Category
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                Z-Score
              </th>
              <th
                onClick={() => toggleSort('risk')}
                className="px-6 py-3 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400 cursor-pointer hover:text-secondary-700 dark:hover:text-secondary-300"
              >
                <span className="inline-flex items-center gap-1">
                  Risk {sortField === 'risk' && <SortIcon className="h-3 w-3" />}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-100 dark:divide-secondary-700">
            {sorted.map((member) => {
              const badge = CATEGORY_BADGE[member.category];
              const risk = riskMap.get(member.userId);
              const riskBadge = risk ? RISK_BADGE[risk] : null;
              const maxScore = Math.max(...members.map((m) => m.score), 1);

              return (
                <tr
                  key={member.userId}
                  className="hover:bg-secondary-50 dark:hover:bg-secondary-700/30 cursor-pointer transition-colors"
                  onClick={() => window.location.href = `/employees/${member.userId}`}
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(member.name ?? '').split(' ').map((n) => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <p className="text-sm font-medium text-secondary-900 dark:text-white">{member.name ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-20 h-2 bg-secondary-100 dark:bg-secondary-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(member.score / maxScore) * 100}%`,
                            backgroundColor: member.category === 'high' ? '#10b981' : member.category === 'average' ? '#3b82f6' : '#f59e0b',
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-secondary-700 dark:text-secondary-300 w-10 text-right">
                        {(member.score ?? 0).toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={clsx('inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full', badge.bg, badge.text)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={clsx(
                      'text-xs font-mono',
                      member.zScore >= 1 ? 'text-green-600 dark:text-green-400' :
                      member.zScore <= -1 ? 'text-red-600 dark:text-red-400' :
                      'text-secondary-500 dark:text-secondary-400'
                    )}>
                      {(member.zScore ?? 0) >= 0 ? '+' : ''}{(member.zScore ?? 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {riskBadge ? (
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full', riskBadge.bg, riskBadge.text)}>
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        {risk}
                      </span>
                    ) : (
                      <span className="text-[10px] text-secondary-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
