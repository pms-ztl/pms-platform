import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { usersApi, getAvatarUrl, type User, type Department } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

// Deterministic color from user name for avatar initials
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-pink-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

type ViewMode = 'card' | 'list';
type ActiveFilter = 'all' | 'active' | 'inactive';

export function EmployeeDirectoryPage() {
  usePageTitle('Employee Directory');
  const navigate = useNavigate();

  // Filters & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset to page 1 when filters change
  const params = useMemo(() => {
    setPage(1);
    return {
      page: 1,
      limit: pageSize,
      search: debouncedSearch || undefined,
      departmentId: departmentFilter || undefined,
      isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    };
  }, [debouncedSearch, departmentFilter, activeFilter, pageSize]);

  // Build actual query params with current page
  const queryParams = useMemo(
    () => ({ ...params, page }),
    [params, page]
  );

  // Fetch employees
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users', 'directory', queryParams],
    queryFn: () => usersApi.list(queryParams),
  });

  // Fetch departments for filter dropdown
  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: () => usersApi.listDepartments(),
  });

  const users = usersData?.data ?? [];
  const meta = usersData?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const totalCount = meta?.total ?? 0;

  // Navigation
  const handleEmployeeClick = (userId: string) => {
    navigate(`/employees/${userId}`);
  };

  // Pagination helpers
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('ellipsis');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  // ── Skeletons ──

  const CardSkeleton = () => (
    <div className="card card-body animate-pulse">
      <div className="flex flex-col items-center text-center space-y-3 py-2">
        <div className="w-16 h-16 rounded-full bg-secondary-200 dark:bg-secondary-700" />
        <div className="space-y-2 w-full">
          <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-3/4 mx-auto" />
          <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-1/2 mx-auto" />
          <div className="h-5 bg-secondary-200 dark:bg-secondary-700 rounded-full w-24 mx-auto" />
        </div>
        <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-2/3 mx-auto" />
      </div>
    </div>
  );

  const ListRowSkeleton = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-200 dark:bg-secondary-700" />
          <div className="space-y-1.5">
            <div className="h-4 bg-secondary-200 dark:bg-secondary-700 rounded w-32" />
            <div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-44" />
          </div>
        </div>
      </td>
      <td className="px-6 py-4"><div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-28" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-secondary-200 dark:bg-secondary-700 rounded-full w-20" /></td>
      <td className="px-6 py-4"><div className="h-3 bg-secondary-200 dark:bg-secondary-700 rounded w-24" /></td>
      <td className="px-6 py-4"><div className="h-5 bg-secondary-200 dark:bg-secondary-700 rounded-full w-16" /></td>
    </tr>
  );

  // ── Avatar component ──

  const Avatar = ({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' }) => {
    const url = getAvatarUrl(user.avatarUrl, 'sm');
    const initials = getInitials(user.firstName, user.lastName);
    const color = getAvatarColor(`${user.firstName}${user.lastName}`);
    const sizeClass = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-16 h-16 text-lg';

    if (url) {
      return (
        <img
          src={url}
          alt={`${user.firstName} ${user.lastName}`}
          className={clsx(sizeClass, 'rounded-full object-cover')}
        />
      );
    }

    return (
      <div className={clsx(sizeClass, color, 'rounded-full flex items-center justify-center text-white font-semibold')}>
        {initials}
      </div>
    );
  };

  // ── Card View ──

  const renderCardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {users.map((user) => (
        <div
          key={user.id}
          onClick={() => handleEmployeeClick(user.id)}
          className="card card-body cursor-pointer hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-md transition-all duration-200"
        >
          <div className="flex flex-col items-center text-center space-y-3 py-2">
            {/* Avatar */}
            <div className="relative">
              <Avatar user={user} size="md" />
              <span
                className={clsx(
                  'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-secondary-800',
                  user.isActive ? 'bg-green-500' : 'bg-red-500'
                )}
              />
            </div>

            {/* Name & Title */}
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">
                {user.jobTitle || 'Employee'}
              </p>
            </div>

            {/* Department badge */}
            {user.department && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <BuildingOfficeIcon className="h-3 w-3" />
                {user.department.name}
              </span>
            )}

            {/* Manager */}
            {user.manager && (
              <p className="text-xs text-secondary-400 dark:text-secondary-500">
                Reports to {user.manager.firstName} {user.manager.lastName}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // ── List View ──

  const renderListView = () => (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-secondary-200 dark:border-white/[0.06]">
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                Manager
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-white/[0.06]">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <ListRowSkeleton key={i} />)
              : users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleEmployeeClick(user.id)}
                    className="cursor-pointer hover:bg-secondary-50 dark:hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-secondary-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-xs text-secondary-500 dark:text-secondary-400">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 dark:text-secondary-300">
                      {user.jobTitle || '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.department ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                          {user.department.name}
                        </span>
                      ) : (
                        <span className="text-sm text-secondary-400 dark:text-secondary-500">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 dark:text-secondary-300">
                      {user.manager
                        ? `${user.manager.firstName} ${user.manager.lastName}`
                        : '--'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          user.isActive
                            ? 'bg-success-100 text-success-700 dark:bg-success-900/50 dark:text-success-300'
                            : 'bg-danger-100 text-danger-700 dark:bg-danger-900/50 dark:text-danger-300'
                        )}
                      >
                        <span
                          className={clsx(
                            'w-1.5 h-1.5 rounded-full',
                            user.isActive ? 'bg-green-500' : 'bg-red-500'
                          )}
                        />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ── Empty state ──

  const renderEmptyState = () => (
    <div className="card card-body flex flex-col items-center justify-center py-16 text-center">
      <div className="w-24 h-24 rounded-full bg-secondary-100 dark:bg-secondary-800 flex items-center justify-center mb-6">
        <UserGroupIcon className="h-12 w-12 text-secondary-400 dark:text-secondary-500" />
      </div>
      <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
        No employees found
      </h3>
      <p className="mt-2 text-sm text-secondary-500 dark:text-secondary-400 max-w-sm">
        {debouncedSearch || departmentFilter || activeFilter !== 'all'
          ? 'Try adjusting your search or filter criteria to find the employees you are looking for.'
          : 'There are no employees in the directory yet.'}
      </p>
      {(debouncedSearch || departmentFilter || activeFilter !== 'all') && (
        <button
          onClick={() => {
            setSearchQuery('');
            setDepartmentFilter('');
            setActiveFilter('all');
          }}
          className="mt-4 btn-secondary text-sm"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  // ── Loading skeleton for card view ──

  const renderCardSkeletons = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="Employee Directory" subtitle="Browse and search employees across your organization" />

      {/* Filters bar */}
      <div className="card card-body">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="input pl-10 w-full"
            />
          </div>

          {/* Department filter */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400 pointer-events-none" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="input pl-9 pr-8 min-w-[180px]"
              >
                <option value="">All Departments</option>
                {departments?.map((dept: Department) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Active status filter */}
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              className="input min-w-[130px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {/* View toggle */}
            <div className="flex items-center bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                title="Card view"
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'card'
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-white'
                )}
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-white'
                )}
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="mt-3 text-xs text-secondary-500 dark:text-secondary-400">
            Showing {users.length} of {totalCount} employee{totalCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === 'card' ? renderCardSkeletons() : renderListView()
      ) : users.length === 0 ? (
        renderEmptyState()
      ) : viewMode === 'card' ? (
        renderCardView()
      ) : (
        renderListView()
      )}

      {/* Pagination */}
      {!isLoading && users.length > 0 && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2 text-sm text-secondary-600 dark:text-secondary-400">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="input py-1.5 px-2 text-sm w-auto"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canGoPrev}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                canGoPrev
                  ? 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800'
                  : 'text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
              )}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>

            {pageNumbers.map((p, idx) =>
              p === 'ellipsis' ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 text-secondary-400 dark:text-secondary-500"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={clsx(
                    'min-w-[36px] h-9 px-2 rounded-lg text-sm font-medium transition-colors',
                    page === p
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800'
                  )}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={!canGoNext}
              className={clsx(
                'p-2 rounded-lg transition-colors',
                canGoNext
                  ? 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-800'
                  : 'text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
              )}
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
