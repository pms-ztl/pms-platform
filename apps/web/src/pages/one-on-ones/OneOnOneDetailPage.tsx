import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { oneOnOnesApi, type OneOnOne } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import {
  ArrowLeftIcon,
  PlayIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  ClockIcon,
  MapPinIcon,
  LinkIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Status badge color map
// ---------------------------------------------------------------------------
const statusBadgeColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

// ---------------------------------------------------------------------------
// Timeline helpers
// ---------------------------------------------------------------------------
interface TimelineEntry {
  label: string;
  timestamp: string;
  icon: 'scheduled' | 'started' | 'completed' | 'cancelled';
}

function buildTimeline(meeting: OneOnOne): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  entries.push({ label: 'Meeting created', timestamp: meeting.createdAt, icon: 'scheduled' });
  if (meeting.scheduledAt) {
    entries.push({ label: 'Scheduled', timestamp: meeting.scheduledAt, icon: 'scheduled' });
  }
  if (meeting.status === 'IN_PROGRESS' || meeting.status === 'COMPLETED') {
    entries.push({ label: 'Meeting started', timestamp: meeting.scheduledAt, icon: 'started' });
  }
  if (meeting.status === 'COMPLETED' && meeting.completedAt) {
    entries.push({ label: 'Meeting completed', timestamp: meeting.completedAt, icon: 'completed' });
  }
  if (meeting.status === 'CANCELLED') {
    entries.push({ label: 'Meeting cancelled', timestamp: meeting.createdAt, icon: 'cancelled' });
  }
  return entries;
}

const timelineIconColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  started: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400',
  completed: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function OneOnOneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // ---- Local state for editable fields ----
  const [managerNotes, setManagerNotes] = useState<string | null>(null);
  const [employeeNotes, setEmployeeNotes] = useState<string | null>(null);
  const [sharedNotes, setSharedNotes] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<Array<{ title: string; done: boolean; assignee?: string }> | null>(null);
  const [newActionTitle, setNewActionTitle] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // ---- Data fetching ----
  const { data: meeting, isLoading, error } = useQuery({
    queryKey: ['one-on-one', id],
    queryFn: () => oneOnOnesApi.getById(id!),
    enabled: !!id,
  });

  // Sync local state from fetched data when it first arrives
  const initLocalState = useCallback(
    (m: OneOnOne) => {
      if (managerNotes === null) setManagerNotes(m.managerNotes ?? '');
      if (employeeNotes === null) setEmployeeNotes(m.employeeNotes ?? '');
      if (sharedNotes === null) setSharedNotes(m.sharedNotes ?? '');
      if (actionItems === null) setActionItems(m.actionItems ?? []);
    },
    [managerNotes, employeeNotes, sharedNotes, actionItems],
  );

  if (meeting && managerNotes === null) {
    initLocalState(meeting);
  }

  // ---- Permission helpers ----
  const isManager = user?.id === meeting?.managerId;
  const isEmployee = user?.id === meeting?.employeeId;
  const isParticipant = isManager || isEmployee;

  // ---- Derive the other person's name ----
  const otherPerson = isManager ? meeting?.employee : meeting?.manager;

  // ---- Mutations ----
  const updateMutation = useMutation({
    mutationFn: (data: Parameters<typeof oneOnOnesApi.update>[1]) =>
      oneOnOnesApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one', id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save changes');
    },
  });

  const startMutation = useMutation({
    mutationFn: () => oneOnOnesApi.start(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one', id] });
      queryClient.invalidateQueries({ queryKey: ['one-on-ones'] });
      toast.success('Meeting started');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to start meeting');
    },
  });

  const completeMutation = useMutation({
    mutationFn: () =>
      oneOnOnesApi.complete(id!, {
        sharedNotes: sharedNotes ?? undefined,
        actionItems: actionItems ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one', id] });
      queryClient.invalidateQueries({ queryKey: ['one-on-ones'] });
      toast.success('Meeting completed');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to complete meeting');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => oneOnOnesApi.cancel(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['one-on-one', id] });
      queryClient.invalidateQueries({ queryKey: ['one-on-ones'] });
      setShowCancelConfirm(false);
      toast.success('Meeting cancelled');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel meeting');
    },
  });

  // ---- Auto-save helpers (on blur) ----
  const handleManagerNotesBlur = useCallback(() => {
    if (meeting && managerNotes !== (meeting.managerNotes ?? '')) {
      updateMutation.mutate({ managerNotes: managerNotes ?? '' });
    }
  }, [meeting, managerNotes, updateMutation]);

  const handleEmployeeNotesBlur = useCallback(() => {
    if (meeting && employeeNotes !== (meeting.employeeNotes ?? '')) {
      updateMutation.mutate({ employeeNotes: employeeNotes ?? '' });
    }
  }, [meeting, employeeNotes, updateMutation]);

  const handleSharedNotesBlur = useCallback(() => {
    if (meeting && sharedNotes !== (meeting.sharedNotes ?? '')) {
      updateMutation.mutate({ sharedNotes: sharedNotes ?? '' });
    }
  }, [meeting, sharedNotes, updateMutation]);

  // ---- Action items helpers ----
  const handleToggleActionItem = (index: number) => {
    if (!actionItems) return;
    const updated = actionItems.map((item, i) =>
      i === index ? { ...item, done: !item.done } : item,
    );
    setActionItems(updated);
    updateMutation.mutate({ actionItems: updated });
  };

  const handleAddActionItem = () => {
    if (!newActionTitle.trim()) return;
    const updated = [
      ...(actionItems ?? []),
      { title: newActionTitle.trim(), done: false, assignee: undefined },
    ];
    setActionItems(updated);
    setNewActionTitle('');
    updateMutation.mutate({ actionItems: updated });
  };

  const handleRemoveActionItem = (index: number) => {
    if (!actionItems) return;
    const updated = actionItems.filter((_, i) => i !== index);
    setActionItems(updated);
    updateMutation.mutate({ actionItems: updated });
  };

  // ---- Loading state ----
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="glass-spinner" />
      </div>
    );
  }

  // ---- Error / not found ----
  if (error || !meeting) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">
          Meeting not found
        </h3>
        <p className="mt-1 text-secondary-500 dark:text-secondary-400">
          The 1-on-1 meeting you are looking for does not exist or you do not have access.
        </p>
        <Link
          to="/one-on-ones"
          className="mt-4 inline-block bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          Back to 1-on-1s
        </Link>
      </div>
    );
  }

  const isTerminal = meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED';
  const timeline = buildTimeline(meeting);

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div>
        <Link
          to="/one-on-ones"
          className="text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 flex items-center gap-1 text-sm mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to 1-on-1s
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
              1-on-1 with {otherPerson?.firstName} {otherPerson?.lastName}
            </h1>
            <span
              className={clsx(
                'px-2.5 py-0.5 rounded-full text-xs font-medium',
                statusBadgeColors[meeting.status] ?? statusBadgeColors.SCHEDULED,
              )}
            >
              {statusLabels[meeting.status] ?? meeting.status}
            </span>
          </div>

          {/* Action buttons by status */}
          <div className="flex items-center gap-2">
            {meeting.status === 'SCHEDULED' && (
              <>
                <button
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4" />
                  {startMutation.isPending ? 'Starting...' : 'Start Meeting'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Cancel
                </button>
              </>
            )}
            {meeting.status === 'IN_PROGRESS' && (
              <button
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {completeMutation.isPending ? 'Completing...' : 'Complete Meeting'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MEETING INFO CARD                                                 */}
      {/* ================================================================= */}
      <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Date / Time */}
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500 mt-0.5" />
            <div>
              <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
                Date &amp; Time
              </dt>
              <dd className="text-sm text-secondary-900 dark:text-white mt-0.5">
                {format(new Date(meeting.scheduledAt), 'MMM d, yyyy')}
              </dd>
              <dd className="text-xs text-secondary-500 dark:text-secondary-400">
                {format(new Date(meeting.scheduledAt), 'h:mm a')}
              </dd>
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-start gap-3">
            <ClockIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500 mt-0.5" />
            <div>
              <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
                Duration
              </dt>
              <dd className="text-sm text-secondary-900 dark:text-white mt-0.5">
                {meeting.duration} minutes
              </dd>
            </div>
          </div>

          {/* Location / Link */}
          <div className="flex items-start gap-3">
            {meeting.meetingLink ? (
              <LinkIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500 mt-0.5" />
            ) : (
              <MapPinIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500 mt-0.5" />
            )}
            <div>
              <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
                {meeting.meetingLink ? 'Meeting Link' : 'Location'}
              </dt>
              <dd className="text-sm text-secondary-900 dark:text-white mt-0.5">
                {meeting.meetingLink ? (
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 dark:text-primary-400 underline"
                  >
                    Join Meeting
                  </a>
                ) : meeting.location ? (
                  meeting.location
                ) : (
                  <span className="text-secondary-400 dark:text-secondary-500">Not specified</span>
                )}
              </dd>
            </div>
          </div>

          {/* Participants */}
          <div className="flex items-start gap-3">
            <UserIcon className="h-5 w-5 text-secondary-400 dark:text-secondary-500 mt-0.5" />
            <div>
              <dt className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
                Participants
              </dt>
              <dd className="text-sm text-secondary-900 dark:text-white mt-0.5">
                {meeting.manager.firstName} {meeting.manager.lastName}
                <span className="text-xs text-secondary-400 ml-1">(Manager)</span>
              </dd>
              <dd className="text-sm text-secondary-900 dark:text-white">
                {meeting.employee.firstName} {meeting.employee.lastName}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* MAIN CONTENT GRID                                                 */}
      {/* ================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ---- LEFT COLUMN (2/3) ---- */}
        <div className="lg:col-span-2 space-y-6">
          {/* ─── AGENDA ─── */}
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <ListBulletIcon className="h-5 w-5 text-secondary-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Agenda</h2>
            </div>
            {meeting.agenda && meeting.agenda.length > 0 ? (
              <ul className="space-y-3">
                {meeting.agenda.map((item, idx) => (
                  <li
                    key={idx}
                    className="p-3 rounded-lg border border-secondary-200 dark:border-secondary-600"
                  >
                    <p className="text-sm font-medium text-secondary-900 dark:text-white">
                      {idx + 1}. {item.topic}
                    </p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                        {item.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400">
                No agenda items have been added.
              </p>
            )}
          </div>

          {/* ─── MANAGER NOTES ─── */}
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="h-5 w-5 text-secondary-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Manager Notes
              </h2>
              <span className="text-xs text-secondary-400 dark:text-secondary-500 ml-auto">
                Only visible to manager
              </span>
            </div>
            {isManager && !isTerminal ? (
              <textarea
                value={managerNotes ?? ''}
                onChange={(e) => setManagerNotes(e.target.value)}
                onBlur={handleManagerNotesBlur}
                rows={4}
                placeholder="Add private notes..."
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            ) : isManager ? (
              <div className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
                {managerNotes || <span className="text-secondary-400 dark:text-secondary-500 italic">No manager notes.</span>}
              </div>
            ) : (
              <p className="text-sm text-secondary-400 dark:text-secondary-500 italic">
                These notes are private to the manager.
              </p>
            )}
          </div>

          {/* ─── EMPLOYEE NOTES ─── */}
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="h-5 w-5 text-secondary-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Employee Notes
              </h2>
              <span className="text-xs text-secondary-400 dark:text-secondary-500 ml-auto">
                Only visible to employee
              </span>
            </div>
            {isEmployee && !isTerminal ? (
              <textarea
                value={employeeNotes ?? ''}
                onChange={(e) => setEmployeeNotes(e.target.value)}
                onBlur={handleEmployeeNotesBlur}
                rows={4}
                placeholder="Add private notes..."
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            ) : isEmployee ? (
              <div className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
                {employeeNotes || <span className="text-secondary-400 dark:text-secondary-500 italic">No employee notes.</span>}
              </div>
            ) : (
              <p className="text-sm text-secondary-400 dark:text-secondary-500 italic">
                These notes are private to the employee.
              </p>
            )}
          </div>

          {/* ─── SHARED NOTES ─── */}
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-secondary-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Shared Notes
              </h2>
              <span className="text-xs text-secondary-400 dark:text-secondary-500 ml-auto">
                Visible to both parties
              </span>
            </div>
            {isParticipant && !isTerminal ? (
              <textarea
                value={sharedNotes ?? ''}
                onChange={(e) => setSharedNotes(e.target.value)}
                onBlur={handleSharedNotesBlur}
                rows={4}
                placeholder="Add shared notes..."
                className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white p-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            ) : (
              <div className="text-sm text-secondary-700 dark:text-secondary-300 whitespace-pre-wrap">
                {sharedNotes || <span className="text-secondary-400 dark:text-secondary-500 italic">No shared notes.</span>}
              </div>
            )}
          </div>

          {/* ─── ACTION ITEMS ─── */}
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="h-5 w-5 text-secondary-400" />
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Action Items
              </h2>
            </div>

            {actionItems && actionItems.length > 0 ? (
              <ul className="space-y-2 mb-4">
                {actionItems.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg border border-secondary-200 dark:border-secondary-600"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleActionItem(idx)}
                      disabled={isTerminal}
                      className="h-4 w-4 rounded border-secondary-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span
                      className={clsx(
                        'flex-1 text-sm',
                        item.done
                          ? 'line-through text-secondary-400 dark:text-secondary-500'
                          : 'text-secondary-900 dark:text-white',
                      )}
                    >
                      {item.title}
                    </span>
                    {item.assignee && (
                      <span className="text-xs bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 px-2 py-0.5 rounded-full">
                        {item.assignee}
                      </span>
                    )}
                    {!isTerminal && (
                      <button
                        onClick={() => handleRemoveActionItem(idx)}
                        className="text-secondary-400 hover:text-red-500 dark:hover:text-red-400 text-sm"
                        title="Remove"
                      >
                        <XCircleIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
                No action items yet.
              </p>
            )}

            {/* Add new action item */}
            {!isTerminal && isParticipant && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newActionTitle}
                  onChange={(e) => setNewActionTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddActionItem();
                    }
                  }}
                  placeholder="Add an action item..."
                  className="flex-1 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white p-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  onClick={handleAddActionItem}
                  disabled={!newActionTitle.trim()}
                  className="inline-flex items-center gap-1 bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 text-white rounded-lg px-3 py-2 text-sm font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ---- RIGHT COLUMN (1/3) ---- */}
        <div className="space-y-6">
          {/* ─── MEETING TIMELINE ─── */}
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Meeting Timeline
            </h2>
            <ol className="relative border-l border-secondary-200 dark:border-secondary-600 ml-3 space-y-6">
              {timeline.map((entry, idx) => (
                <li key={idx} className="ml-6">
                  <span
                    className={clsx(
                      'absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white dark:ring-secondary-800',
                      timelineIconColors[entry.icon] ?? timelineIconColors.scheduled,
                    )}
                  >
                    {entry.icon === 'completed' ? (
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                    ) : entry.icon === 'cancelled' ? (
                      <XCircleIcon className="h-3.5 w-3.5" />
                    ) : entry.icon === 'started' ? (
                      <PlayIcon className="h-3.5 w-3.5" />
                    ) : (
                      <ClockIcon className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <h3 className="text-sm font-medium text-secondary-900 dark:text-white">
                    {entry.label}
                  </h3>
                  <time className="text-xs text-secondary-500 dark:text-secondary-400">
                    {format(new Date(entry.timestamp), 'MMM d, yyyy h:mm a')}
                  </time>
                </li>
              ))}
            </ol>
          </div>

          {/* ─── PARTICIPANT DETAILS ─── */}
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
              Participants
            </h2>
            <div className="space-y-4">
              {/* Manager */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  {meeting.manager.avatarUrl ? (
                    <img
                      src={meeting.manager.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-primary-700 dark:text-primary-300">
                      {meeting.manager.firstName?.[0]}
                      {meeting.manager.lastName?.[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    {meeting.manager.firstName} {meeting.manager.lastName}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {meeting.manager.jobTitle ?? 'Manager'}
                  </p>
                </div>
                <span className="ml-auto text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 px-2 py-0.5 rounded-full font-medium">
                  Manager
                </span>
              </div>
              {/* Employee */}
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center">
                  {meeting.employee.avatarUrl ? (
                    <img
                      src={meeting.employee.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-secondary-600 dark:text-secondary-300">
                      {meeting.employee.firstName?.[0]}
                      {meeting.employee.lastName?.[0]}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">
                    {meeting.employee.firstName} {meeting.employee.lastName}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">
                    {meeting.employee.jobTitle ?? 'Employee'}
                  </p>
                </div>
                <span className="ml-auto text-xs bg-secondary-100 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300 px-2 py-0.5 rounded-full font-medium">
                  Employee
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* CANCEL CONFIRMATION MODAL                                         */}
      {/* ================================================================= */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/30 dark:bg-black/50"
              onClick={() => setShowCancelConfirm(false)}
            />
            <div className="relative bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-xl max-w-md w-full p-6 border border-transparent dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                Cancel Meeting
              </h2>
              <p className="text-secondary-600 dark:text-secondary-400 mb-6">
                Are you sure you want to cancel this 1-on-1 with{' '}
                {otherPerson?.firstName} {otherPerson?.lastName}? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 hover:bg-primary-50/30 dark:hover:bg-white/[0.03] rounded-lg px-4 py-2 text-sm font-medium"
                >
                  Keep Meeting
                </button>
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Meeting'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
