/**
 * Calendar Planner Component
 *
 * A comprehensive calendar view for the dashboard with:
 * - Monthly/weekly/daily views
 * - Goal deadlines
 * - Review cycles
 * - User-created events with full CRUD
 * - Recurrence and reminders
 * - Double-click to create events
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  FlagIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  BellAlertIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfDay,
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
} from 'date-fns';

import {
  goalsApi,
  reviewsApi,
  calendarEventsApi,
  type CalendarEventData,
  type CreateCalendarEventInput,
} from '@/lib/api';

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

type ViewMode = 'month' | 'week' | 'day';

export function CalendarPlanner() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch goals
  const { data: goalsData } = useQuery({
    queryKey: ['goals', 'all'],
    queryFn: () => goalsApi.list({ limit: 100 }),
  });

  // Fetch review cycles
  const { data: cyclesData } = useQuery({
    queryKey: ['reviews', 'cycles'],
    queryFn: () => reviewsApi.listCycles({}),
  });

  // Fetch user-created calendar events for the visible month range
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const { data: calendarEventsData } = useQuery({
    queryKey: ['calendarEvents', format(monthStart, 'yyyy-MM')],
    queryFn: () =>
      calendarEventsApi.list({
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
        limit: 200,
      }),
  });

  // Mutations
  const createEventMutation = useMutation({
    mutationFn: (data: CreateCalendarEventInput) => calendarEventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      setShowCreateModal(false);
      toast.success('Event created successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create event');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: string) => calendarEventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      toast.success('Event deleted successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete event');
    },
  });

  // Build calendar events
  const events = useMemo(() => {
    const eventList: CalendarEvent[] = [];

    // Add goal deadlines
    goalsData?.data?.forEach((goal) => {
      if (goal.dueDate) {
        eventList.push({
          id: `goal-${goal.id}`,
          title: goal.title,
          date: new Date(goal.dueDate),
          type: 'goal',
          status: goal.status,
          color:
            goal.status === 'COMPLETED'
              ? 'bg-green-500'
              : goal.status === 'AT_RISK'
                ? 'bg-amber-500'
                : 'bg-blue-500',
        });
      }
    });

    // Add review cycle dates
    cyclesData?.forEach((cycle) => {
      if (cycle.selfReviewStart) {
        eventList.push({
          id: `review-self-start-${cycle.id}`,
          title: `${cycle.name} - Self Review Start`,
          date: new Date(cycle.selfReviewStart),
          type: 'review',
          color: 'bg-purple-500',
        });
      }
      if (cycle.selfReviewEnd) {
        eventList.push({
          id: `review-self-end-${cycle.id}`,
          title: `${cycle.name} - Self Review Due`,
          date: new Date(cycle.selfReviewEnd),
          type: 'deadline',
          color: 'bg-red-500',
        });
      }
      if (cycle.managerReviewStart) {
        eventList.push({
          id: `review-mgr-start-${cycle.id}`,
          title: `${cycle.name} - Manager Review Start`,
          date: new Date(cycle.managerReviewStart),
          type: 'review',
          color: 'bg-indigo-500',
        });
      }
    });

    // Add user-created calendar events from API
    calendarEventsData?.data?.forEach((ce: CalendarEventData) => {
      const typeMap: Record<string, CalendarEvent['type']> = {
        MEETING: 'meeting',
        DEADLINE: 'deadline',
        REMINDER: 'reminder',
        PERSONAL: 'personal',
        GOAL_RELATED: 'goal',
        REVIEW_RELATED: 'review',
      };

      eventList.push({
        id: `ce-${ce.id}`,
        title: ce.title,
        date: new Date(ce.eventDate),
        type: typeMap[ce.type] || 'personal',
        color: ce.color || 'bg-teal-500',
        isUserCreated: true,
        sourceId: ce.id,
        startTime: ce.startTime,
        endTime: ce.endTime,
        description: ce.description,
      });
    });

    return eventList;
  }, [goalsData, cyclesData, calendarEventsData]);

  // Get events for a specific day
  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter((event) => isSameDay(event.date, day));
  };

  // Calendar navigation
  const goToPrevious = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goToNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Handle double-click to create event
  const handleDoubleClick = useCallback((day: Date) => {
    setSelectedDate(day);
    setShowCreateModal(true);
  }, []);

  // Generate calendar days for month view
  const calendarDays = useMemo(() => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const startDate = startOfWeek(ms, { weekStartsOn: 0 });
    const endDate = endOfWeek(me, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Generate week days for week view
  const weekDays = useMemo(() => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
    const we = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate]);

  // Generate hours for day/week view
  const dayHours = useMemo(() => {
    const start = setHours(startOfDay(currentDate), 6);
    const end = setHours(startOfDay(currentDate), 22);
    return eachHourOfInterval({ start, end });
  }, [currentDate]);

  // Header text based on view mode
  const headerText = useMemo(() => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      if (ws.getMonth() === we.getMonth()) {
        return `${format(ws, 'MMM d')} - ${format(we, 'd, yyyy')}`;
      }
      return `${format(ws, 'MMM d')} - ${format(we, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  }, [currentDate, viewMode]);

  // Event type icon
  const EventIcon = ({ type }: { type: CalendarEvent['type'] }) => {
    switch (type) {
      case 'goal':
        return <FlagIcon className="h-3 w-3" />;
      case 'review':
        return <ClipboardDocumentCheckIcon className="h-3 w-3" />;
      case 'meeting':
        return <UserGroupIcon className="h-3 w-3" />;
      case 'deadline':
        return <BellAlertIcon className="h-3 w-3" />;
      case 'reminder':
        return <BellAlertIcon className="h-3 w-3" />;
      case 'personal':
        return <CalendarDaysIcon className="h-3 w-3" />;
      default:
        return <CalendarDaysIcon className="h-3 w-3" />;
    }
  };

  // ── Render: Month View ──────────────────────────────────────────────────
  const renderMonthView = () => (
    <div className="p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold tracking-wider text-secondary-500 dark:text-secondary-400 py-2.5 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={idx}
              onClick={() => setSelectedDate(day)}
              onDoubleClick={() => handleDoubleClick(day)}
              className={clsx(
                'min-h-[100px] p-2 rounded-lg cursor-pointer transition-colors select-none',
                !isCurrentMonth && 'bg-secondary-50 dark:bg-secondary-900/50',
                isCurrentMonth && !isSelected && !isToday(day) && 'bg-white dark:bg-secondary-800',
                isToday(day) &&
                  !isSelected &&
                  'bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-300 dark:ring-primary-700',
                isSelected && 'bg-primary-100 dark:bg-primary-900/40 ring-2 ring-primary-500',
                'hover:bg-secondary-100 dark:hover:bg-secondary-700'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={clsx(
                    'text-sm font-medium',
                    !isCurrentMonth && 'text-secondary-400 dark:text-secondary-600',
                    isCurrentMonth && 'text-secondary-900 dark:text-white',
                    isToday(day) && 'text-primary-600 dark:text-primary-400 font-bold'
                  )}
                >
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">
                    {dayEvents.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    className={clsx(
                      'text-xs px-1.5 py-0.5 rounded break-words text-white flex items-center gap-1',
                      event.color
                    )}
                    title={event.title}
                  >
                    <EventIcon type={event.type} />
                    <span className="break-words">{event.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-secondary-500 dark:text-secondary-400 pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── Render: Week View ───────────────────────────────────────────────────
  const renderWeekView = () => (
    <div className="p-4 overflow-x-auto">
      {/* Day headers */}
      <div className="grid grid-cols-8 gap-0 mb-0 min-w-[700px]">
        <div className="text-center text-xs font-medium text-secondary-400 dark:text-secondary-500 py-2 border-r border-secondary-200 dark:border-secondary-700 w-16" />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            onClick={() => setSelectedDate(day)}
            onDoubleClick={() => handleDoubleClick(day)}
            className={clsx(
              'text-center py-2 cursor-pointer select-none transition-colors border-r last:border-r-0 border-secondary-200 dark:border-secondary-700',
              isToday(day)
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-secondary-50 dark:hover:bg-secondary-800',
              selectedDate && isSameDay(day, selectedDate) && 'bg-primary-100 dark:bg-primary-900/30'
            )}
          >
            <div className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
              {format(day, 'EEE')}
            </div>
            <div
              className={clsx(
                'text-lg font-semibold mt-0.5',
                isToday(day) ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-900 dark:text-white'
              )}
            >
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="max-h-[500px] overflow-y-auto min-w-[700px]">
        {dayHours.map((hour) => (
          <div key={hour.toISOString()} className="grid grid-cols-8 gap-0 border-t border-secondary-100 dark:border-secondary-700/50">
            <div className="text-xs text-secondary-400 dark:text-secondary-500 py-3 pr-2 text-right w-16 border-r border-secondary-200 dark:border-secondary-700">
              {format(hour, 'h a')}
            </div>
            {weekDays.map((day) => {
              const hourStart = setHours(startOfDay(day), hour.getHours());
              const hourEvents = events.filter(
                (e) => isSameDay(e.date, day) && e.startTime && new Date(e.startTime).getHours() === hour.getHours()
              );
              return (
                <div
                  key={`${day.toISOString()}-${hour.getHours()}`}
                  onDoubleClick={() => {
                    setSelectedDate(hourStart);
                    setShowCreateModal(true);
                  }}
                  className="min-h-[48px] p-1 border-r last:border-r-0 border-secondary-100 dark:border-secondary-700/50 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 cursor-pointer transition-colors"
                >
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={clsx('text-2xs px-1.5 py-0.5 rounded break-words text-white mb-0.5', event.color)}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* All-day events bar */}
      <div className="border-t border-secondary-200 dark:border-secondary-700 mt-2 pt-2">
        <div className="grid grid-cols-8 gap-0 min-w-[700px]">
          <div className="text-xs text-secondary-400 dark:text-secondary-500 pr-2 text-right w-16">All day</div>
          {weekDays.map((day) => {
            const allDayEvents = events.filter(
              (e) => isSameDay(e.date, day) && !e.startTime
            );
            return (
              <div key={day.toISOString()} className="px-1 space-y-0.5">
                {allDayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={clsx('text-2xs px-1.5 py-0.5 rounded break-words text-white flex items-center gap-0.5', event.color)}
                    title={event.title}
                  >
                    <EventIcon type={event.type} />
                    <span className="break-words">{event.title}</span>
                  </div>
                ))}
                {allDayEvents.length > 2 && (
                  <div className="text-2xs text-secondary-400">+{allDayEvents.length - 2}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── Render: Day View ────────────────────────────────────────────────────
  const renderDayView = () => {
    const dayEvents = getEventsForDay(currentDate);
    const allDayEvents = dayEvents.filter((e) => !e.startTime);
    const timedEvents = dayEvents.filter((e) => e.startTime);

    return (
      <div className="p-4">
        {/* Day header */}
        <div
          className={clsx(
            'text-center py-3 rounded-lg mb-4',
            isToday(currentDate)
              ? 'bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-300 dark:ring-primary-700'
              : 'bg-secondary-50 dark:bg-secondary-900/50'
          )}
        >
          <div className="text-sm font-medium text-secondary-500 dark:text-secondary-400">
            {format(currentDate, 'EEEE')}
          </div>
          <div
            className={clsx(
              'text-3xl font-bold mt-1',
              isToday(currentDate) ? 'text-primary-600 dark:text-primary-400' : 'text-secondary-900 dark:text-white'
            )}
          >
            {format(currentDate, 'd')}
          </div>
          <div className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5">
            {format(currentDate, 'MMMM yyyy')}
          </div>
        </div>

        {/* All-day events */}
        {allDayEvents.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-secondary-400 dark:text-secondary-500 tracking-wider mb-2">
              All Day
            </div>
            <div className="space-y-1">
              {allDayEvents.map((event) => (
                <div
                  key={event.id}
                  className={clsx('text-sm px-3 py-2 rounded-lg text-white flex items-center gap-2', event.color)}
                >
                  <EventIcon type={event.type} />
                  <span>{event.title}</span>
                  {event.isUserCreated && event.sourceId && (
                    <button
                      onClick={() => deleteEventMutation.mutate(event.sourceId!)}
                      className="ml-auto p-1 hover:bg-white/20 rounded"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hourly timeline */}
        <div className="max-h-[500px] overflow-y-auto">
          {dayHours.map((hour) => {
            const hourEvents = timedEvents.filter(
              (e) => e.startTime && new Date(e.startTime).getHours() === hour.getHours()
            );
            return (
              <div
                key={hour.toISOString()}
                onDoubleClick={() => {
                  const clickedTime = setHours(startOfDay(currentDate), hour.getHours());
                  setSelectedDate(clickedTime);
                  setShowCreateModal(true);
                }}
                className="flex gap-3 border-t border-secondary-100 dark:border-secondary-700/50 min-h-[56px] cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors"
              >
                <div className="text-xs text-secondary-400 dark:text-secondary-500 py-3 w-16 text-right shrink-0">
                  {format(hour, 'h:mm a')}
                </div>
                <div className="flex-1 py-1 space-y-1">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className={clsx(
                        'text-sm px-3 py-2 rounded-lg text-white flex items-center gap-2',
                        event.color
                      )}
                    >
                      <EventIcon type={event.type} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{event.title}</span>
                        {event.startTime && (
                          <span className="ml-2 text-xs opacity-80">
                            {format(new Date(event.startTime), 'h:mm a')}
                            {event.endTime && ` - ${format(new Date(event.endTime), 'h:mm a')}`}
                          </span>
                        )}
                      </div>
                      {event.isUserCreated && event.sourceId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteEventMutation.mutate(event.sourceId!); }}
                          className="p-1 hover:bg-white/20 rounded"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevious}
                className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
              </button>
              <button
                onClick={goToNext}
                className="p-2 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                <ChevronRightIcon className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
              </button>
            </div>
            <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
              {headerText}
            </h2>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-1 bg-secondary-100 dark:bg-secondary-700 rounded-lg p-0.5">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-all capitalize',
                  viewMode === mode
                    ? 'bg-white dark:bg-secondary-600 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                )}
              >
                {mode === 'month' ? 'Month' : mode === 'week' ? 'Week' : 'Day'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar Grid - View-dependent */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}

      {/* Event details panel - only in month view */}
      {viewMode === 'month' && selectedDate && (
        <div className="border-t border-secondary-200 dark:border-secondary-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-secondary-900 dark:text-white">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-sm flex items-center gap-1"
            >
              <PlusIcon className="h-4 w-4" />
              Add Event
            </button>
          </div>
          <div className="space-y-2">
            {getEventsForDay(selectedDate).length > 0 ? (
              getEventsForDay(selectedDate).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg"
                >
                  <div className={clsx('p-2 rounded-lg text-white', event.color)}>
                    <EventIcon type={event.type} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-secondary-900 dark:text-white">{event.title}</p>
                    <p className="text-sm text-secondary-500 dark:text-secondary-400 capitalize">
                      {event.type} {event.status && `\u2022 ${event.status.toLowerCase()}`}
                      {event.startTime && ` \u2022 ${format(new Date(event.startTime), 'h:mm a')}`}
                    </p>
                  </div>
                  {event.isUserCreated && event.sourceId && (
                    <button
                      onClick={() => deleteEventMutation.mutate(event.sourceId!)}
                      disabled={deleteEventMutation.isPending}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete event"
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center py-4">
                No events scheduled for this day
              </p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="border-t border-secondary-200 dark:border-secondary-700 px-4 py-3">
        <div className="flex items-center gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span className="text-secondary-600 dark:text-secondary-400">Goals</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span className="text-secondary-600 dark:text-secondary-400">Reviews</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-secondary-600 dark:text-secondary-400">Deadlines</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-secondary-600 dark:text-secondary-400">Completed</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-teal-500" />
            <span className="text-secondary-600 dark:text-secondary-400">Personal</span>
          </div>
          <div className="ml-auto flex items-center gap-1 text-secondary-400 dark:text-secondary-500">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>Double-click to create event</span>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 dark:bg-black/70"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-lg w-full p-6 border border-secondary-200 dark:border-secondary-700">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                Create Calendar Event
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const eventDate = formData.get('eventDate') as string;
                  const startTimeVal = formData.get('startTime') as string;
                  const endTimeVal = formData.get('endTime') as string;
                  const reminderVal = formData.get('reminderMinutes') as string;
                  const recurrenceEndVal = formData.get('recurrenceEndDate') as string;
                  const recurrenceVal = formData.get('recurrenceRule') as string;

                  createEventMutation.mutate({
                    title: formData.get('title') as string,
                    description: (formData.get('description') as string) || undefined,
                    eventDate,
                    startTime: startTimeVal
                      ? new Date(`${eventDate}T${startTimeVal}`).toISOString()
                      : undefined,
                    endTime: endTimeVal
                      ? new Date(`${eventDate}T${endTimeVal}`).toISOString()
                      : undefined,
                    allDay: formData.get('allDay') === 'on',
                    type: formData.get('type') as string,
                    color: (formData.get('color') as string) || undefined,
                    recurrenceRule: recurrenceVal || undefined,
                    recurrenceEndDate: recurrenceEndVal || undefined,
                    reminderMinutes: reminderVal
                      ? reminderVal
                          .split(',')
                          .map(Number)
                          .filter((n) => !isNaN(n))
                      : undefined,
                  });
                }}
                className="space-y-4"
              >
                {/* Title */}
                <div>
                  <label className="label dark:text-secondary-300">Title</label>
                  <input
                    name="title"
                    type="text"
                    required
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                    placeholder="Event title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="label dark:text-secondary-300">Description</label>
                  <textarea
                    name="description"
                    rows={2}
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white dark:placeholder-secondary-400"
                    placeholder="Optional description"
                  />
                </div>

                {/* Date + All Day */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">Date</label>
                    <input
                      name="eventDate"
                      type="date"
                      required
                      defaultValue={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input name="allDay" type="checkbox" className="rounded" />
                      <span className="text-sm text-secondary-700 dark:text-secondary-300">
                        All Day
                      </span>
                    </label>
                  </div>
                </div>

                {/* Start/End Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">Start Time</label>
                    <input
                      name="startTime"
                      type="time"
                      defaultValue={selectedDate && selectedDate.getHours() >= 6 ? format(selectedDate, 'HH:mm') : ''}
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">End Time</label>
                    <input
                      name="endTime"
                      type="time"
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Type + Color */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">Event Type</label>
                    <select
                      name="type"
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    >
                      <option value="PERSONAL">Personal</option>
                      <option value="MEETING">Meeting</option>
                      <option value="DEADLINE">Deadline</option>
                      <option value="REMINDER">Reminder</option>
                      <option value="GOAL_RELATED">Goal Related</option>
                      <option value="REVIEW_RELATED">Review Related</option>
                    </select>
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Color</label>
                    <select
                      name="color"
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    >
                      <option value="">Default (Teal)</option>
                      <option value="bg-blue-500">Blue</option>
                      <option value="bg-red-500">Red</option>
                      <option value="bg-green-500">Green</option>
                      <option value="bg-purple-500">Purple</option>
                      <option value="bg-amber-500">Amber</option>
                      <option value="bg-teal-500">Teal</option>
                      <option value="bg-pink-500">Pink</option>
                      <option value="bg-indigo-500">Indigo</option>
                    </select>
                  </div>
                </div>

                {/* Recurrence */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label dark:text-secondary-300">Recurrence</label>
                    <select
                      name="recurrenceRule"
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    >
                      <option value="">None</option>
                      <option value="FREQ=DAILY">Daily</option>
                      <option value="FREQ=WEEKLY">Weekly</option>
                      <option value="FREQ=MONTHLY">Monthly</option>
                      <option value="FREQ=YEARLY">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="label dark:text-secondary-300">Recurrence End</label>
                    <input
                      name="recurrenceEndDate"
                      type="date"
                      className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                    />
                  </div>
                </div>

                {/* Reminders */}
                <div>
                  <label className="label dark:text-secondary-300">Reminder</label>
                  <select
                    name="reminderMinutes"
                    className="input dark:bg-secondary-700 dark:border-secondary-600 dark:text-white"
                  >
                    <option value="">None</option>
                    <option value="5">5 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="1440">1 day before</option>
                    <option value="15,60">15 minutes and 1 hour before</option>
                    <option value="60,1440">1 hour and 1 day before</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn-secondary dark:bg-secondary-700 dark:text-white dark:border-secondary-600 dark:hover:bg-secondary-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createEventMutation.isPending}
                    className="btn-primary"
                  >
                    {createEventMutation.isPending ? 'Creating...' : 'Create Event'}
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

export default CalendarPlanner;
