import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChartBarIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  UserIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { usersApi, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ActivityHeatmap } from '@/components/realtime-performance/ActivityHeatmap';

export function TeamPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'org-chart'>('list');

  const isManager = user?.roles?.includes('MANAGER') || user?.roles?.includes('ADMIN');

  const { data: teamMembers, isLoading } = useQuery({
    queryKey: ['users', 'team', searchQuery],
    queryFn: () => usersApi.list({ search: searchQuery || undefined, limit: 50 }),
  });

  const { data: directReports } = useQuery({
    queryKey: ['users', 'my-reports'],
    queryFn: () => usersApi.getMyReports(),
    enabled: isManager,
  });

  const { data: orgChart } = useQuery({
    queryKey: ['users', 'org-chart'],
    queryFn: () => usersApi.getOrgChart(),
    enabled: viewMode === 'org-chart',
  });

  const renderUserCard = (member: User, showRole = false) => (
    <div
      key={member.id}
      className="card card-body hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={`${member.firstName} ${member.lastName}`}
              className="w-12 h-12 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <span className="text-lg font-medium text-primary-700 dark:text-primary-300">
                {member.firstName?.[0]}{member.lastName?.[0]}
              </span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-secondary-900 dark:text-white">
              {member.firstName} {member.lastName}
            </h3>
            {member.id === user?.id && (
              <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded text-xs">You</span>
            )}
            {!member.isActive && (
              <span className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 rounded text-xs">Inactive</span>
            )}
          </div>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">{member.jobTitle || 'Employee'}</p>
          <div className="flex items-center gap-4 mt-1 text-xs text-secondary-400 dark:text-secondary-500">
            {member.department && (
              <span className="flex items-center gap-1">
                <BuildingOfficeIcon className="h-3.5 w-3.5" />
                {member.department.name}
              </span>
            )}
            {member.manager && (
              <span className="flex items-center gap-1">
                <UserIcon className="h-3.5 w-3.5" />
                Reports to {member.manager.firstName} {member.manager.lastName}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${member.email}`}
            className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:bg-secondary-700 dark:hover:text-secondary-200 rounded-lg transition-colors"
            title="Send email"
          >
            <EnvelopeIcon className="h-5 w-5" />
          </a>
          <Link
            to={`/feedback?to=${member.id}`}
            className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 dark:hover:text-primary-400 rounded-lg transition-colors"
            title="Give feedback"
          >
            <ChartBarIcon className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );

  const renderOrgChart = () => {
    if (!orgChart || orgChart.length === 0) {
      return (
        <div className="text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <p className="mt-2 text-secondary-600 dark:text-secondary-400">No organization data available.</p>
        </div>
      );
    }

    const buildTree = (users: User[], managerId?: string): User[] => {
      return users.filter((u) => u.manager?.id === managerId || (!managerId && !u.manager));
    };

    const renderTreeNode = (user: User, level = 0) => {
      const children = buildTree(orgChart, user.id);

      return (
        <div key={user.id} className={clsx('relative', level > 0 && 'ml-8')}>
          {level > 0 && (
            <div className="absolute left-[-16px] top-6 w-4 border-b border-l border-secondary-300 dark:border-secondary-600 h-6 rounded-bl-lg" />
          )}
          <div className="py-2">
            <div className="inline-flex items-center gap-3 p-3 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg shadow-sm">
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-900 dark:text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">{user.jobTitle || 'Employee'}</p>
              </div>
              {children.length > 0 && (
                <ChevronRightIcon className="h-4 w-4 text-secondary-400" />
              )}
            </div>
          </div>
          {children.length > 0 && (
            <div className="border-l border-secondary-300 dark:border-secondary-600 ml-5">
              {children.map((child) => renderTreeNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    const rootUsers = buildTree(orgChart);
    return (
      <div className="overflow-x-auto">
        <div className="min-w-max p-4">
          {rootUsers.map((user) => renderTreeNode(user))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Team</h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">View your team members and organization structure</p>
        </div>
      </div>

      {/* Direct reports section (for managers) */}
      {isManager && directReports && directReports.length > 0 && (
        <div className="card card-body">
          <h2 className="text-lg font-medium text-secondary-900 dark:text-white mb-4 flex items-center">
            <UserGroupIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
            Your Direct Reports ({directReports.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {directReports.map((report: User) => (
              <div
                key={report.id}
                className="flex items-center gap-3 p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors bg-white dark:bg-secondary-800/50"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {report.firstName?.[0]}{report.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-900 dark:text-white truncate">
                    {report.firstName} {report.lastName}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">{report.jobTitle}</p>
                </div>
                <Link
                  to={`/reviews?reviewee=${report.id}`}
                  className="text-xs text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Reviews
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Activity Heatmap (for managers) */}
      {isManager && (
        <ActivityHeatmap mode="team" />
      )}

      {/* View toggle and search */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white'
            )}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('org-chart')}
            className={clsx(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              viewMode === 'org-chart'
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                : 'text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-white'
            )}
          >
            Org Chart
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : !teamMembers?.data.length ? (
          <div className="card card-body text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
            <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">No team members found</h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
              {searchQuery ? 'Try adjusting your search query.' : 'No team data available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {teamMembers.data.map((member: User) => renderUserCard(member))}
          </div>
        )
      ) : (
        <div className="card card-body">
          {renderOrgChart()}
        </div>
      )}
    </div>
  );
}
