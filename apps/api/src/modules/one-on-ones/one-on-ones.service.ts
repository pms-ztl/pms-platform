import { prisma } from '@pms/database';
import { auditLogger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';

interface CreateOneOnOneInput {
  employeeId: string;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  agenda?: Array<{ topic: string; notes?: string }>;
}

interface UpdateOneOnOneInput {
  managerNotes?: string;
  employeeNotes?: string;
  sharedNotes?: string;
  actionItems?: Array<{ title: string; done: boolean; assignee?: string }>;
  agenda?: Array<{ topic: string; notes?: string }>;
  location?: string;
  meetingLink?: string;
  scheduledAt?: string;
  duration?: number;
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  jobTitle: true,
};

export class OneOnOnesService {
  async create(tenantId: string, managerId: string, input: CreateOneOnOneInput) {
    // Verify employee exists in same tenant
    const employee = await prisma.user.findFirst({
      where: { id: input.employeeId, tenantId, isActive: true, deletedAt: null },
    });
    if (!employee) {
      throw new NotFoundError('Employee', input.employeeId);
    }

    const meeting = await prisma.oneOnOne.create({
      data: {
        tenantId,
        managerId,
        employeeId: input.employeeId,
        scheduledAt: new Date(input.scheduledAt),
        duration: input.duration ?? 30,
        location: input.location,
        meetingLink: input.meetingLink,
        agenda: input.agenda ?? [],
        status: 'SCHEDULED',
      },
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
      },
    });

    auditLogger('ONE_ON_ONE_CREATED', managerId, tenantId, 'one_on_one', meeting.id, {
      employeeId: input.employeeId,
      scheduledAt: input.scheduledAt,
    });

    return meeting;
  }

  async list(tenantId: string, userId: string, filters?: { status?: string; page?: number; limit?: number }) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null,
      OR: [{ managerId: userId }, { employeeId: userId }],
    };
    if (filters?.status) {
      const statuses = filters.status.split(',').map((s: string) => s.trim());
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    const [data, total] = await Promise.all([
      prisma.oneOnOne.findMany({
        where,
        include: {
          manager: { select: userSelect },
          employee: { select: userSelect },
        },
        orderBy: { scheduledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.oneOnOne.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(tenantId: string, id: string, userId: string) {
    const meeting = await prisma.oneOnOne.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
        OR: [{ managerId: userId }, { employeeId: userId }],
      },
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
      },
    });

    if (!meeting) {
      throw new NotFoundError('OneOnOne', id);
    }
    return meeting;
  }

  async update(tenantId: string, id: string, userId: string, input: UpdateOneOnOneInput) {
    const meeting = await this.getById(tenantId, id, userId);

    const updateData: any = {};
    if (input.agenda !== undefined) updateData.agenda = input.agenda;
    if (input.actionItems !== undefined) updateData.actionItems = input.actionItems;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.meetingLink !== undefined) updateData.meetingLink = input.meetingLink;
    if (input.scheduledAt !== undefined) updateData.scheduledAt = new Date(input.scheduledAt);
    if (input.duration !== undefined) updateData.duration = input.duration;

    // Notes: only the right person can update their notes
    if (input.managerNotes !== undefined && userId === meeting.managerId) {
      updateData.managerNotes = input.managerNotes;
    }
    if (input.employeeNotes !== undefined && userId === meeting.employeeId) {
      updateData.employeeNotes = input.employeeNotes;
    }
    if (input.sharedNotes !== undefined) {
      updateData.sharedNotes = input.sharedNotes;
    }

    const updated = await prisma.oneOnOne.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
      },
    });

    auditLogger('ONE_ON_ONE_UPDATED', userId, tenantId, 'one_on_one', id, updateData);
    return updated;
  }

  async start(tenantId: string, id: string, userId: string) {
    const meeting = await this.getById(tenantId, id, userId);
    if (meeting.status !== 'SCHEDULED') {
      throw new ValidationError(`Cannot start meeting in ${meeting.status} status`);
    }

    const updated = await prisma.oneOnOne.update({
      where: { id },
      data: { status: 'IN_PROGRESS' },
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
      },
    });

    auditLogger('ONE_ON_ONE_STARTED', userId, tenantId, 'one_on_one', id, {});
    return updated;
  }

  async complete(tenantId: string, id: string, userId: string, input?: { sharedNotes?: string; actionItems?: any }) {
    const meeting = await this.getById(tenantId, id, userId);
    if (meeting.status !== 'IN_PROGRESS' && meeting.status !== 'SCHEDULED') {
      throw new ValidationError(`Cannot complete meeting in ${meeting.status} status`);
    }

    const updateData: any = { status: 'COMPLETED', completedAt: new Date() };
    if (input?.sharedNotes) updateData.sharedNotes = input.sharedNotes;
    if (input?.actionItems) updateData.actionItems = input.actionItems;

    const updated = await prisma.oneOnOne.update({
      where: { id },
      data: updateData,
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
      },
    });

    auditLogger('ONE_ON_ONE_COMPLETED', userId, tenantId, 'one_on_one', id, {});
    return updated;
  }

  async cancel(tenantId: string, id: string, userId: string) {
    const meeting = await this.getById(tenantId, id, userId);
    if (meeting.status === 'COMPLETED' || meeting.status === 'CANCELLED') {
      throw new ValidationError(`Cannot cancel meeting in ${meeting.status} status`);
    }

    const updated = await prisma.oneOnOne.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
      },
    });

    auditLogger('ONE_ON_ONE_CANCELLED', userId, tenantId, 'one_on_one', id, {});
    return updated;
  }

  async getUpcoming(tenantId: string, userId: string) {
    return prisma.oneOnOne.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        scheduledAt: { gte: new Date() },
        OR: [{ managerId: userId }, { employeeId: userId }],
      },
      include: {
        manager: { select: userSelect },
        employee: { select: userSelect },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
    });
  }
}

export const oneOnOnesService = new OneOnOnesService();
