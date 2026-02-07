import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize, requireRoles } from '../../middleware/authorize';
import { reviewsController } from './reviews.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== Review Cycles (HR Admin only) ====================

router.post(
  '/cycles',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => reviewsController.createCycle(req, res, next)
);

router.get(
  '/cycles',
  authorize({ resource: 'reviews', action: 'read', scope: 'own' }),
  (req, res, next) => reviewsController.listCycles(req, res, next)
);

router.get(
  '/cycles/:id',
  authorize({ resource: 'reviews', action: 'read', scope: 'own' }),
  (req, res, next) => reviewsController.getCycle(req, res, next)
);

router.put(
  '/cycles/:id',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => reviewsController.updateCycle(req, res, next)
);

router.post(
  '/cycles/:id/launch',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => reviewsController.launchCycle(req, res, next)
);

router.post(
  '/cycles/:id/advance',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => reviewsController.advanceCycleStatus(req, res, next)
);

router.get(
  '/cycles/:id/stats',
  requireRoles('HR Admin', 'HR Business Partner', 'Tenant Admin'),
  (req, res, next) => reviewsController.getCycleStats(req, res, next)
);

// ==================== Reviews ====================

router.get(
  '/my',
  (req, res, next) => reviewsController.listMyReviews(req, res, next)
);

router.get(
  '/:id',
  authorize({ resource: 'reviews', action: 'read', scope: 'own' }),
  (req, res, next) => reviewsController.getReview(req, res, next)
);

router.post(
  '/:id/start',
  authorize({ resource: 'reviews', action: 'update', scope: 'own' }),
  (req, res, next) => reviewsController.startReview(req, res, next)
);

router.put(
  '/:id/draft',
  authorize({ resource: 'reviews', action: 'update', scope: 'own' }),
  (req, res, next) => reviewsController.saveDraft(req, res, next)
);

router.post(
  '/:id/submit',
  authorize({ resource: 'reviews', action: 'update', scope: 'own' }),
  (req, res, next) => reviewsController.submitReview(req, res, next)
);

router.post(
  '/:id/acknowledge',
  (req, res, next) => reviewsController.acknowledgeReview(req, res, next)
);

export { router as reviewsRoutes };
