import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { announcementsController } from './announcements.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// All users can view active announcements
router.get('/active', (req, res, next) => announcementsController.getActive(req as AuthenticatedRequest, res, next));

// Admin management
router.get('/', authorize({ resource: 'announcements', action: 'read', scope: 'all' }), (req, res, next) => announcementsController.list(req as AuthenticatedRequest, res, next));
router.get('/stats', authorize({ resource: 'announcements', action: 'read', scope: 'all' }), (req, res, next) => announcementsController.getStats(req as AuthenticatedRequest, res, next));
router.post('/', authorize({ resource: 'announcements', action: 'create', scope: 'all' }), (req, res, next) => announcementsController.create(req as AuthenticatedRequest, res, next));
router.get('/:id', (req, res, next) => announcementsController.getById(req as AuthenticatedRequest, res, next));
router.put('/:id', authorize({ resource: 'announcements', action: 'update', scope: 'all' }), (req, res, next) => announcementsController.update(req as AuthenticatedRequest, res, next));
router.delete('/:id', authorize({ resource: 'announcements', action: 'delete', scope: 'all' }), (req, res, next) => announcementsController.delete(req as AuthenticatedRequest, res, next));
router.post('/:id/pin', authorize({ resource: 'announcements', action: 'update', scope: 'all' }), (req, res, next) => announcementsController.pin(req as AuthenticatedRequest, res, next));

export { router as announcementRoutes };
