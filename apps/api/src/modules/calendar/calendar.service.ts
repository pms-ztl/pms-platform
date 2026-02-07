import { prisma, CalendarEventType } from '@pms/database';
import type {
  CalendarEvent,
  PaginatedResult,
  PaginationParams,
} from '@pms/database';

import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';

interface CreateCalendarEventInput {
  title: string;
  description?: string;
  eventDate: Date;
  startTime?: Date;
  endTime?: Date;
  allDay?: boolean;
  type: CalendarEventType;
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: Date;
  parentEventId?: string;
  reminderMinutes?: number[];
  goalId?: string;
  reviewCycleId?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateCalendarEventInput {
  title?: string;
  description?: string;
  eventDate?: Date;
  startTime?: Date;
  endTime?: Date;
  allDay?: boolean;
  type?: CalendarEventType;
  color?: string;
  recurrenceRule?: string;
  recurrenceEndDate?: Date;
  reminderMinutes?: number[];
  goalId?: string | null;
  reviewCycleId?: string | null;
  metadata?: Record<string, unknown>;
}

export class CalendarService {
  async create(
    tenantId: string,
    userId: string,
    input: CreateCalendarEventInput
  ): Promise<CalendarEvent> {
    // Validate linked goal if provided
    if (input.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: input.goalId, tenantId, deletedAt: null },
      });
      if (goal === null) {
        throw new ValidationError('Linked goal not found');
      }
    }

    // Validate linked review cycle if provided
    if (input.reviewCycleId) {
      const cycle = await prisma.reviewCycle.findFirst({
        where: { id: input.reviewCycleId, tenantId, deletedAt: null },
      });
      if (cycle === null) {
        throw new ValidationError('Linked review cycle not found');
      }
    }

    // Validate parent event if provided (for recurrence instances)
    if (input.parentEventId) {
      const parent = await prisma.calendarEvent.findFirst({
        where: { id: input.parentEventId, tenantId, deletedAt: null },
      });
      if (parent === null) {
        throw new ValidationError('Parent event not found');
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        tenantId,
        userId,
        title: input.title,
        description: input.description,
        eventDate: input.eventDate,
        startTime: input.startTime,
        endTime: input.endTime,
        allDay: input.allDay ?? false,
        type: input.type ?? CalendarEventType.PERSONAL,
        color: input.color,
        recurrenceRule: input.recurrenceRule,
        recurrenceEndDate: input.recurrenceEndDate,
        parentEventId: input.parentEventId,
        reminderMinutes: input.reminderMinutes ?? [],
        goalId: input.goalId,
        reviewCycleId: input.reviewCycleId,
        metadata: (input.metadata ?? {}) as any,
      },
    });

    auditLogger('CALENDAR_EVENT_CREATED', userId, tenantId, 'calendarEvent', event.id, {
      title: event.title,
      type: event.type,
    });

    return event;
  }

  async update(
    tenantId: string,
    userId: string,
    eventId: string,
    input: UpdateCalendarEventInput
  ): Promise<CalendarEvent> {
    const existing = await prisma.calendarEvent.findFirst({
      where: { id: eventId, tenantId, userId, deletedAt: null },
    });

    if (existing === null) {
      throw new NotFoundError('CalendarEvent', eventId);
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.eventDate !== undefined) updateData.eventDate = input.eventDate;
    if (input.startTime !== undefined) updateData.startTime = input.startTime;
    if (input.endTime !== undefined) updateData.endTime = input.endTime;
    if (input.allDay !== undefined) updateData.allDay = input.allDay;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.recurrenceRule !== undefined) updateData.recurrenceRule = input.recurrenceRule;
    if (input.recurrenceEndDate !== undefined) updateData.recurrenceEndDate = input.recurrenceEndDate;
    if (input.reminderMinutes !== undefined) updateData.reminderMinutes = input.reminderMinutes;
    if (input.goalId !== undefined) updateData.goalId = input.goalId;
    if (input.reviewCycleId !== undefined) updateData.reviewCycleId = input.reviewCycleId;
    if (input.metadata !== undefined) updateData.metadata = input.metadata;

    const event = await prisma.calendarEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    auditLogger('CALENDAR_EVENT_UPDATED', userId, tenantId, 'calendarEvent', eventId, {
      changes: Object.keys(input),
    });

    return event;
  }

  async delete(tenantId: string, userId: string, eventId: string): Promise<void> {
    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, tenantId, userId, deletedAt: null },
    });

    if (event === null) {
      throw new NotFoundError('CalendarEvent', eventId);
    }

    // Soft delete the event and all its recurrence children
    await prisma.calendarEvent.updateMany({
      where: {
        OR: [
          { id: eventId },
          { parentEventId: eventId },
        ],
        tenantId,
        deletedAt: null,
      },
      data: { deletedAt: new Date() },
    });

    auditLogger('CALENDAR_EVENT_DELETED', userId, tenantId, 'calendarEvent', eventId, {
      title: event.title,
    });
  }

  async getById(
    tenantId: string,
    userId: string,
    eventId: string
  ): Promise<CalendarEvent> {
    const event = await prisma.calendarEvent.findFirst({
      where: { id: eventId, tenantId, userId, deletedAt: null },
      include: {
        goal: { select: { id: true, title: true, status: true } },
        reviewCycle: { select: { id: true, name: true, status: true } },
        parentEvent: { select: { id: true, title: true } },
        childEvents: {
          where: { deletedAt: null },
          select: { id: true, title: true, eventDate: true },
          orderBy: { eventDate: 'asc' },
        },
      },
    });

    if (event === null) {
      throw new NotFoundError('CalendarEvent', eventId);
    }

    return event;
  }

  async list(
    tenantId: string,
    userId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      type?: CalendarEventType;
      goalId?: string;
      reviewCycleId?: string;
    },
    pagination: PaginationParams
  ): Promise<PaginatedResult<CalendarEvent>> {
    const { page = 1, limit = 50, sortBy = 'eventDate', sortOrder = 'asc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      tenantId,
      userId,
      deletedAt: null,
    };

    if (filters.type !== undefined) {
      where.type = filters.type;
    }
    if (filters.goalId !== undefined) {
      where.goalId = filters.goalId;
    }
    if (filters.reviewCycleId !== undefined) {
      where.reviewCycleId = filters.reviewCycleId;
    }
    if (filters.startDate !== undefined || filters.endDate !== undefined) {
      const eventDateFilter: Record<string, Date> = {};
      if (filters.startDate !== undefined) {
        eventDateFilter.gte = filters.startDate;
      }
      if (filters.endDate !== undefined) {
        eventDateFilter.lte = filters.endDate;
      }
      where.eventDate = eventDateFilter;
    }

    const [data, total] = await Promise.all([
      prisma.calendarEvent.findMany({
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          goal: { select: { id: true, title: true } },
          reviewCycle: { select: { id: true, name: true } },
        },
      }),
      prisma.calendarEvent.count({ where: where as any }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }
}

export const calendarService = new CalendarService();
