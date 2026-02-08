import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  CalendarDaysIcon,
  ClockIcon,
  MapPinIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { oneOnOnesApi, usersApi, type OneOnOne, type User } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ---------------------------------------------------------------------------
// Status badge configuration
// ---------------------------------------------------------------------------

const statusConfig: Record<string, { label: string; className: string }> = {
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
};

const durationOptions = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
];

const ITEMS_PER_PAGE = 9;

// ---------------------------------------------------------------------------
// Helper: user initials
// ---------------------------------------------------------------------------

function initials(firstName?: string, lastName?: string): string {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OneOnOnesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // UI state
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);

  // Form state for create modal
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');
  const [formDuration, setFormDuration] = useState(30);
  const [formLocation, setFormLocation] = useState('');
  const [formMeetingLink, setFormMeetingLink] = useState('');
  const [agendaItems, setAgendaItems] = useState<Array<{ topic: string }>>([{ topic: '' }]);

  // Reset page when switching tabs
  const handleTabChange = (tab: 'upcoming' | 'past') => {
    setActiveTab(tab);
    setPage(1);
  };

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const upcomingStatuses = 'SCHEDULED,IN_PROGRESS';
  const pastStatuses = 'COMPLETED,CANCELLED';

  const { data: upcomingData, isLoading: loadingUpcoming } = useQuery({
    queryKey: ['one-on-ones', 'upcoming', page],
    queryFn: () =>
      oneOnOnesApi.list({ status: upcomingStatuses, page, limit: ITEMS_PER_PAGE }),
    enabled: activeTab === 'upcoming',
  });

  const { data: pastData, isLoading: loadingPast } = useQuery({
    queryKey: ['one-on-ones', 'past', page],
    queryFn: () =>
      oneOnOnesApi.list({ status: pastStatuses, page, limit: ITEMS_PER_PAGE }),
    enabled: activeTab === 'past',
  });

  const { data: reports } = useQuery({
    queryKey: ['users', 'my-reports'],
    queryFn: () => usersApi.getMyReports(),
  });

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: (data: {
      employeeId: string;
      scheduledAt: string;
      duration: number;
      location?: string;
      meetingLink?: string;
      agenda?: Array<{ topic: string }>;
    }) =>
      oneOnOnesApi.create({
        employeeId: data.employeeId,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        duration: data.duration,
        location: data.location || undefined,
        meetingLink: data.meetingLink || undefined,
        agenda: data.agenda?.filter((a) => a.topic.trim()) || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-ones'] });
      resetForm();
      setShowCreateModal(false);
      toast.success('1-on-1 meeting scheduled successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to schedule meeting');
    },
  });

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  const resetForm = () => {
    setFormEmployeeId('');
    setFormScheduledAt('');
    setFormDuration(30);
    setFormLocation('');
    setFormMeetingLink('');
    setAgendaItems([{ topic: '' }]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmployeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!formScheduledAt) {
      toast.error('Please select a date and time');
      return;
    }
    createMutation.mutate({
      employeeId: formEmployeeId,
      scheduledAt: formScheduledAt,
      duration: formDuration,
      location: formLocation,
      meetingLink: formMeetingLink,
      agenda: agendaItems,
    });
  };

  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, { topic: '' }]);
  };

  const removeAgendaItem = (index: number) => {
    if (agendaItems.length <= 1) return;
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const updateAgendaItem = (index: number, topic: string) => {
    const updated = [...agendaItems];
    updated[index] = { topic };
    setAgendaItems(updated);
  };

  // ---------------------------------------------------------------------------
  // Determine the "other person" to display on each card
  // ---------------------------------------------------------------------------

  const otherParticipant = (meeting: OneOnOne) => {
    if (meeting.managerId === user?.id) {
      return meeting.employee;
    }
    return meeting.manager;
  };

  // ---------------------------------------------------------------------------
  // Derived data for current tab
  // ---------------------------------------------------------------------------

  const isLoading = activeTab === 'upcoming' ? loadingUpcoming : loadingPast;
  const currentData = activeTab === 'upcoming' ? upcomingData : pastData;
  const meetings: OneOnOne[] = currentData?.data || [];
  const totalPages = currentData?.meta?.totalPages || 1;

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderMeetingCard = (meeting: OneOnOne) => {
    const other = otherParticipant(meeting);
    const status = statusConfig[meeting.status] || statusConfig.SCHEDULED;
    const scheduledDate = new Date(meeting.scheduledAt);
    const agendaPreview = (meeting.agenda || []).slice(0, 2);
    const totalActionItems = (meeting.actionItems || []).length;
    const doneActionItems = (meeting.actionItems || []).filter((a) => a.done).length;

    return (
      <Link
        key={meeting.id}
        to={`/one-on-ones/${meeting.id}`}
        className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors p-5 flex flex-col"
      >
        {/* Top: Participant + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {other.avatarUrl ? (
              <img
                src={other.avatarUrl}
                alt={`${other.firstName} ${other.lastName}`}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                  {initials(other.firstName, other.lastName)}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-secondary-900 dark:text-white truncate">
                {other.firstName} {other.lastName}
              </p>
              {other.jobTitle && (
                <p className="text-xs text-secondary-500 dark:text-secondary-400 truncate">
                  {other.jobTitle}
                </p>
              )}
            </div>
          </div>
          <span
            className={clsx(
              'rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap flex-shrink-0',
              status.className
            )}
          >
            {status.label}
          </span>
        </div>

        {/* Date / Duration */}
        <div className="mt-4 flex items-center gap-4 text-sm text-secondary-500 dark:text-secondary-400">
          <span className="flex items-center gap-1">
            <CalendarDaysIcon className="h-4 w-4" />
            {format(scheduledDate, 'MMM d, yyyy')}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon className="h-4 w-4" />
            {format(scheduledDate, 'h:mm a')}
          </span>
          <span className="rounded-full bg-secondary-100 dark:bg-secondary-700 px-2 py-0.5 text-xs font-medium text-secondary-600 dark:text-secondary-300">
            {meeting.duration} min
          </span>
        </div>

        {/* Location / Meeting link */}
        {(meeting.location || meeting.meetingLink) && (
          <div className="mt-3 flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400">
            {meeting.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{meeting.location}</span>
              </span>
            )}
            {meeting.meetingLink && (
              <span className="flex items-center gap-1 truncate">
                <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">Meeting link</span>
              </span>
            )}
          </div>
        )}

        {/* Agenda preview */}
        {agendaPreview.length > 0 && (
          <div className="mt-3 space-y-1">
            {agendaPreview.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-secondary-600 dark:text-secondary-300">
                <ChatBubbleLeftRightIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-secondary-400" />
                <span className="line-clamp-1">{item.topic}</span>
              </div>
            ))}
            {(meeting.agenda || []).length > 2 && (
              <p className="text-xs text-secondary-400 dark:text-secondary-500 ml-6">
                +{(meeting.agenda || []).length - 2} more topic{(meeting.agenda || []).length - 2 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {/* Action items count */}
        {totalActionItems > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-secondary-500 dark:text-secondary-400">
            <ListBulletIcon className="h-4 w-4" />
            <span>
              {doneActionItems}/{totalActionItems} action item{totalActionItems !== 1 ? 's' : ''} done
            </span>
          </div>
        )}
      </Link>
    );
  };

  const renderEmptyState = () => {
    if (activeTab === 'upcoming') {
      return (
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 text-center py-16 px-6">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
          <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
            No upcoming 1-on-1 meetings
          </h3>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Schedule a 1-on-1 to connect with your team and discuss goals, feedback, and career growth.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-1.5" />
            Schedule 1-on-1
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 text-center py-16 px-6">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-secondary-300 dark:text-secondary-600" />
        <h3 className="mt-3 text-sm font-medium text-secondary-900 dark:text-white">
          No past meetings yet
        </h3>
        <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
          Completed and cancelled meetings will show up here.
        </p>
      </div>
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between pt-2">
        <p className="text-sm text-secondary-500 dark:text-secondary-400">
          Page {page} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={clsx(
              'inline-flex items-center border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              page <= 1
                ? 'border-secondary-200 dark:border-secondary-700 text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
                : 'border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
            )}
          >
            <ChevronLeftIcon className="h-4 w-4 mr-1" />
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={clsx(
              'inline-flex items-center border rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              page >= totalPages
                ? 'border-secondary-200 dark:border-secondary-700 text-secondary-300 dark:text-secondary-600 cursor-not-allowed'
                : 'border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700'
            )}
          >
            Next
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
            1-on-1 Meetings
          </h1>
          <p className="mt-1 text-secondary-600 dark:text-secondary-400">
            Schedule and track your 1-on-1 conversations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-1.5" />
          Schedule 1-on-1
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'upcoming' as const, label: 'Upcoming' },
            { key: 'past' as const, label: 'Past' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300 dark:text-secondary-400 dark:hover:text-secondary-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
        </div>
      ) : meetings.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {meetings.map((meeting) => renderMeetingCard(meeting))}
          </div>
          {renderPagination()}
        </>
      )}

      {/* ================================================================== */}
      {/* Create 1-on-1 Modal                                               */}
      {/* ================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                if (!createMutation.isPending) {
                  setShowCreateModal(false);
                  resetForm();
                }
              }}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 border border-secondary-200/50 dark:border-secondary-700/50 animate-scale-in">
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                  Schedule 1-on-1
                </h2>
                <button
                  onClick={() => {
                    if (!createMutation.isPending) {
                      setShowCreateModal(false);
                      resetForm();
                    }
                  }}
                  className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* Employee selector */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Employee
                  </label>
                  <select
                    value={formEmployeeId}
                    onChange={(e) => setFormEmployeeId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  >
                    <option value="">Select an employee...</option>
                    {(reports || []).map((report: User) => (
                      <option key={report.id} value={report.id}>
                        {report.firstName} {report.lastName}
                        {report.jobTitle ? ` - ${report.jobTitle}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date / Time */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formScheduledAt}
                    onChange={(e) => setFormScheduledAt(e.target.value)}
                    required
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Duration
                  </label>
                  <select
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value))}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  >
                    {durationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g., Conference Room B"
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  />
                </div>

                {/* Meeting link */}
                <div>
                  <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    Meeting Link
                  </label>
                  <input
                    type="url"
                    value={formMeetingLink}
                    onChange={(e) => setFormMeetingLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  />
                </div>

                {/* Agenda items */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300">
                      Agenda Topics
                    </label>
                    <button
                      type="button"
                      onClick={addAgendaItem}
                      className="inline-flex items-center text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                    >
                      <PlusIcon className="h-3.5 w-3.5 mr-0.5" />
                      Add Topic
                    </button>
                  </div>
                  <div className="space-y-2">
                    {agendaItems.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-secondary-400 dark:text-secondary-500 w-5 text-right flex-shrink-0">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={item.topic}
                          onChange={(e) => updateAgendaItem(index, e.target.value)}
                          placeholder={`Topic ${index + 1}`}
                          className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                        />
                        {agendaItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAgendaItem(index)}
                            className="text-secondary-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!createMutation.isPending) {
                        setShowCreateModal(false);
                        resetForm();
                      }
                    }}
                    disabled={createMutation.isPending}
                    className="border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createMutation.isPending ? 'Scheduling...' : 'Schedule Meeting'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
