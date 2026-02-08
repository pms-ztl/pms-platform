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

// List received feedback
router.get(
  '/received',
  (req, res, next) => feedbackController.listReceived(req, res, next)
);

// List given feedback
router.get(
  '/given',
  (req, res, next) => feedbackController.listGiven(req, res, next)
);

// List team feedback (managers)
router.get(
  '/team',
  authorize({ resource: 'feedback', action: 'read', scope: 'team' }),
  (req, res, next) => feedbackController.listTeamFeedback(req, res, next)
);

// Get unified timeline
router.get(
  '/timeline',
  (req, res, next) => feedbackController.getTimeline(req, res, next)
);

router.get(
  '/timeline/:userId',
  authorize({ resource: 'feedback', action: 'read', scope: 'team' }),
  (req, res, next) => feedbackController.getTimeline(req, res, next)
);

// Recognition wall (public feed of recognitions)
router.get(
  '/recognition-wall',
  (req, res, next) => feedbackController.getRecognitionWall(req, res, next)
);

// Top recognized employees leaderboard
router.get(
  '/top-recognized',
  (req, res, next) => feedbackController.getTopRecognized(req, res, next)
);

// Request feedback
router.post(
  '/request',
  (req, res, next) => feedbackController.requestFeedback(req, res, next)
);

// Get specific feedback
router.get(
  '/:id',
  (req, res, next) => feedbackController.getById(req, res, next)
);

// Acknowledge feedback
router.post(
  '/:id/acknowledge',
  (req, res, next) => feedbackController.acknowledge(req, res, next)
);

// Delete feedback
router.delete(
  '/:id',
  (req, res, next) => feedbackController.delete(req, res, next)
);

export { router as feedbackRoutes };
