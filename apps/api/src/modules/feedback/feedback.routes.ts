import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { feedbackController } from './feedback.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create feedback
router.post(
  '/',
  authorize({ resource: 'feedback', action: 'create', scope: 'all' }),
  (req, res, next) => feedbackController.create(req, res, next)
);

// List received feedback (own scope — users see only their received feedback)
router.get(
  '/received',
  authorize({ resource: 'feedback', action: 'read', scope: 'own' }),
  (req, res, next) => feedbackController.listReceived(req, res, next)
);

// List given feedback (own scope — users see only feedback they gave)
router.get(
  '/given',
  authorize({ resource: 'feedback', action: 'read', scope: 'own' }),
  (req, res, next) => feedbackController.listGiven(req, res, next)
);

// List team feedback (managers)
router.get(
  '/team',
  authorize({ resource: 'feedback', action: 'read', scope: 'team' }),
  (req, res, next) => feedbackController.listTeamFeedback(req, res, next)
);

// Get unified timeline (own scope)
router.get(
  '/timeline',
  authorize({ resource: 'feedback', action: 'read', scope: 'own' }),
  (req, res, next) => feedbackController.getTimeline(req, res, next)
);

// Get another user's timeline (team/all scope — managers & admins)
router.get(
  '/timeline/:userId',
  authorize({ resource: 'feedback', action: 'read', scope: 'team' }),
  (req, res, next) => feedbackController.getTimeline(req, res, next)
);

// Recognition wall (tenant-wide social feed — all authenticated users)
router.get(
  '/recognition-wall',
  (req, res, next) => feedbackController.getRecognitionWall(req, res, next)
);

// Top recognized leaderboard (tenant-wide — all authenticated users)
router.get(
  '/top-recognized',
  (req, res, next) => feedbackController.getTopRecognized(req, res, next)
);

// Request feedback (any authenticated user can request)
router.post(
  '/request',
  authorize({ resource: 'feedback', action: 'create', scope: 'all' }),
  (req, res, next) => feedbackController.requestFeedback(req, res, next)
);

// Get specific feedback (own scope — controller enforces ownership)
router.get(
  '/:id',
  authorize({ resource: 'feedback', action: 'read', scope: 'own' }),
  (req, res, next) => feedbackController.getById(req, res, next)
);

// Acknowledge feedback (own scope — only receiver can acknowledge)
router.post(
  '/:id/acknowledge',
  authorize({ resource: 'feedback', action: 'update', scope: 'own' }),
  (req, res, next) => feedbackController.acknowledge(req, res, next)
);

// Update feedback (own scope — within grace period)
router.put(
  '/:id',
  authorize({ resource: 'feedback', action: 'update', scope: 'own' }),
  (req, res, next) => feedbackController.update(req, res, next)
);

// Delete feedback (own scope — within grace period)
router.delete(
  '/:id',
  authorize({ resource: 'feedback', action: 'delete', scope: 'own' }),
  (req, res, next) => feedbackController.delete(req, res, next)
);

export { router as feedbackRoutes };
