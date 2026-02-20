import { Router } from 'express';
import { authenticate, requireRoles } from '../../middleware';
import { pulseController } from './pulse.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Employee Routes (all authenticated users) ──

/** Submit a pulse check-in */
router.post('/submit', (req, res, next) =>
  pulseController.submit(req as AuthenticatedRequest, res, next),
);

/** Check if current user can submit today */
router.get('/can-submit', (req, res, next) =>
  pulseController.canSubmit(req as AuthenticatedRequest, res, next),
);

/** Get current user's pulse history */
router.get('/my-history', (req, res, next) =>
  pulseController.getMyHistory(req as AuthenticatedRequest, res, next),
);

// ── Manager+ Analytics Routes ──

router.get(
  '/analytics/overview',
  requireRoles('SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'),
  (req, res, next) =>
    pulseController.getAnalyticsOverview(req as AuthenticatedRequest, res, next),
);

router.get(
  '/analytics/trends',
  requireRoles('SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'),
  (req, res, next) =>
    pulseController.getAnalyticsTrends(req as AuthenticatedRequest, res, next),
);

router.get(
  '/analytics/departments',
  requireRoles('SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'),
  (req, res, next) =>
    pulseController.getAnalyticsDepartments(req as AuthenticatedRequest, res, next),
);

router.get(
  '/analytics/distribution',
  requireRoles('SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'),
  (req, res, next) =>
    pulseController.getAnalyticsDistribution(req as AuthenticatedRequest, res, next),
);

export const pulseRoutes = router;
