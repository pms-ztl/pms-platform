import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  CalendarDaysIcon,
  FlagIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  setHours,
  startOfDay,
} from 'date-fns';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { calendarEventsApi, type CalendarEventData } from '@/lib/api/calendar';
import { goalsApi, type Goal } from '@/lib/api/goals';
import { reviewsApi } from '@/lib/api';
import { oneOnOnesApi, type OneOnOne } from '@/lib/api/one-on-ones';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

// ── Types ──

type ViewMode = 'month' | 'week' | 'day';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'goal' | 'review' | 'meeting' | 'deadline' | 'alert' | 'personal' | 'reminder';
  status?: string;
  color: string;
  isUserCreated?: boolean;
  sourceId?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
}

// ── Constants ──

const EVENT_TYPE_CONFIG: Record<string, { color: string; icon: typeof FlagIcon; label: string }> = {
  goal: { color: 'bg-blue-500', icon: FlagIcon, label: 'Goal Deadline' },
  review: { color: 'bg-purple-500', icon: ClipboardDocumentCheckIcon, label: 'Review Cycle' },
  meeting: { color: 'bg-green-500', icon: UserGroupIcon, label: '1-on-1 Meeting' },
  deadline: { color: 'bg-red-500', icon: ClockIcon, label: 'Deadline' },
  alert: { color: 'bg-amber-500', icon: ClockIcon, label: 'Reminder' },
  personal: { color: 'bg-indigo-500', icon: CalendarDaysIcon, label: 'Personal' },
  reminder: { color: 'bg-amber-500', icon: ClockIcon, label: 'Reminder' },
};

const VIEW_OPTIONS: { label: string; value: ViewMode }[] = [
  { label: 'Month', value: 'month' },
  { label: 'Week', value: 'week' },
  { label: 'Day', value: 'day' },
];

const EVENT_TYPE_OPTIONS = [
  { label: 'Personal', value: 'PERSONAL' },
  { label: 'Meeting', value: 'MEETING' },
  { label: 'Deadline', value: 'DEADLINE' },
  { label: 'Reminder', value: 'REMINDER' },
];

const EVENT_COLORS = [
  { label: 'Blue', value: 'bg-blue-500' },
  { label: 'Green', value: 'bg-green-500' },
  { label: 'Purple', value: 'bg-purple-500' },
  { label: 'Amber', value: 'bg-amber-500' },
  { label: 'Red', value: 'bg-red-500' },
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Pink', value: 'bg-pink-500' },
  { label: 'Teal', value: 'bg-teal-500' },
];

// ── Helpers ──

function mapApiType(type: string): CalendarEvent['type'] {
  const map: Record<string, CalendarEvent['type']> = {
    MEETING: 'meeting',
    DEADLINE: 'deadline',
    REMINDER: 'reminder',
    PERSONAL: 'personal',
    GOAL_RELATED: 'goal',
    REVIEW_RELATED: 'review',
  };
  return map[type] || 'personal';
}

// ── Main Component ──

export function CalendarPage() {
  usePageTitle('Calendar');
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());

  // ── Queries ──

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: calendarEvents } = useQuery({
    queryKey: ['calendarEvents', format(monthStart, 'yyyy-MM')],
    queryFn: () =>
      calendarEventsApi.list({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
        limit: 200,
      }),
    staleTime: 30_000,
  });

  const { data: goalsData } = useQuery({
    queryKey: ['goals', 'all'],
    queryFn: () => goalsApi.list({ limit: 100 }),
    staleTime: 60_000,
  });

  const { data: cyclesData } = useQuery({
    queryKey: ['reviews', 'cycles'],
    queryFn: () => reviewsApi.listCycles({}),
    staleTime: 60_000,
  });

  const { data: oneOnOnes } = useQuery({
    queryKey: ['one-on-ones', 'upcoming'],
    queryFn: () => oneOnOnesApi.getUpcoming(),
    staleTime: 60_000,
  });

  // ── Mutations ──

  const createMutation = useMutation({
    mutationFn: (data: any) => calendarEventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowCreateForm(false);
      toast.success('Event created');
    },
    onError: () => toast.error('Failed to create event'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarEventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      toast.success('Event deleted');
    },
    onError: () => toast.error('Failed to delete event'),
  });

  // ── Merge all events ──

  const allEvents: CalendarEvent[] = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Calendar API events
    const apiEvents = (calendarEvents as any)?.data ?? calendarEvents ?? [];
    if (Array.isArray(apiEvents)) {
      apiEvents.forEach((e: CalendarEventData) => {
        events.push({
          id: `cal-${e.id}`,
          title: e.title,
          date: new Date(e.eventDate),
          type: mapApiType(e.type),
          color: e.color || 'bg-blue-500',
          isUserCreated: true,
          sourceId: e.id,
          startTime: e.startTime || undefined,
          endTime: e.endTime || undefined,
          description: e.description,
        });
      });
    }

    // Goals → deadlines
    const goals = (goalsData as any)?.data ?? [];
    if (Array.isArray(goals)) {
      goals.forEach((g: Goal) => {
        if (g.dueDate) {
          events.push({
            id: `goal-${g.id}`,
            title: `Goal: ${g.title}`,
            date: new Date(g.dueDate),
            type: 'goal',
            status: g.status,
            color: g.status === 'COMPLETED' ? 'bg-green-500' : g.status === 'AT_RISK' ? 'bg-amber-500' : 'bg-blue-500',
          });
        }
      });
    }

    // Review cycles
    const cycles = (cyclesData as any)?.data ?? cyclesData ?? [];
    if (Array.isArray(cycles)) {
      cycles.forEach((c: any) => {
        if (c.startDate) {
          events.push({
            id: `review-start-${c.id}`,
            title: `${c.name} (Start)`,
            date: new Date(c.startDate),
            type: 'review',
            color: 'bg-purple-500',
          });
        }
        if (c.endDate) {
          events.push({
            id: `review-end-${c.id}`,
            title: `${c.name} (End)`,
            date: new Date(c.endDate),
            type: 'review',
            color: 'bg-purple-600',
          });
        }
      });
    }

    // 1-on-1 meetings
    const meetings = Array.isArray(oneOnOnes) ? oneOnOnes : [];
    meetings.forEach((m: OneOnOne) => {
      if (m.scheduledAt) {
        events.push({
          id: `meeting-${m.id}`,
          title: `1-on-1: ${m.manager?.firstName || ''} & ${m.employee?.firstName || ''}`,
          date: new Date(m.scheduledAt),
          type: 'meeting',
          color: 'bg-green-500',
          startTime: m.scheduledAt,
        });
      }
    });

    return events;
  }, [calendarEvents, goalsData, cyclesData, oneOnOnes]);

  // ── Filter ──

  const filteredEvents = useMemo(() => {
    if (filterTypes.size === 0) return allEvents;
    return allEvents.filter((e) => filterTypes.has(e.type));
  }, [allEvents, filterTypes]);

  // ── Selected day events ──

  const selectedDayEvents = useMemo(
    () => filteredEvents.filter((e) => isSameDay(e.date, selectedDate)).sort((a, b) => {
      if (a.startTime && b.startTime) return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      return 0;
    }),
    [filteredEvents, selectedDate]
  );

  // ── Navigation ──

  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      setCurrentDate((d) => {
        if (viewMode === 'month') return direction === 'prev' ? subMonths(d, 1) : addMonths(d, 1);
        if (viewMode === 'week') return direction === 'prev' ? subWeeks(d, 1) : addWeeks(d, 1);
        return direction === 'prev' ? subDays(d, 1) : addDays(d, 1);
      });
    },
    [viewMode]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigate('prev'); }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigate('next'); }
      if (e.key === 't' || e.key === 'T') { setCurrentDate(new Date()); setSelectedDate(new Date()); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  // ── Month view ──

  const monthDays = useMemo(() => {
    const start = startOfWeek(monthStart);
    const end = endOfWeek(monthEnd);
    return eachDayOfInterval({ start, end });
  }, [monthStart, monthEnd]);

  // ── Week view ──

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [currentDate]);

  const hours = useMemo(() => {
    const start = setHours(startOfDay(currentDate), 6);
    const end = setHours(startOfDay(currentDate), 22);
    return eachHourOfInterval({ start, end });
  }, [currentDate]);

  // ── Get events for a day ──

  const getEventsForDay = useCallback(
    (day: Date) => filteredEvents.filter((e) => isSameDay(e.date, day)),
    [filteredEvents]
  );

  const toggleFilter = (type: string) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // ── Create event handler ──

  const handleCreateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: String(formData.get('title') || '').trim(),
      description: String(formData.get('description') || '').trim() || undefined,
      eventDate: String(formData.get('eventDate') || format(selectedDate, 'yyyy-MM-dd')),
      allDay: !formData.get('startTime'),
      startTime: formData.get('startTime') ? `${formData.get('eventDate')}T${formData.get('startTime')}:00` : undefined,
      endTime: formData.get('endTime') ? `${formData.get('eventDate')}T${formData.get('endTime')}:00` : undefined,
      type: String(formData.get('type') || 'PERSONAL'),
      color: String(formData.get('color') || 'bg-blue-500'),
    };
    if (!data.title) { toast.error('Title is required'); return; }
    createMutation.mutate(data);
  };

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* ── Main Calendar Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <PageHeader
          title={viewMode === 'day'
            ? format(currentDate, 'EEEE, MMMM d, yyyy')
            : format(currentDate, 'MMMM yyyy')}
          compact
          className="mb-4"
        >
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('prev')} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400 transition-colors">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()); }}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            >
              Today
            </button>
            <button onClick={() => navigate('next')} className="p-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 text-secondary-500 dark:text-secondary-400 transition-colors">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-0.5 p-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
            {VIEW_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setViewMode(opt.value)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  viewMode === opt.value
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-500 dark:text-secondary-400 hover:text-secondary-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </PageHeader>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          {/* ── MONTH VIEW ── */}
          {viewMode === 'month' && (
            <div className="h-full flex flex-col">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-secondary-200 dark:border-secondary-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-medium text-secondary-500 dark:text-secondary-400">
                    {d}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div
                className="flex-1 grid grid-cols-7"
                style={{ gridTemplateRows: `repeat(${Math.ceil(monthDays.length / 7)}, minmax(0, 1fr))` }}
              >
                {monthDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isSelected = isSameDay(day, selectedDate);
                  return (
                    <div
                      key={day.toISOString()}
                      className={clsx(
                        'border-b border-r border-secondary-100 dark:border-secondary-700 p-1 cursor-pointer transition-colors min-h-[90px]',
                        !isCurrentMonth && 'bg-secondary-50/50 dark:bg-secondary-900/30',
                        isSelected && 'bg-primary-50 dark:bg-primary-900/10',
                        isToday(day) && 'bg-blue-50/50 dark:bg-blue-900/10'
                      )}
                      onClick={() => setSelectedDate(day)}
                      onDoubleClick={() => { setSelectedDate(day); setShowCreateForm(true); }}
                    >
                      <div className={clsx(
                        'text-xs font-medium mb-0.5 w-6 h-6 flex items-center justify-center rounded-full font-sans',
                        isToday(day) ? 'bg-primary-600 text-white' : isCurrentMonth ? 'text-secondary-700 dark:text-secondary-300' : 'text-secondary-400 dark:text-secondary-600'
                      )} style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map((evt) => (
                          <div
                            key={evt.id}
                            className={clsx('text-[10px] leading-tight px-1 py-0.5 rounded break-words text-white font-medium', evt.color)}
                            title={evt.title}
                          >
                            {evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-secondary-400 dark:text-secondary-500 px-1">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── WEEK VIEW ── */}
          {viewMode === 'week' && (
            <div className="h-full flex flex-col">
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b border-secondary-200 dark:border-secondary-700 sticky top-0 bg-white dark:bg-secondary-800 z-10">
                <div className="py-2 px-2 text-[10px] text-secondary-400">&nbsp;</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={clsx(
                      'py-2 text-center cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors',
                      isSameDay(day, selectedDate) && 'bg-primary-50 dark:bg-primary-900/10'
                    )}
                  >
                    <div className="text-[10px] font-medium text-secondary-400">{format(day, 'EEE')}</div>
                    <div className={clsx(
                      'text-sm font-bold mt-0.5 font-sans',
                      isToday(day) ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-700 dark:text-secondary-300'
                    )} style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              {/* Time grid */}
              <div className="flex-1 overflow-y-auto">
                {hours.map((hour) => (
                  <div key={hour.toISOString()} className="grid grid-cols-8 border-b border-secondary-100 dark:border-secondary-700/50 min-h-[48px]">
                    <div className="py-1 px-2 text-[10px] text-secondary-400 dark:text-secondary-500 text-right pr-3">
                      {format(hour, 'ha')}
                    </div>
                    {weekDays.map((day) => {
                      const hourNum = hour.getHours();
                      const hourEvents = getEventsForDay(day).filter((e) => {
                        if (!e.startTime) return hourNum === 9; // all-day at 9am
                        return new Date(e.startTime).getHours() === hourNum;
                      });
                      return (
                        <div
                          key={`${day.toISOString()}-${hourNum}`}
                          className="border-l border-secondary-100 dark:border-secondary-700/50 px-0.5 py-0.5"
                          onDoubleClick={() => { setSelectedDate(day); setShowCreateForm(true); }}
                        >
                          {hourEvents.map((evt) => (
                            <div
                              key={evt.id}
                              className={clsx('text-[10px] px-1.5 py-0.5 rounded text-white font-medium break-words', evt.color)}
                              title={evt.title}
                            >
                              {evt.title}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── DAY VIEW ── */}
          {viewMode === 'day' && (
            <div className="h-full flex flex-col">
              {/* All-day events */}
              {(() => {
                const allDayEvents = getEventsForDay(currentDate).filter((e) => !e.startTime);
                if (allDayEvents.length === 0) return null;
                return (
                  <div className="px-4 py-2 border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-900/30">
                    <p className="text-[10px] font-medium text-secondary-400 mb-1">All Day</p>
                    <div className="flex flex-wrap gap-1">
                      {allDayEvents.map((evt) => (
                        <div key={evt.id} className={clsx('text-xs px-2 py-1 rounded text-white font-medium', evt.color)}>
                          {evt.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Hourly grid */}
              <div className="flex-1 overflow-y-auto">
                {hours.map((hour) => {
                  const hourNum = hour.getHours();
                  const hourEvents = getEventsForDay(currentDate).filter((e) => {
                    if (!e.startTime) return false;
                    return new Date(e.startTime).getHours() === hourNum;
                  });
                  return (
                    <div key={hour.toISOString()} className="flex border-b border-secondary-100 dark:border-secondary-700/50 min-h-[56px]">
                      <div className="w-20 py-2 px-3 text-xs text-secondary-400 dark:text-secondary-500 text-right flex-shrink-0">
                        {format(hour, 'h:mm a')}
                      </div>
                      <div
                        className="flex-1 border-l border-secondary-200 dark:border-secondary-700 px-2 py-1"
                        onDoubleClick={() => setShowCreateForm(true)}
                      >
                        {hourEvents.map((evt) => (
                          <div key={evt.id} className={clsx('text-xs px-3 py-1.5 rounded-lg text-white font-medium mb-1', evt.color)}>
                            {evt.title}
                            {evt.startTime && (
                              <span className="text-white/70 ml-2 text-[10px]">
                                {format(new Date(evt.startTime), 'h:mm a')}
                                {evt.endTime && ` - ${format(new Date(evt.endTime), 'h:mm a')}`}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto hidden lg:flex">
        {/* Selected Date */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">
              {format(selectedDate, 'EEE, MMM d')}
            </h3>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <p className="text-xs text-secondary-400 dark:text-secondary-500 text-center py-4">No events</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start gap-2 p-2 rounded-lg bg-secondary-50 dark:bg-secondary-700/40 group"
                >
                  <div className={clsx('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', evt.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-secondary-900 dark:text-white break-words">{evt.title}</p>
                    {evt.startTime && (
                      <p className="text-[10px] text-secondary-400">{format(new Date(evt.startTime), 'h:mm a')}</p>
                    )}
                    <p className="text-[10px] text-secondary-400 capitalize">{evt.type}</p>
                  </div>
                  {evt.isUserCreated && evt.sourceId && (
                    <button
                      onClick={() => deleteMutation.mutate(evt.sourceId!)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-secondary-400 hover:text-red-500 transition-all"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-secondary-900 dark:text-white">New Event</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-secondary-400 hover:text-secondary-600">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="space-y-3">
              <input name="title" placeholder="Event title" required className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-1.5 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400" />
              <textarea name="description" placeholder="Description (optional)" rows={2} className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-1.5 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 resize-none" />
              <input name="eventDate" type="date" defaultValue={format(selectedDate, 'yyyy-MM-dd')} className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-1.5 text-sm text-secondary-900 dark:text-white" />
              <div className="grid grid-cols-2 gap-2">
                <input name="startTime" type="time" className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-1.5 text-sm text-secondary-900 dark:text-white" />
                <input name="endTime" type="time" className="rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-1.5 text-sm text-secondary-900 dark:text-white" />
              </div>
              <select name="type" className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-1.5 text-sm text-secondary-900 dark:text-white">
                {EVENT_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select name="color" className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 px-3 py-1.5 text-sm text-secondary-900 dark:text-white">
                {EVENT_COLORS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <button type="submit" disabled={createMutation.isPending} className="w-full py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {createMutation.isPending ? 'Creating...' : 'Create Event'}
              </button>
            </form>
          </div>
        )}

        {/* Event Type Legend / Filters */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Event Types</h3>
          <div className="space-y-1.5">
            {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
              <button
                key={type}
                onClick={() => toggleFilter(type)}
                className={clsx(
                  'flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs transition-colors',
                  filterTypes.size > 0 && !filterTypes.has(type)
                    ? 'opacity-40'
                    : 'hover:bg-secondary-50 dark:hover:bg-secondary-700/50'
                )}
              >
                <div className={clsx('w-3 h-3 rounded-sm', config.color)} />
                <span className="text-secondary-700 dark:text-secondary-300">{config.label}</span>
              </button>
            ))}
          </div>
          {filterTypes.size > 0 && (
            <button
              onClick={() => setFilterTypes(new Set())}
              className="mt-2 text-[10px] text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-4">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-2">Shortcuts</h3>
          <div className="space-y-1 text-[10px] text-secondary-500 dark:text-secondary-400">
            <div className="flex justify-between"><span>Navigate</span><kbd className="px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 font-mono">← →</kbd></div>
            <div className="flex justify-between"><span>Today</span><kbd className="px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-700 font-mono">T</kbd></div>
            <div className="flex justify-between"><span>New event</span><span>Double-click</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
