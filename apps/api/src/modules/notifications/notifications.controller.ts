import { Request, Response, NextFunction } from 'express';
import { notificationsService } from './notifications.service';
import { logger } from '../../utils/logger';

export class NotificationsController {
  /**
   * GET /api/v1/notifications
   * Get user's notifications
   */
  async getNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;
      const { unreadOnly, channel, limit, offset } = req.query;

      const result = await notificationsService.getUserNotifications(userId, tenantId, {
        unreadOnly: unreadOnly === 'true',
        channel: channel as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/:id/read
   * Mark a notification as read
   */
  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: userId } = req.user!;
      const { id } = req.params;

      await notificationsService.markAsRead(id, userId);

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;

      await notificationsService.markAllAsRead(userId, tenantId);

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/preferences
   * Get user's notification preferences
   */
  async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;

      const preferences = await notificationsService.getUserPreferences(userId, tenantId);

      res.json({
        success: true,
        data: preferences,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/notifications/preferences
   * Update user's notification preferences
   */
  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;
      const preferences = req.body;

      const updated = await notificationsService.updateUserPreferences(userId, tenantId, preferences);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notification count
   */
  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId } = req.user!;

      const result = await notificationsService.getUserNotifications(userId, tenantId, {
        unreadOnly: true,
        limit: 0,
      });

      res.json({
        success: true,
        data: { count: result.meta.unread },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const notificationsController = new NotificationsController();
