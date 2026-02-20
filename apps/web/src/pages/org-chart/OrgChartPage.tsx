import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  MinusIcon,
  PlusIcon,
  ArrowPathIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { usersApi, getAvatarUrl, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { usePageTitle } from '@/hooks/usePageTitle';

// ============================================================================
// Types
// ============================================================================

interface TreeNode {
  user: User;
  children: TreeNode[];
}

// ============================================================================
// Constants
// ============================================================================

const MIN_DEPTH = 1;
const MAX_DEPTH = 5;
const DEBOUNCE_MS = 300;

const DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Product: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  Design: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  Marketing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Sales: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Finance: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  HR: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  Operations: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  Legal: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  Support: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

const DEFAULT_DEPT_COLOR = 'bg-secondary-100 text-secondary-700 dark:bg-secondary-700 dark:text-secondary-300';

// ============================================================================
// Helpers
// ============================================================================

function getDeptColor(deptName?: string): string {
  if (!deptName) return DEFAULT_DEPT_COLOR;
  for (const [key, cls] of Object.entries(DEPARTMENT_COLORS)) {
    if (deptName.toLowerCase().includes(key.toLowerCase())) return cls;
  }
  return DEFAULT_DEPT_COLOR;
}

function getInitials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

/**
 * Build a tree from a flat user list. Users with no manager (or whose manager
 * is not in the list) become root nodes.
 */
function buildTree(users: User[]): TreeNode[] {
  const userIds = new Set(users.map((u) => u.id));
  const childrenMap = new Map<string, User[]>();

  for (const u of users) {
    const managerId = u.manager?.id;
    if (managerId && userIds.has(managerId)) {
      const list = childrenMap.get(managerId) ?? [];
      list.push(u);
      childrenMap.set(managerId, list);
    }
  }

  function toNode(user: User): TreeNode {
    const kids = (childrenMap.get(user.id) ?? [])
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
    return { user, children: kids.map(toNode) };
  }

  // Root nodes: users with no manager, or whose manager is not in the list
  const roots = users
    .filter((u) => !u.manager?.id || !userIds.has(u.manager.id))
    .sort((a, b) => a.firstName.localeCompare(b.firstName));

  return roots.map(toNode);
}

/**
 * Count the total number of descendants (all levels) for a node.
 */
function countDescendants(node: TreeNode): number {
  let total = node.children.length;
  for (const child of node.children) {
    total += countDescendants(child);
  }
  return total;
}

/**
 * Client-side search: returns true if a user matches the search query on
 * first name, last name, or job title.
 */
function matchesSearch(user: User, query: string): boolean {
  const q = query.toLowerCase();
  const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
  const title = (user.jobTitle ?? '').toLowerCase();
  const dept = (user.department?.name ?? '').toLowerCase();
  return fullName.includes(q) || title.includes(q) || dept.includes(q);
}

/**
 * Filter a tree: keep any node that matches (or has a descendant that matches).
 * Returns null if neither this node nor any descendant matches.
 */
function filterTree(node: TreeNode, query: string): TreeNode | null {
  const filteredChildren = node.children
    .map((child) => filterTree(child, query))
    .filter(Boolean) as TreeNode[];

  if (matchesSearch(node.user, query) || filteredChildren.length > 0) {
    return { user: node.user, children: filteredChildren };
  }
  return null;
}

// ============================================================================
// useDebounce hook
// ============================================================================

function useDebounce(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

// ============================================================================
// OrgChartNode component
// ============================================================================

interface OrgChartNodeProps {
  node: TreeNode;
  depth: number;
  maxDepth: number;
  expandedSet: Set<string>;
  toggleExpand: (id: string) => void;
  onNavigate: (id: string) => void;
  currentUserId?: string;
  isRoot?: boolean;
}

function OrgChartNode({
  node,
  depth,
  maxDepth,
  expandedSet,
  toggleExpand,
  onNavigate,
  currentUserId,
  isRoot,
}: OrgChartNodeProps) {
  const { user, children } = node;
  const isExpanded = expandedSet.has(user.id);
  const hasChildren = children.length > 0;
  const canExpand = hasChildren && depth < maxDepth;
  const totalReports = countDescendants(node);
  const avatarSrc = getAvatarUrl(user.avatarUrl, 'sm');
  const isCurrentUser = user.id === currentUserId;

  return (
    <div className={clsx('relative', !isRoot && 'mt-1')}>
      {/* Connector line from parent */}
      {!isRoot && (
        <div className="absolute left-[-20px] top-0 bottom-0 w-px bg-secondary-200 dark:bg-white/[0.06]" />
      )}
      {!isRoot && (
        <div className="absolute left-[-20px] top-5 w-5 h-px bg-secondary-200 dark:bg-white/[0.06]" />
      )}

      {/* Node card */}
      <div className="flex items-start gap-0 py-1">
        {/* Expand/collapse toggle */}
        {canExpand ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(user.id);
            }}
            className={clsx(
              'flex-shrink-0 w-5 h-5 mt-3 mr-1 rounded flex items-center justify-center',
              'text-secondary-400 hover:text-secondary-700 dark:text-secondary-500 dark:hover:text-secondary-200',
              'hover:bg-secondary-100 dark:hover:bg-white/[0.04] transition-colors'
            )}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDownIcon className="h-3.5 w-3.5" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="flex-shrink-0 w-5 mr-1" />
        )}

        {/* Card */}
        <button
          onClick={() => onNavigate(user.id)}
          className={clsx(
            'group flex items-center gap-3 p-3 rounded-lg border transition-all text-left w-full max-w-md',
            'bg-white dark:bg-white/[0.04]',
            'border-secondary-200 dark:border-white/[0.06]',
            'hover:border-primary-300 dark:hover:border-primary-500/50',
            'hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20',
            isCurrentUser && 'ring-2 ring-primary-400/50 dark:ring-primary-500/30'
          )}
        >
          {/* Avatar */}
          <div className="flex-shrink-0 relative">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={`${user.firstName} ${user.lastName}`}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                  {getInitials(user.firstName, user.lastName)}
                </span>
              </div>
            )}
            {/* Active status dot */}
            <span
              className={clsx(
                'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-secondary-800',
                user.isActive ? 'bg-success-500' : 'bg-secondary-400'
              )}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-secondary-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {user.firstName} {user.lastName}
              </h3>
              {isCurrentUser && (
                <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded">
                  You
                </span>
              )}
            </div>
            <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
              {user.jobTitle || 'Employee'}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {user.department && (
                <span
                  className={clsx(
                    'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium',
                    getDeptColor(user.department.name)
                  )}
                >
                  <BuildingOfficeIcon className="h-2.5 w-2.5" />
                  {user.department.name}
                </span>
              )}
              {totalReports > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] text-secondary-400 dark:text-secondary-500">
                  <UsersIcon className="h-2.5 w-2.5" />
                  {totalReports} {totalReports === 1 ? 'report' : 'reports'}
                </span>
              )}
            </div>
          </div>

          {/* Chevron hint */}
          <ChevronRightIcon className="flex-shrink-0 h-4 w-4 text-secondary-300 dark:text-secondary-600 group-hover:text-primary-400 transition-colors" />
        </button>
      </div>

      {/* Children */}
      {canExpand && isExpanded && children.length > 0 && (
        <div className="ml-6 pl-5 relative">
          {/* Vertical connector for children */}
          <div className="absolute left-0 top-0 bottom-4 w-px bg-secondary-200 dark:bg-white/[0.06]" />
          {children.map((child, idx) => (
            <div key={child.user.id} className="relative">
              {/* Horizontal connector to child */}
              <div className="absolute left-0 top-5 w-5 h-px bg-secondary-200 dark:bg-white/[0.06]" />
              {/* Corner connector for last child */}
              {idx === children.length - 1 && (
                <div className="absolute left-0 top-5 bottom-0 w-px bg-white dark:bg-surface-dark" />
              )}
              <div className="ml-5">
                <OrgChartNode
                  node={child}
                  depth={depth + 1}
                  maxDepth={maxDepth}
                  expandedSet={expandedSet}
                  toggleExpand={toggleExpand}
                  onNavigate={onNavigate}
                  currentUserId={currentUserId}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Truncation notice when at max depth with hidden children */}
      {hasChildren && depth >= maxDepth && (
        <div className="ml-12 mt-1 mb-2">
          <span className="text-[10px] text-secondary-400 dark:text-secondary-500 italic">
            +{totalReports} more (increase depth to reveal)
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Loading skeleton
// ============================================================================

function OrgChartSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-5 h-5 mt-3" />
          <div className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 dark:border-white/[0.06] w-full max-w-md">
            <div className="w-10 h-10 rounded-full bg-secondary-200 dark:bg-secondary-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-secondary-200 dark:bg-secondary-700 rounded" />
              <div className="h-3 w-24 bg-secondary-200 dark:bg-secondary-700 rounded" />
              <div className="h-3 w-16 bg-secondary-200 dark:bg-secondary-700 rounded" />
            </div>
          </div>
        </div>
      ))}
      {[1, 2].map((i) => (
        <div key={`child-${i}`} className="flex items-start gap-3 ml-12">
          <div className="w-5 h-5 mt-3" />
          <div className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 dark:border-white/[0.06] w-full max-w-md">
            <div className="w-10 h-10 rounded-full bg-secondary-200 dark:bg-secondary-700" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 bg-secondary-200 dark:bg-secondary-700 rounded" />
              <div className="h-3 w-20 bg-secondary-200 dark:bg-secondary-700 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main page component
// ============================================================================

export function OrgChartPage() {
  usePageTitle('Org Chart');
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  // ── State ──
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, DEBOUNCE_MS);
  const [maxDepth, setMaxDepth] = useState(3);
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Data fetching ──
  const {
    data: orgChartUsers,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['users', 'org-chart'],
    queryFn: () => usersApi.getOrgChart(),
    staleTime: 5 * 60 * 1000,
  });

  // ── Build tree ──
  const tree = useMemo(() => {
    if (!orgChartUsers || orgChartUsers.length === 0) return [];
    return buildTree(orgChartUsers);
  }, [orgChartUsers]);

  // ── Filtered tree ──
  const filteredTree = useMemo(() => {
    if (!debouncedSearch.trim()) return tree;
    return tree
      .map((root) => filterTree(root, debouncedSearch.trim()))
      .filter(Boolean) as TreeNode[];
  }, [tree, debouncedSearch]);

  // ── Auto-expand root nodes on first load ──
  useEffect(() => {
    if (tree.length > 0 && expandedSet.size === 0) {
      const initialExpanded = new Set<string>();
      // Expand root nodes and their immediate children
      for (const root of tree) {
        initialExpanded.add(root.user.id);
        for (const child of root.children) {
          initialExpanded.add(child.user.id);
        }
      }
      setExpandedSet(initialExpanded);
    }
  }, [tree]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-expand all when searching ──
  useEffect(() => {
    if (debouncedSearch.trim()) {
      const allIds = new Set<string>();
      const collectIds = (node: TreeNode) => {
        allIds.add(node.user.id);
        node.children.forEach(collectIds);
      };
      filteredTree.forEach(collectIds);
      setExpandedSet(allIds);
    }
  }, [debouncedSearch, filteredTree]);

  // ── Toggle expansion ──
  const toggleExpand = useCallback((id: string) => {
    setExpandedSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Expand / collapse all ──
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectIds = (node: TreeNode) => {
      allIds.add(node.user.id);
      node.children.forEach(collectIds);
    };
    tree.forEach(collectIds);
    setExpandedSet(allIds);
  }, [tree]);

  const collapseAll = useCallback(() => {
    // Keep only root nodes expanded
    const rootIds = new Set(tree.map((t) => t.user.id));
    setExpandedSet(rootIds);
  }, [tree]);

  // ── Navigate to employee profile ──
  const handleNavigate = useCallback(
    (id: string) => {
      navigate(`/employees/${id}`);
    },
    [navigate]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    if (!orgChartUsers) return null;
    const total = orgChartUsers.length;
    const active = orgChartUsers.filter((u) => u.isActive).length;
    const departments = new Set(orgChartUsers.map((u) => u.department?.name).filter(Boolean));
    const managers = new Set(orgChartUsers.map((u) => u.manager?.id).filter(Boolean));
    return { total, active, departments: departments.size, managers: managers.size };
  }, [orgChartUsers]);

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            Organization Chart
          </h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Explore the team hierarchy and organizational structure
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-secondary-500 dark:text-secondary-400">
              <UsersIcon className="h-4 w-4" />
              <span>{stats.total} people</span>
            </div>
            <div className="flex items-center gap-1.5 text-secondary-500 dark:text-secondary-400">
              <BuildingOfficeIcon className="h-4 w-4" />
              <span>{stats.departments} depts</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div className="card card-body">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, title, or department..."
              className="input pl-10 w-full"
            />
          </div>

          {/* Depth control */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-4 w-4 text-secondary-400 dark:text-secondary-500" />
              <span className="text-sm text-secondary-600 dark:text-secondary-400 whitespace-nowrap">
                Depth: {maxDepth}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMaxDepth((d) => Math.max(MIN_DEPTH, d - 1))}
                disabled={maxDepth <= MIN_DEPTH}
                className={clsx(
                  'p-1.5 rounded-md border transition-colors',
                  maxDepth <= MIN_DEPTH
                    ? 'border-secondary-200 dark:border-secondary-700 text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
                    : 'border-secondary-200 dark:border-white/[0.06] text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-white/[0.04]'
                )}
                aria-label="Decrease depth"
              >
                <MinusIcon className="h-4 w-4" />
              </button>

              {/* Depth pips */}
              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: MAX_DEPTH }, (_, i) => i + 1).map((level) => (
                  <button
                    key={level}
                    onClick={() => setMaxDepth(level)}
                    className={clsx(
                      'w-2 h-2 rounded-full transition-colors',
                      level <= maxDepth
                        ? 'bg-primary-500 dark:bg-primary-400'
                        : 'bg-secondary-200 dark:bg-secondary-700'
                    )}
                    aria-label={`Set depth to ${level}`}
                  />
                ))}
              </div>

              <button
                onClick={() => setMaxDepth((d) => Math.min(MAX_DEPTH, d + 1))}
                disabled={maxDepth >= MAX_DEPTH}
                className={clsx(
                  'p-1.5 rounded-md border transition-colors',
                  maxDepth >= MAX_DEPTH
                    ? 'border-secondary-200 dark:border-secondary-700 text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
                    : 'border-secondary-200 dark:border-white/[0.06] text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-white/[0.04]'
                )}
                aria-label="Increase depth"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Expand / Collapse */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-secondary-200 dark:border-white/[0.06] text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-secondary-200 dark:border-white/[0.06] text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="card card-body">
          <OrgChartSkeleton />
        </div>
      ) : isError ? (
        <div className="card card-body text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-danger-400 dark:text-danger-500" />
          <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
            Failed to load organization chart
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {(error as Error)?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : filteredTree.length === 0 ? (
        <div className="card card-body text-center py-12">
          <UserGroupIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
            {debouncedSearch.trim()
              ? 'No matching employees'
              : 'No organization data available'}
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {debouncedSearch.trim()
              ? `No employees match "${debouncedSearch}". Try a different search term.`
              : 'Organization chart data has not been set up yet.'}
          </p>
          {debouncedSearch.trim() && (
            <button
              onClick={() => {
                setSearchInput('');
                searchRef.current?.focus();
              }}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-secondary-200 dark:border-white/[0.06] text-secondary-600 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="card card-body overflow-x-auto">
          <div className="min-w-max p-2">
            {filteredTree.map((rootNode) => (
              <OrgChartNode
                key={rootNode.user.id}
                node={rootNode}
                depth={1}
                maxDepth={maxDepth}
                expandedSet={expandedSet}
                toggleExpand={toggleExpand}
                onNavigate={handleNavigate}
                currentUserId={currentUser?.id}
                isRoot
              />
            ))}
          </div>

          {/* Search result count */}
          {debouncedSearch.trim() && (
            <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-white/[0.06]">
              <p className="text-xs text-secondary-400 dark:text-secondary-500">
                Showing results matching &quot;{debouncedSearch}&quot;
                {' '}&mdash;{' '}
                <button
                  onClick={() => {
                    setSearchInput('');
                    searchRef.current?.focus();
                  }}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  clear filter
                </button>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
