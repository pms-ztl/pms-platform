// ============================================================================
// Calendar Events API
// ============================================================================

import { api } from './client';

export interface CalendarEventData {
  id: string;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  allDay: boolean;
  type: 'MEETING' | 'DEADLINE' | 'REMINDER' | 'PERSONAL' | 'GOAL_RELATED' | 'REVIEW_RELATED';
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  parentEventId?: string;
  reminderMinutes: number[];
  goalId?: string;
  reviewCycleId?: string;
  goal?: { id: string; title: string };
  reviewCycle?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventInput {
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  type: string;
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  reminderMinutes?: number[];
  goalId?: string;
  reviewCycleId?: string;
}

export interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  type?: string;
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: string;
  reminderMinutes?: number[];
  goalId?: string | null;
  reviewCycleId?: string | null;
}

export const calendarEventsApi = {
  list: (params?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    goalId?: string;
    reviewCycleId?: string;
    page?: number;
    limit?: number;
  }) => api.getPaginated<CalendarEventData>('/calendar/events', params),
  getById: (id: string) => api.get<CalendarEventData>(`/calendar/events/${id}`),
  create: (data: CreateCalendarEventInput) =>
    api.post<CalendarEventData>('/calendar/events', data),
  update: (id: string, data: UpdateCalendarEventInput) =>
    api.put<CalendarEventData>(`/calendar/events/${id}`, data),
  delete: (id: string) => api.delete(`/calendar/events/${id}`),
};
