import { prisma } from '@pms/database';

class AnnouncementsService {
  /**
   * Paginated list of announcements with filters.
   * Filters: category, priority, status, isPinned, search.
   * Includes createdBy user relation (via sourceId).
   * Order: pinned first, then by publishedAt desc.
   */
  async list(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      category?: string;
      priority?: string;
      status?: string;
      isPinned?: boolean;
      search?: string;
    } = {}
  ) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      itemType: 'ANNOUNCEMENT',
    };

    if (params.category) {
      where.category = params.category;
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { message: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // For isPinned filter we need to filter after fetch since it's stored in details JSON
    const [items, total] = await Promise.all([
      prisma.notificationBoardItem.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.notificationBoardItem.count({ where }),
    ]);

    // Enrich with createdBy user data (sourceId stores the creator userId)
    const creatorIds = items
      .map((item: any) => item.sourceId)
      .filter(Boolean);
    const uniqueCreatorIds = [...new Set(creatorIds)];

    const creators =
      uniqueCreatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: uniqueCreatorIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
            },
          })
        : [];

    const creatorsMap = new Map(creators.map((u: any) => [u.id, u]));

    // Map items to announcement format
    let announcements = items.map((item: any) => {
      const details = (item.details as any) || {};
      return {
        id: item.id,
        tenantId: item.tenantId,
        title: item.title,
        content: item.message,
        category: item.category,
        priority: item.priority,
        status: item.status,
        isPinned: details.isPinned || false,
        publishedAt: details.publishedAt || item.createdAt,
        expiresAt: item.expiresAt,
        targetAudience: details.targetAudience || null,
        attachmentUrls: details.attachmentUrls || [],
        actionUrl: item.actionUrl,
        actionLabel: item.actionLabel,
        createdBy: item.sourceId ? creatorsMap.get(item.sourceId) || null : null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    // Apply isPinned filter in-memory (since it's in JSON details)
    if (params.isPinned !== undefined) {
      announcements = announcements.filter(
        (a: any) => a.isPinned === params.isPinned
      );
    }

    // Sort: pinned first, then by publishedAt desc
    announcements.sort((a: any, b: any) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: announcements,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Get single announcement by ID with createdBy user relation.
   */
  async getById(tenantId: string, id: string) {
    const item = await prisma.notificationBoardItem.findFirst({
      where: { id, tenantId, itemType: 'ANNOUNCEMENT' },
    });

    if (!item) return null;

    // Get creator user
    let createdBy = null;
    if (item.sourceId) {
      createdBy = await prisma.user.findUnique({
        where: { id: item.sourceId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
        },
      });
    }

    const details = (item.details as any) || {};

    return {
      id: item.id,
      tenantId: item.tenantId,
      title: item.title,
      content: item.message,
      category: item.category,
      priority: item.priority,
      status: item.status,
      isPinned: details.isPinned || false,
      publishedAt: details.publishedAt || item.createdAt,
      expiresAt: item.expiresAt,
      targetAudience: details.targetAudience || null,
      attachmentUrls: details.attachmentUrls || [],
      actionUrl: item.actionUrl,
      actionLabel: item.actionLabel,
      createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Create a new announcement.
   * Fields: title, content, category, priority, targetAudience, isPinned, publishedAt, expiresAt, attachmentUrls
   */
  async create(
    tenantId: string,
    userId: string,
    data: {
      title: string;
      content: string;
      category: string; // ANNOUNCEMENT, UPDATE, POLICY, EVENT, ALERT
      priority?: string; // LOW, MEDIUM, HIGH, URGENT
      targetAudience?: any; // JSON - roles/departments/all
      isPinned?: boolean;
      publishedAt?: string | Date;
      expiresAt?: string | Date;
      attachmentUrls?: string[];
    }
  ) {
    const now = new Date();
    const publishedAt = data.publishedAt ? new Date(data.publishedAt) : now;
    const isScheduled = publishedAt > now;

    const item = await prisma.notificationBoardItem.create({
      data: {
        tenantId,
        itemType: 'ANNOUNCEMENT',
        category: data.category,
        priority: (data.priority || 'MEDIUM').toLowerCase(),
        title: data.title,
        message: data.content,
        details: {
          isPinned: data.isPinned || false,
          publishedAt: publishedAt.toISOString(),
          targetAudience: data.targetAudience || { type: 'all' },
          attachmentUrls: data.attachmentUrls || [],
        },
        targetType: 'tenant',
        targetId: null,
        affectedUserIds: [],
        status: isScheduled ? 'scheduled' : 'active',
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        sourceType: 'system',
        sourceId: userId,
        isDismissible: true,
      },
    });

    return this.getById(tenantId, item.id);
  }

  /**
   * Update an existing announcement.
   */
  async update(
    tenantId: string,
    id: string,
    data: {
      title?: string;
      content?: string;
      category?: string;
      priority?: string;
      targetAudience?: any;
      isPinned?: boolean;
      publishedAt?: string | Date;
      expiresAt?: string | Date;
      attachmentUrls?: string[];
      status?: string;
    }
  ) {
    const existing = await prisma.notificationBoardItem.findFirst({
      where: { id, tenantId, itemType: 'ANNOUNCEMENT' },
    });

    if (!existing) return null;

    const existingDetails = (existing.details as any) || {};

    // Build updated details JSON
    const updatedDetails: any = { ...existingDetails };
    if (data.isPinned !== undefined) updatedDetails.isPinned = data.isPinned;
    if (data.publishedAt !== undefined)
      updatedDetails.publishedAt = new Date(data.publishedAt).toISOString();
    if (data.targetAudience !== undefined)
      updatedDetails.targetAudience = data.targetAudience;
    if (data.attachmentUrls !== undefined)
      updatedDetails.attachmentUrls = data.attachmentUrls;

    const updateData: any = { details: updatedDetails };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.message = data.content;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.priority !== undefined)
      updateData.priority = data.priority.toLowerCase();
    if (data.expiresAt !== undefined)
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    if (data.status !== undefined) updateData.status = data.status;

    await prisma.notificationBoardItem.update({
      where: { id },
      data: updateData,
    });

    return this.getById(tenantId, id);
  }

  /**
   * Delete an announcement.
   */
  async delete(tenantId: string, id: string) {
    const existing = await prisma.notificationBoardItem.findFirst({
      where: { id, tenantId, itemType: 'ANNOUNCEMENT' },
    });

    if (!existing) return null;

    await prisma.notificationBoardItem.delete({ where: { id } });
    return { id };
  }

  /**
   * Toggle pin status of an announcement.
   */
  async pin(tenantId: string, id: string) {
    const existing = await prisma.notificationBoardItem.findFirst({
      where: { id, tenantId, itemType: 'ANNOUNCEMENT' },
    });

    if (!existing) return null;

    const details = (existing.details as any) || {};
    const newPinned = !details.isPinned;

    await prisma.notificationBoardItem.update({
      where: { id },
      data: {
        details: {
          ...details,
          isPinned: newPinned,
        },
      },
    });

    return this.getById(tenantId, id);
  }

  /**
   * Get active announcements for the current user based on their role/department
   * matching targetAudience. Only published and not expired.
   */
  async getActive(tenantId: string, userId: string) {
    const now = new Date();

    // Get the user's info for audience matching
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        departmentId: true,
        businessUnitId: true,
        jobTitle: true,
      },
    });

    // Fetch all active, non-expired announcements for this tenant
    const items = await prisma.notificationBoardItem.findMany({
      where: {
        tenantId,
        itemType: 'ANNOUNCEMENT',
        status: 'active',
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get user's roles for matching
    const userRoleAssignments = await prisma.userRole.findMany({
      where: { userId },
      include: { role: { select: { name: true } } },
    });
    const userRoles = userRoleAssignments.map((ur: any) => ur.role.name);

    // Filter by audience targeting and published time
    const filtered = items.filter((item: any) => {
      const details = (item.details as any) || {};
      const audience = details.targetAudience;
      const publishedAt = details.publishedAt
        ? new Date(details.publishedAt)
        : item.createdAt;

      // Must be published (publishedAt <= now)
      if (publishedAt > now) return false;

      // If no audience specified or audience type is 'all', include it
      if (!audience || audience.type === 'all') return true;

      // Match by roles
      if (audience.roles && Array.isArray(audience.roles) && audience.roles.length > 0) {
        const roleMatch = audience.roles.some((role: string) =>
          userRoles.includes(role)
        );
        if (roleMatch) return true;
      }

      // Match by departments
      if (
        audience.departments &&
        Array.isArray(audience.departments) &&
        audience.departments.length > 0
      ) {
        if (user?.departmentId && audience.departments.includes(user.departmentId)) {
          return true;
        }
      }

      // If audience has specific criteria but user doesn't match any, exclude
      if (
        (audience.roles && audience.roles.length > 0) ||
        (audience.departments && audience.departments.length > 0)
      ) {
        return false;
      }

      return true;
    });

    // Enrich with creator info
    const creatorIds = filtered
      .map((item: any) => item.sourceId)
      .filter(Boolean);
    const uniqueCreatorIds = [...new Set(creatorIds)];

    const creators =
      uniqueCreatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: uniqueCreatorIds } },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              jobTitle: true,
            },
          })
        : [];

    const creatorsMap = new Map(creators.map((u: any) => [u.id, u]));

    // Map to announcement format and sort: pinned first, then by publishedAt desc
    const announcements = filtered
      .map((item: any) => {
        const details = (item.details as any) || {};
        return {
          id: item.id,
          tenantId: item.tenantId,
          title: item.title,
          content: item.message,
          category: item.category,
          priority: item.priority,
          status: item.status,
          isPinned: details.isPinned || false,
          publishedAt: details.publishedAt || item.createdAt,
          expiresAt: item.expiresAt,
          targetAudience: details.targetAudience || null,
          attachmentUrls: details.attachmentUrls || [],
          createdBy: item.sourceId ? creatorsMap.get(item.sourceId) || null : null,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      })
      .sort((a: any, b: any) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
      });

    return announcements;
  }

  /**
   * Stats: total active, by category, by priority, upcoming scheduled.
   */
  async getStats(tenantId: string) {
    const now = new Date();

    const baseWhere = {
      tenantId,
      itemType: 'ANNOUNCEMENT',
    };

    // Total active (not expired)
    const totalActive = await prisma.notificationBoardItem.count({
      where: {
        ...baseWhere,
        status: 'active',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });

    // All announcements for grouping
    const allItems = await prisma.notificationBoardItem.findMany({
      where: {
        ...baseWhere,
        status: { in: ['active', 'scheduled'] },
      },
      select: {
        category: true,
        priority: true,
        status: true,
        details: true,
        expiresAt: true,
      },
    });

    // By category
    const byCategory: Record<string, number> = {};
    for (const item of allItems) {
      if (item.status === 'active') {
        byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      }
    }

    // By priority
    const byPriority: Record<string, number> = {};
    for (const item of allItems) {
      if (item.status === 'active') {
        byPriority[item.priority] = (byPriority[item.priority] || 0) + 1;
      }
    }

    // Upcoming scheduled (publishedAt in the future)
    const upcomingScheduled = allItems.filter((item: any) => {
      const details = (item.details as any) || {};
      if (!details.publishedAt) return false;
      return new Date(details.publishedAt) > now;
    }).length;

    // Expired count
    const totalExpired = await prisma.notificationBoardItem.count({
      where: {
        ...baseWhere,
        status: 'expired',
      },
    });

    return {
      totalActive,
      totalExpired,
      upcomingScheduled,
      byCategory,
      byPriority,
    };
  }
}

export const announcementsService = new AnnouncementsService();
