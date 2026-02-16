import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { SUPER_ADMIN_ROLES } from '../../utils/roles';
import { auditController } from './audit.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// GET / - List audit events (HR_ADMIN+)
router.get(
  '/',
  authorize({ resource: 'audit', action: 'read', scope: 'all' }),
  (req, res, next) => auditController.list(req as AuthenticatedRequest, res, next)
);

// GET /stats - Get audit statistics (HR_ADMIN+)
router.get(
  '/stats',
  authorize({ resource: 'audit', action: 'read', scope: 'all' }),
  (req, res, next) => auditController.getStats(req as AuthenticatedRequest, res, next)
);

// GET /entity/:entityType/:entityId - Get entity history
router.get(
  '/entity/:entityType/:entityId',
  authorize({ resource: 'audit', action: 'read', scope: 'all' }),
  (req, res, next) => auditController.getEntityHistory(req as AuthenticatedRequest, res, next)
);

// GET /user/:userId - Get user activity (HR_ADMIN+ or own activity)
router.get(
  '/user/:userId',
  authorize(
    { resource: 'audit', action: 'read', scope: 'all' },
    { resource: 'audit', action: 'read', scope: 'own' }
  ),
  (req, res, next) => auditController.getUserActivity(req as AuthenticatedRequest, res, next)
);

// GET /:id - Get single audit event
router.get(
  '/:id',
  authorize({ resource: 'audit', action: 'read', scope: 'all' }),
  (req, res, next) => auditController.getById(req as AuthenticatedRequest, res, next)
);

// DELETE /purge - Purge old audit events (SUPER_ADMIN only)
router.delete(
  '/purge',
  authorize({ roles: [...SUPER_ADMIN_ROLES] }),
  (req, res, next) => auditController.purge(req as AuthenticatedRequest, res, next)
);

export { router as auditRoutes };
