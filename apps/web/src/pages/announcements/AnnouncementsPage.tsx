import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  MegaphoneIcon,
  ArchiveBoxIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  ClockIcon,
  EyeIcon,
  StarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TagIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { PageHeader } from '@/components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  status: string;
  category: string;
  targetAudience: string[];
  isPinned: boolean;
  scheduledAt?: string;
  expiresAt?: string;
  publishedAt?: string;
  author?: { id: string; firstName: string; lastName: string; avatarUrl?: string };
  createdAt: string;
  updatedAt: string;
}

interface CreateAnnouncementInput {
  title: string;
  content: string;
  priority: string;
  category: string;
  targetAudience: string[];
  scheduledAt?: string;
  expiresAt?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS = ['ALL', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
const STATUS_OPTIONS = ['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const CATEGORY_OPTIONS = ['ALL', 'GENERAL', 'REVIEW_CYCLE', 'POLICY_UPDATE', 'SYSTEM', 'RECOGNITION'] as const;
const AUDIENCE_OPTIONS = ['ALL_EMPLOYEES', 'MANAGERS', 'HR', 'DEPARTMENT'] as const;
const PAGE_SIZE = 10;

const priorityColors: Record<string, string> = {
  LOW: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  HIGH: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-200',
  PUBLISHED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  ARCHIVED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
};

const categoryLabels: Record<string, string> = {
  GENERAL: 'General',
  REVIEW_CYCLE: 'Review Cycle',
  POLICY_UPDATE: 'Policy Update',
  SYSTEM: 'System',
  RECOGNITION: 'Recognition',
};

const categoryColors: Record<string, string> = {
  GENERAL: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  REVIEW_CYCLE: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  POLICY_UPDATE: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  SYSTEM: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
  RECOGNITION: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
};

const audienceLabels: Record<string, string> = {
  ALL_EMPLOYEES: 'All Employees',
  MANAGERS: 'Managers',
  HR: 'HR',
  DEPARTMENT: 'Department',
};

const priorityIcons: Record<string, React.ReactNode> = {
  LOW: <InformationCircleIcon className="h-4 w-4" />,
  MEDIUM: <InformationCircleIcon className="h-4 w-4" />,
  HIGH: <ExclamationTriangleIcon className="h-4 w-4" />,
  CRITICAL: <ExclamationTriangleIcon className="h-4 w-4" />,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateContent(content: string, _maxLength = 150): string {
  return content;
}

function getInitials(firstName?: string, lastName?: string): string {
  return `${(firstName ?? '')[0] ?? ''}${(lastName ?? '')[0] ?? ''}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const isHRAdmin =
    user?.roles?.includes('HR_ADMIN') ||
    user?.roles?.includes('ADMIN') ||
    user?.roles?.includes('SUPER_ADMIN');
  const isManager = isHRAdmin || user?.roles?.includes('MANAGER');

  // Filters & pagination
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // ---- Queries ----
  const { data: listResult, isLoading } = useQuery({
    queryKey: ['announcements', { page, status: statusFilter, priority: priorityFilter }],
    queryFn: () =>
      api.getPaginated<Announcement>('/announcements', {
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(priorityFilter !== 'ALL' ? { priority: priorityFilter } : {}),
      }),
  });

  // ---- Mutations ----
  const createMutation = useMutation({
    mutationFn: (data: CreateAnnouncementInput) => api.post<Announcement>('/announcements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowCreateModal(false);
      setEditingAnnouncement(null);
      toast.success('Announcement created');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to create'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAnnouncementInput> }) =>
      api.put<Announcement>(`/announcements/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setShowCreateModal(false);
      setEditingAnnouncement(null);
      toast.success('Announcement updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setDeleteConfirmId(null);
      toast.success('Announcement deleted');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement published');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to publish'),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement archived');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to archive'),
  });

  const pinMutation = useMutation({
    mutationFn: (id: string) => api.post(`/announcements/${id}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Pin status updated');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to update pin'),
  });

  // ---- Derived data ----
  const announcements = listResult?.data ?? [];
  const meta = listResult?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  const filteredAnnouncements = useMemo(() => {
    let result = announcements;
    if (categoryFilter !== 'ALL') {
      result = result.filter((a) => a.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q),
      );
    }
    return result;
  }, [announcements, categoryFilter, search]);

  const pinnedAnnouncements = useMemo(
    () => filteredAnnouncements.filter((a) => a.isPinned && a.status === 'PUBLISHED'),
    [filteredAnnouncements],
  );

  const regularAnnouncements = useMemo(
    () => filteredAnnouncements.filter((a) => !(a.isPinned && a.status === 'PUBLISHED')),
    [filteredAnnouncements],
  );

  // Summary counts
  const totalCount = meta.total;
  const publishedCount = announcements.filter((a) => a.status === 'PUBLISHED').length;
  const draftCount = announcements.filter((a) => a.status === 'DRAFT').length;
  const criticalCount = announcements.filter((a) => a.priority === 'CRITICAL' && a.status === 'PUBLISHED').length;

  // ---- Modal form state ----
  const [formState, setFormState] = useState<{
    title: string;
    content: string;
    priority: string;
    category: string;
    targetAudience: string[];
    scheduledAt: string;
    expiresAt: string;
  }>({
    title: '',
    content: '',
    priority: 'MEDIUM',
    category: 'GENERAL',
    targetAudience: ['ALL_EMPLOYEES'],
    scheduledAt: '',
    expiresAt: '',
  });

  function openCreateModal() {
    setEditingAnnouncement(null);
    setFormState({
      title: '',
      content: '',
      priority: 'MEDIUM',
      category: 'GENERAL',
      targetAudience: ['ALL_EMPLOYEES'],
      scheduledAt: '',
      expiresAt: '',
    });
    setShowCreateModal(true);
  }

  function openEditModal(a: Announcement) {
    setEditingAnnouncement(a);
    setFormState({
      title: a.title,
      content: a.content,
      priority: a.priority,
      category: a.category,
      targetAudience: a.targetAudience ?? ['ALL_EMPLOYEES'],
      scheduledAt: a.scheduledAt ? format(new Date(a.scheduledAt), "yyyy-MM-dd'T'HH:mm") : '',
      expiresAt: a.expiresAt ? format(new Date(a.expiresAt), "yyyy-MM-dd'T'HH:mm") : '',
    });
    setShowCreateModal(true);
  }

  function toggleAudience(audience: string) {
    setFormState((s) => {
      const current = s.targetAudience;
      if (current.includes(audience)) {
        if (current.length === 1) return s; // keep at least one
        return { ...s, targetAudience: current.filter((a) => a !== audience) };
      }
      return { ...s, targetAudience: [...current, audience] };
    });
  }

  function handleSave(publish: boolean) {
    if (!formState.title.trim() || !formState.content.trim()) {
      toast.error('Please fill in the title and content');
      return;
    }
    const payload: CreateAnnouncementInput = {
      title: formState.title.trim(),
      content: formState.content.trim(),
      priority: formState.priority,
      category: formState.category,
      targetAudience: formState.targetAudience,
      scheduledAt: formState.scheduledAt || undefined,
      expiresAt: formState.expiresAt || undefined,
    };
    if (editingAnnouncement) {
      updateMutation.mutate(
        { id: editingAnnouncement.id, data: payload },
        {
          onSuccess: () => {
            if (publish) publishMutation.mutate(editingAnnouncement.id);
          },
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          if (publish && created?.id) publishMutation.mutate(created.id);
        },
      });
    }
  }

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <PageHeader title="Announcements" subtitle="Stay informed with company-wide announcements, policy updates, and recognitions">
        {isManager && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            New Announcement
          </button>
        )}
      </PageHeader>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<MegaphoneIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />}
          label="Total Announcements"
          value={totalCount}
          bgClass="bg-primary-50 dark:bg-primary-900/20"
        />
        <SummaryCard
          icon={<EyeIcon className="h-6 w-6 text-green-600 dark:text-green-400" />}
          label="Published"
          value={publishedCount}
          bgClass="bg-green-50 dark:bg-green-900/20"
        />
        <SummaryCard
          icon={<ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />}
          label="Drafts"
          value={draftCount}
          bgClass="bg-yellow-50 dark:bg-yellow-900/20"
        />
        <SummaryCard
          icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />}
          label="Critical Active"
          value={criticalCount}
          bgClass="bg-red-50 dark:bg-red-900/20"
        />
      </div>

      {/* ---- Category Tabs ---- */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategoryFilter(cat); setPage(1); }}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                categoryFilter === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200 dark:bg-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-600',
              )}
            >
              {cat === 'ALL' ? 'All Categories' : categoryLabels[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* ---- Filters Bar ---- */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-secondary-400" />
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
              className="input-field text-sm py-1.5"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p === 'ALL' ? 'All Priorities' : p.charAt(0) + p.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input-field text-sm py-1.5"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Statuses' : s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field text-sm py-1.5 pl-9 w-full"
            />
          </div>
        </div>
      </div>

      {/* ---- Pinned Announcements ---- */}
      {pinnedAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-secondary-700 dark:text-secondary-300 tracking-wider">
            <MapPinIcon className="h-4 w-4 text-amber-500" />
            Pinned Announcements
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pinnedAnnouncements.map((a) => (
              <div
                key={a.id}
                className="card card-body dark:bg-secondary-800 dark:border-secondary-700 border-l-4 border-l-amber-400 dark:border-l-amber-500 relative"
              >
                <div className="absolute top-3 right-3">
                  <StarIconSolid className="h-5 w-5 text-amber-400" />
                </div>
                <div className="flex items-start gap-3 pr-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', priorityColors[a.priority] ?? '')}>
                        {a.priority}
                      </span>
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', categoryColors[a.category] ?? '')}>
                        {categoryLabels[a.category] ?? a.category}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-secondary-900 dark:text-white mt-2">
                      {a.title}
                    </h3>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                      {truncateContent(a.content, 200)}
                    </p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-secondary-500 dark:text-secondary-400">
                      {a.author && (
                        <span className="flex items-center gap-1">
                          <AuthorAvatar author={a.author} size="sm" />
                          {a.author.firstName} {a.author.lastName}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        {format(new Date(a.publishedAt ?? a.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
                {/* Actions for pinned */}
                {isManager && (
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700">
                    <ActionBtn
                      icon={<PencilSquareIcon className="h-4 w-4" />}
                      title="Edit"
                      onClick={() => openEditModal(a)}
                    />
                    <ActionBtn
                      icon={<StarIcon className="h-4 w-4 text-amber-500" />}
                      title="Unpin"
                      onClick={() => pinMutation.mutate(a.id)}
                    />
                    <ActionBtn
                      icon={<ArchiveBoxIcon className="h-4 w-4 text-purple-500" />}
                      title="Archive"
                      onClick={() => archiveMutation.mutate(a.id)}
                    />
                    <ActionBtn
                      icon={<TrashIcon className="h-4 w-4 text-red-500" />}
                      title="Delete"
                      onClick={() => setDeleteConfirmId(a.id)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Main Announcements List ---- */}
      <div className="space-y-3">
        {pinnedAnnouncements.length > 0 && regularAnnouncements.length > 0 && (
          <h2 className="flex items-center gap-2 text-sm font-semibold text-secondary-700 dark:text-secondary-300 tracking-wider">
            <MegaphoneIcon className="h-4 w-4" />
            All Announcements
          </h2>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : regularAnnouncements.length === 0 && pinnedAnnouncements.length === 0 ? (
          <div className="card dark:bg-secondary-800 dark:border-secondary-700">
            <div className="text-center py-16">
              <MegaphoneIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
              <h3 className="mt-2 text-sm font-medium text-secondary-900 dark:text-white">
                No announcements found
              </h3>
              <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
                {isManager
                  ? 'Get started by creating your first announcement.'
                  : 'There are no announcements at this time. Check back later.'}
              </p>
              {isManager && (
                <button onClick={openCreateModal} className="btn-primary mt-4">
                  <PlusIcon className="h-5 w-5 mr-2 inline" />
                  New Announcement
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {regularAnnouncements.map((a) => {
              const isExpanded = expandedCard === a.id;
              return (
                <div
                  key={a.id}
                  className={clsx(
                    'card dark:bg-secondary-800 dark:border-secondary-700 overflow-hidden transition-shadow hover:shadow-md',
                    a.priority === 'CRITICAL' && a.status === 'PUBLISHED' && 'ring-1 ring-red-300 dark:ring-red-700',
                  )}
                >
                  {/* Card Header */}
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', priorityColors[a.priority] ?? '')}>
                          <span className="inline-flex items-center gap-1">
                            {priorityIcons[a.priority]}
                            {a.priority}
                          </span>
                        </span>
                        <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', statusColors[a.status] ?? '')}>
                          {a.status}
                        </span>
                      </div>
                      {a.isPinned && (
                        <StarIconSolid className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      )}
                    </div>

                    <h3
                      className="text-base font-semibold text-secondary-900 dark:text-white mt-3 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      onClick={() => setExpandedCard(isExpanded ? null : a.id)}
                    >
                      {a.title}
                    </h3>

                    <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1.5">
                      {isExpanded ? a.content : truncateContent(a.content)}
                    </p>

                    {a.content.length > 150 && (
                      <button
                        onClick={() => setExpandedCard(isExpanded ? null : a.id)}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}

                    {/* Category & Audience */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', categoryColors[a.category] ?? 'bg-secondary-100 text-secondary-700')}>
                        <TagIcon className="h-3 w-3 inline mr-0.5" />
                        {categoryLabels[a.category] ?? a.category}
                      </span>
                      <span className="text-xs text-secondary-400 dark:text-secondary-500 flex items-center gap-1">
                        <UserGroupIcon className="h-3 w-3" />
                        {(a.targetAudience ?? []).map((t) => audienceLabels[t] ?? t).join(', ') || 'All'}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 bg-secondary-50/50 dark:bg-secondary-900/30 border-t border-secondary-100 dark:border-secondary-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                        {a.author && (
                          <span className="flex items-center gap-1.5">
                            <AuthorAvatar author={a.author} size="sm" />
                            {a.author.firstName} {a.author.lastName}
                          </span>
                        )}
                        <span className="text-secondary-300 dark:text-secondary-600">|</span>
                        <span>{format(new Date(a.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {isManager && (
                        <div className="flex items-center gap-0.5">
                          <ActionBtn
                            icon={<PencilSquareIcon className="h-4 w-4" />}
                            title="Edit"
                            onClick={() => openEditModal(a)}
                          />
                          {a.status === 'DRAFT' && (
                            <ActionBtn
                              icon={<PaperAirplaneIcon className="h-4 w-4 text-green-600 dark:text-green-400" />}
                              title="Publish"
                              onClick={() => publishMutation.mutate(a.id)}
                            />
                          )}
                          {a.status === 'PUBLISHED' && (
                            <>
                              <ActionBtn
                                icon={
                                  a.isPinned
                                    ? <StarIconSolid className="h-4 w-4 text-amber-500" />
                                    : <StarIcon className="h-4 w-4 text-secondary-400" />
                                }
                                title={a.isPinned ? 'Unpin' : 'Pin'}
                                onClick={() => pinMutation.mutate(a.id)}
                              />
                              <ActionBtn
                                icon={<ArchiveBoxIcon className="h-4 w-4 text-purple-500" />}
                                title="Archive"
                                onClick={() => archiveMutation.mutate(a.id)}
                              />
                            </>
                          )}
                          <ActionBtn
                            icon={<TrashIcon className="h-4 w-4 text-red-500" />}
                            title="Delete"
                            onClick={() => setDeleteConfirmId(a.id)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Scheduled / Expires info */}
                    {(a.scheduledAt || a.expiresAt) && (
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-secondary-400 dark:text-secondary-500">
                        {a.scheduledAt && (
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            Scheduled: {format(new Date(a.scheduledAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                        {a.expiresAt && (
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="h-3 w-3" />
                            Expires: {format(new Date(a.expiresAt), 'MMM d, yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredAnnouncements.length > 0 && (
          <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                Showing {(meta.page - 1) * meta.limit + 1}
                {' '}-{' '}
                {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(meta.totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (meta.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= meta.totalPages - 2) {
                    pageNum = meta.totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={clsx(
                        'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                        page === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-600 dark:text-secondary-400',
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 disabled:opacity-40"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Delete Confirmation Modal ---- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl max-w-sm w-full">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Delete Announcement</h3>
                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-1">
                    Are you sure you want to delete this announcement? This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Create / Edit Modal ---- */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
              </h2>
              <button
                onClick={() => { setShowCreateModal(false); setEditingAnnouncement(null); }}
                className="p-1 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <XMarkIcon className="h-5 w-5 text-secondary-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                  placeholder="Announcement title..."
                  className="input-field text-sm w-full"
                  maxLength={200}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={8}
                  value={formState.content}
                  onChange={(e) => setFormState((s) => ({ ...s, content: e.target.value }))}
                  placeholder="Write your announcement content here. You can use line breaks for formatting..."
                  className="input-field text-sm w-full resize-none"
                />
                <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                  {formState.content.length} characters
                </p>
              </div>

              {/* Priority & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formState.priority}
                    onChange={(e) => setFormState((s) => ({ ...s, priority: e.target.value }))}
                    className="input-field text-sm w-full"
                  >
                    {PRIORITY_OPTIONS.filter((p) => p !== 'ALL').map((p) => (
                      <option key={p} value={p}>
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) => setFormState((s) => ({ ...s, category: e.target.value }))}
                    className="input-field text-sm w-full"
                  >
                    {CATEGORY_OPTIONS.filter((c) => c !== 'ALL').map((c) => (
                      <option key={c} value={c}>
                        {categoryLabels[c] ?? c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                  Target Audience
                </label>
                <div className="flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((aud) => {
                    const isSelected = formState.targetAudience.includes(aud);
                    return (
                      <button
                        key={aud}
                        type="button"
                        onClick={() => toggleAudience(aud)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                          isSelected
                            ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/30 dark:border-primary-600 dark:text-primary-300'
                            : 'bg-white border-secondary-200 text-secondary-600 hover:bg-secondary-50 dark:bg-secondary-900 dark:border-secondary-600 dark:text-secondary-400 dark:hover:bg-secondary-800',
                        )}
                      >
                        <UserGroupIcon className="h-3.5 w-3.5 inline mr-1" />
                        {audienceLabels[aud]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                  Select one or more target audiences
                </p>
              </div>

              {/* Scheduling */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    Scheduled At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formState.scheduledAt}
                    onChange={(e) => setFormState((s) => ({ ...s, scheduledAt: e.target.value }))}
                    className="input-field text-sm w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    <CalendarDaysIcon className="h-4 w-4 inline mr-1" />
                    Expires At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formState.expiresAt}
                    onChange={(e) => setFormState((s) => ({ ...s, expiresAt: e.target.value }))}
                    className="input-field text-sm w-full"
                  />
                </div>
              </div>

              {/* Preview */}
              {formState.title && (
                <div className="border border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg p-4">
                  <p className="text-xs font-medium text-secondary-400 dark:text-secondary-500 tracking-wider mb-2">
                    Preview
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', priorityColors[formState.priority] ?? '')}>
                      {formState.priority}
                    </span>
                    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', categoryColors[formState.category] ?? '')}>
                      {categoryLabels[formState.category] ?? formState.category}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-secondary-900 dark:text-white">
                    {formState.title}
                  </h4>
                  {formState.content && (
                    <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1 whitespace-pre-line">
                      {truncateContent(formState.content, 200)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-xs text-secondary-400 dark:text-secondary-500">
                    <UserGroupIcon className="h-3 w-3" />
                    {formState.targetAudience.map((t) => audienceLabels[t] ?? t).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-secondary-200 dark:border-secondary-700">
              <button
                onClick={() => { setShowCreateModal(false); setEditingAnnouncement(null); }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSave(false)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-secondary text-sm"
              >
                {editingAnnouncement ? 'Update Draft' : 'Save as Draft'}
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="btn-primary text-sm flex items-center gap-2"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                {editingAnnouncement ? 'Update & Publish' : 'Save & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  bgClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bgClass: string;
}) {
  return (
    <div className={clsx('card card-body dark:bg-secondary-800 dark:border-secondary-700 flex items-center gap-4', bgClass)}>
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium text-secondary-500 dark:text-secondary-400">{label}</p>
        <p className="text-2xl font-bold text-secondary-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors"
    >
      {icon}
    </button>
  );
}

function AuthorAvatar({
  author,
  size = 'sm',
}: {
  author: { firstName: string; lastName: string; avatarUrl?: string };
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-5 w-5' : 'h-8 w-8';
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-xs';

  if (author.avatarUrl) {
    return (
      <img
        src={author.avatarUrl}
        alt={`${author.firstName} ${author.lastName}`}
        className={clsx(dim, 'rounded-full object-cover')}
      />
    );
  }

  return (
    <div
      className={clsx(
        dim,
        textSize,
        'rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 flex items-center justify-center font-medium',
      )}
    >
      {getInitials(author.firstName, author.lastName)}
    </div>
  );
}
