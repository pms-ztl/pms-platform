import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { announcementsService } from './announcements.service';

const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(['ANNOUNCEMENT', 'UPDATE', 'POLICY', 'EVENT', 'ALERT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  targetAudience: z.any().optional(),
  isPinned: z.boolean().default(false),
  publishedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  attachmentUrls: z.array(z.string()).optional(),
});

const updateAnnouncementSchema = createAnnouncementSchema.partial();

class AnnouncementsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const tenantId = req.tenantId!;
      const { page = 1, limit = 20, category, priority, status, search } = req.query;
      const result = await announcementsService.list(tenantId, {
        page: Number(page), limit: Number(limit), category: category as string,
        priority: priority as string, status: status as string, search: search as string,
      });
      res.json({ success: true, data: result.data, meta: result.meta });
    } catch (error) { next(error); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await announcementsService.getById(req.tenantId!, req.params.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createAnnouncementSchema.parse(req.body) as {
        title: string;
        content: string;
        category: string;
        priority?: string;
        targetAudience?: any;
        isPinned?: boolean;
        publishedAt?: string;
        expiresAt?: string;
        attachmentUrls?: string[];
      };
      const data = await announcementsService.create(req.tenantId!, req.user!.id, validated);
      res.status(201).json({ success: true, data });
    } catch (error) { next(error); }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateAnnouncementSchema.parse(req.body);
      const data = await announcementsService.update(req.tenantId!, req.params.id, validated);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await announcementsService.delete(req.tenantId!, req.params.id);
      res.json({ success: true, data: { deleted: true } });
    } catch (error) { next(error); }
  }

  async pin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await announcementsService.pin(req.tenantId!, req.params.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getActive(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await announcementsService.getActive(req.tenantId!, req.user!.id);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await announcementsService.getStats(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const announcementsController = new AnnouncementsController();
