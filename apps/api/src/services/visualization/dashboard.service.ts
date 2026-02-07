import { prisma } from '@pms/database';
import { logger } from '../../utils/logger';

export type DashboardType = 'EXECUTIVE' | 'DEPARTMENT' | 'PERSONAL' | 'TEAM' | 'CUSTOM';
export type WidgetType = 'CHART' | 'METRIC' | 'TABLE' | 'MAP' | 'TIMELINE' | 'KANBAN' | 'LIST' | 'NOTIFICATION_BOARD';
export type ChartType =
  | 'LINE' | 'BAR' | 'RADAR' | 'GANTT' | 'HEATMAP' | 'CALENDAR_HEATMAP'
  | 'BOX_PLOT' | 'SANKEY' | 'TREEMAP' | 'SCATTER' | 'AREA' | 'PIE' | 'DONUT'
  | 'FUNNEL' | 'WATERFALL' | 'BULLET' | 'GAUGE' | 'KPI_TREE';

interface CreateDashboardParams {
  tenantId: string;
  ownerId: string;
  name: string;
  description?: string;
  dashboardType: DashboardType;
  layout?: any[];
  theme?: any;
  visibility?: string;
  sharedWith?: string[];
  allowedRoles?: string[];
  refreshInterval?: number;
  isDefault?: boolean;
  isTemplate?: boolean;
  tags?: string[];
}

interface CreateWidgetParams {
  tenantId: string;
  dashboardId: string;
  name: string;
  description?: string;
  widgetType: WidgetType;
  chartType?: ChartType;
  dataSource: any;
  configuration: any;
  position: any;
  title?: string;
  showTitle?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  isDrilldownEnabled?: boolean;
  drilldownConfig?: any;
  clickActions?: any;
  refreshInterval?: number;
}

/**
 * Dashboard Service
 *
 * Manages dashboards and widgets for the visualization infrastructure
 */
export class DashboardService {
  /**
   * Create a new dashboard
   */
  async createDashboard(params: CreateDashboardParams): Promise<any> {
    logger.info('Creating dashboard', { tenantId: params.tenantId, name: params.name });

    const dashboard = await prisma.dashboard.create({
      data: {
        tenantId: params.tenantId,
        ownerId: params.ownerId,
        name: params.name,
        description: params.description,
        dashboardType: params.dashboardType,
        layout: params.layout || [],
        theme: params.theme || {},
        visibility: params.visibility || 'private',
        sharedWith: params.sharedWith || [],
        allowedRoles: params.allowedRoles || [],
        refreshInterval: params.refreshInterval || 300,
        isDefault: params.isDefault || false,
        isTemplate: params.isTemplate || false,
        tags: params.tags || [],
      },
    });

    logger.info('Dashboard created', { dashboardId: dashboard.id });

    return dashboard;
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(dashboardId: string, tenantId: string, userId: string): Promise<any> {
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        tenantId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { visibility: 'all' },
          { sharedWith: { has: userId } },
        ],
      },
      include: {
        widgets: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: [
            { zIndex: 'asc' },
            { createdAt: 'asc' },
          ],
        },
      },
    });

    if (!dashboard) {
      throw new Error('Dashboard not found or access denied');
    }

    return dashboard;
  }

  /**
   * List dashboards for user
   */
  async listDashboards(
    tenantId: string,
    userId: string,
    filters?: {
      dashboardType?: DashboardType;
      isDefault?: boolean;
      isTemplate?: boolean;
      tags?: string[];
    }
  ): Promise<any[]> {
    const where: any = {
      tenantId,
      deletedAt: null,
      OR: [
        { ownerId: userId },
        { visibility: 'all' },
        { sharedWith: { has: userId } },
      ],
    };

    if (filters?.dashboardType) {
      where.dashboardType = filters.dashboardType;
    }

    if (filters?.isDefault !== undefined) {
      where.isDefault = filters.isDefault;
    }

    if (filters?.isTemplate !== undefined) {
      where.isTemplate = filters.isTemplate;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    const dashboards = await prisma.dashboard.findMany({
      where,
      include: {
        _count: {
          select: { widgets: true },
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return dashboards;
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    dashboardId: string,
    tenantId: string,
    userId: string,
    updates: Partial<CreateDashboardParams>
  ): Promise<any> {
    // Check ownership
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        tenantId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!dashboard) {
      throw new Error('Dashboard not found or access denied');
    }

    const updated = await prisma.dashboard.update({
      where: { id: dashboardId },
      data: updates,
    });

    logger.info('Dashboard updated', { dashboardId });

    return updated;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId: string, tenantId: string, userId: string): Promise<void> {
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        tenantId,
        ownerId: userId,
        deletedAt: null,
      },
    });

    if (!dashboard) {
      throw new Error('Dashboard not found or access denied');
    }

    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { deletedAt: new Date() },
    });

    logger.info('Dashboard deleted', { dashboardId });
  }

  /**
   * Duplicate dashboard
   */
  async duplicateDashboard(
    dashboardId: string,
    tenantId: string,
    userId: string,
    newName?: string
  ): Promise<any> {
    const original = await this.getDashboard(dashboardId, tenantId, userId);

    const duplicate = await prisma.dashboard.create({
      data: {
        tenantId,
        ownerId: userId,
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        dashboardType: original.dashboardType,
        layout: original.layout,
        theme: original.theme,
        visibility: 'private',
        refreshInterval: original.refreshInterval,
        tags: original.tags,
      },
    });

    // Duplicate widgets
    for (const widget of original.widgets) {
      await this.createWidget({
        tenantId,
        dashboardId: duplicate.id,
        name: widget.name,
        description: widget.description,
        widgetType: widget.widgetType as WidgetType,
        chartType: widget.chartType as ChartType,
        dataSource: widget.dataSource,
        configuration: widget.configuration,
        position: widget.position,
        title: widget.title,
        showTitle: widget.showTitle,
        showLegend: widget.showLegend,
        showTooltip: widget.showTooltip,
        isDrilldownEnabled: widget.isDrilldownEnabled,
        drilldownConfig: widget.drilldownConfig,
        clickActions: widget.clickActions,
        refreshInterval: widget.refreshInterval,
      });
    }

    logger.info('Dashboard duplicated', { originalId: dashboardId, duplicateId: duplicate.id });

    return duplicate;
  }

  /**
   * Create widget
   */
  async createWidget(params: CreateWidgetParams): Promise<any> {
    logger.info('Creating widget', { dashboardId: params.dashboardId, name: params.name });

    const widget = await prisma.widget.create({
      data: {
        tenantId: params.tenantId,
        dashboardId: params.dashboardId,
        name: params.name,
        description: params.description,
        widgetType: params.widgetType,
        chartType: params.chartType,
        dataSource: params.dataSource,
        configuration: params.configuration,
        position: params.position,
        title: params.title,
        showTitle: params.showTitle ?? true,
        showLegend: params.showLegend ?? true,
        showTooltip: params.showTooltip ?? true,
        isDrilldownEnabled: params.isDrilldownEnabled ?? false,
        drilldownConfig: params.drilldownConfig,
        clickActions: params.clickActions,
        refreshInterval: params.refreshInterval,
      },
    });

    logger.info('Widget created', { widgetId: widget.id });

    return widget;
  }

  /**
   * Update widget
   */
  async updateWidget(
    widgetId: string,
    tenantId: string,
    updates: Partial<CreateWidgetParams>
  ): Promise<any> {
    const widget = await prisma.widget.findFirst({
      where: {
        id: widgetId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!widget) {
      throw new Error('Widget not found');
    }

    const updated = await prisma.widget.update({
      where: { id: widgetId },
      data: updates,
    });

    logger.info('Widget updated', { widgetId });

    return updated;
  }

  /**
   * Delete widget
   */
  async deleteWidget(widgetId: string, tenantId: string): Promise<void> {
    await prisma.widget.update({
      where: { id: widgetId },
      data: { deletedAt: new Date() },
    });

    logger.info('Widget deleted', { widgetId });
  }

  /**
   * Reorder widgets (update z-index)
   */
  async reorderWidgets(widgetIds: string[], tenantId: string): Promise<void> {
    for (let i = 0; i < widgetIds.length; i++) {
      await prisma.widget.update({
        where: { id: widgetIds[i] },
        data: { zIndex: i },
      });
    }

    logger.info('Widgets reordered', { count: widgetIds.length });
  }

  /**
   * Update widget layout positions
   */
  async updateWidgetLayouts(
    dashboardId: string,
    tenantId: string,
    layouts: Array<{ widgetId: string; position: any }>
  ): Promise<void> {
    for (const layout of layouts) {
      await prisma.widget.update({
        where: { id: layout.widgetId },
        data: { position: layout.position },
      });
    }

    logger.info('Widget layouts updated', { dashboardId, count: layouts.length });
  }

  /**
   * Cache widget data
   */
  async cacheWidgetData(widgetId: string, data: any, cacheDuration: number = 300): Promise<void> {
    const expiresAt = new Date(Date.now() + cacheDuration * 1000);

    await prisma.widget.update({
      where: { id: widgetId },
      data: {
        cachedData: data,
        cacheExpiresAt: expiresAt,
        lastRefreshedAt: new Date(),
      },
    });

    logger.debug('Widget data cached', { widgetId, expiresAt });
  }

  /**
   * Get cached widget data
   */
  async getCachedWidgetData(widgetId: string): Promise<any | null> {
    const widget = await prisma.widget.findUnique({
      where: { id: widgetId },
      select: {
        cachedData: true,
        cacheExpiresAt: true,
      },
    });

    if (!widget || !widget.cachedData) {
      return null;
    }

    if (widget.cacheExpiresAt && widget.cacheExpiresAt < new Date()) {
      logger.debug('Widget cache expired', { widgetId });
      return null;
    }

    logger.debug('Widget cache hit', { widgetId });
    return widget.cachedData;
  }

  /**
   * Share dashboard with users
   */
  async shareDashboard(
    dashboardId: string,
    tenantId: string,
    ownerId: string,
    userIds: string[]
  ): Promise<void> {
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        tenantId,
        ownerId,
        deletedAt: null,
      },
    });

    if (!dashboard) {
      throw new Error('Dashboard not found or access denied');
    }

    const currentShared = dashboard.sharedWith || [];
    const newShared = Array.from(new Set([...currentShared, ...userIds]));

    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { sharedWith: newShared },
    });

    logger.info('Dashboard shared', { dashboardId, addedUsers: userIds.length });
  }

  /**
   * Unshare dashboard from users
   */
  async unshareDashboard(
    dashboardId: string,
    tenantId: string,
    ownerId: string,
    userIds: string[]
  ): Promise<void> {
    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id: dashboardId,
        tenantId,
        ownerId,
        deletedAt: null,
      },
    });

    if (!dashboard) {
      throw new Error('Dashboard not found or access denied');
    }

    const currentShared = dashboard.sharedWith || [];
    const newShared = currentShared.filter(id => !userIds.includes(id));

    await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { sharedWith: newShared },
    });

    logger.info('Dashboard unshared', { dashboardId, removedUsers: userIds.length });
  }

  /**
   * Create dashboard from template
   */
  async createFromTemplate(
    templateId: string,
    tenantId: string,
    userId: string,
    name: string
  ): Promise<any> {
    const template = await prisma.dashboard.findFirst({
      where: {
        id: templateId,
        isTemplate: true,
        deletedAt: null,
      },
      include: {
        widgets: {
          where: { isActive: true, deletedAt: null },
        },
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return this.duplicateDashboard(templateId, tenantId, userId, name);
  }

  /**
   * Get dashboard templates
   */
  async getTemplates(tenantId?: string): Promise<any[]> {
    const where: any = {
      isTemplate: true,
      isActive: true,
      deletedAt: null,
    };

    if (tenantId) {
      where.OR = [
        { tenantId },
        { tenantId: null }, // System templates
      ];
    }

    const templates = await prisma.dashboard.findMany({
      where,
      include: {
        _count: {
          select: { widgets: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return templates;
  }
}

export const dashboardService = new DashboardService();
