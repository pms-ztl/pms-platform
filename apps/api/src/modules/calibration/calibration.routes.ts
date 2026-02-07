import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import { calibrationController } from './calibration.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Session management (HR Admin or HR BP)
router.post(
  '/sessions',
  requireRoles('HR Admin', 'HR Business Partner', 'Tenant Admin'),
  (req, res, next) => calibrationController.createSession(req, res, next)
);

router.get(
  '/sessions',
  requireRoles('HR Admin', 'HR Business Partner', 'Manager', 'Tenant Admin'),
  (req, res, next) => calibrationController.listSessions(req, res, next)
);

router.get(
  '/sessions/:id',
  requireRoles('HR Admin', 'HR Business Partner', 'Manager', 'Tenant Admin'),
  (req, res, next) => calibrationController.getSession(req, res, next)
);

router.post(
  '/sessions/:id/start',
  requireRoles('HR Admin', 'HR Business Partner', 'Tenant Admin'),
  (req, res, next) => calibrationController.startSession(req, res, next)
);

router.post(
  '/sessions/:id/complete',
  requireRoles('HR Admin', 'HR Business Partner', 'Tenant Admin'),
  (req, res, next) => calibrationController.completeSession(req, res, next)
);

router.post(
  '/sessions/:id/participants',
  requireRoles('HR Admin', 'HR Business Partner', 'Tenant Admin'),
  (req, res, next) => calibrationController.addParticipant(req, res, next)
);

// Reviews and ratings
router.get(
  '/sessions/:id/reviews',
  requireRoles('HR Admin', 'HR Business Partner', 'Manager', 'Tenant Admin'),
  (req, res, next) => calibrationController.getReviewsForCalibration(req, res, next)
);

router.post(
  '/sessions/:id/ratings',
  requireRoles('HR Admin', 'HR Business Partner', 'Manager', 'Tenant Admin'),
  (req, res, next) => calibrationController.adjustRating(req, res, next)
);

router.get(
  '/sessions/:id/ratings',
  requireRoles('HR Admin', 'HR Business Partner', 'Manager', 'Tenant Admin'),
  (req, res, next) => calibrationController.getSessionRatings(req, res, next)
);

export { router as calibrationRoutes };
