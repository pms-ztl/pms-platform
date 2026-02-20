import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { goalsController } from './goals.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Goal CRUD (own + team scope so managers can assign goals to reports)
router.post(
  '/',
  authorize(
    { resource: 'goals', action: 'create', scope: 'own' },
    { resource: 'goals', action: 'create', scope: 'team' }
  ),
  (req, res, next) => goalsController.create(req, res, next)
);

router.get(
  '/',
  authorize({ resource: 'goals', action: 'read', scope: 'own' }),
  (req, res, next) => goalsController.list(req, res, next)
);

router.get(
  '/my',
  (req, res, next) => goalsController.getMyGoals(req, res, next)
);

router.get(
  '/tree',
  authorize({ resource: 'goals', action: 'read', scope: 'all' }),
  (req, res, next) => goalsController.getGoalTree(req, res, next)
);

// Bulk operations
router.put(
  '/bulk-update',
  authorize({ resource: 'goals', action: 'update', scope: 'all' }),
  (req, res, next) => goalsController.bulkUpdate(req, res, next)
);

// Export
router.get(
  '/export',
  authorize({ resource: 'goals', action: 'read', scope: 'all' }),
  (req, res, next) => goalsController.exportGoals(req, res, next)
);

// Deadline reminders (admin or cron)
router.post(
  '/check-reminders',
  authorize({ resource: 'goals', action: 'update', scope: 'all' }),
  (req, res, next) => goalsController.checkReminders(req, res, next)
);

router.get(
  '/team-tree',
  authorize({ resource: 'goals', action: 'read', scope: 'team' }),
  (req, res, next) => goalsController.getTeamGoalTree(req, res, next)
);

// Activity feed for a goal
router.get(
  '/:id/activity',
  authorize({ resource: 'goals', action: 'read', scope: 'own' }),
  (req, res, next) => goalsController.getActivity(req, res, next)
);

router.get(
  '/:id',
  authorize({ resource: 'goals', action: 'read', scope: 'own' }),
  (req, res, next) => goalsController.getById(req, res, next)
);

router.put(
  '/:id',
  authorize({ resource: 'goals', action: 'update', scope: 'own' }),
  (req, res, next) => goalsController.update(req, res, next)
);

router.delete(
  '/:id',
  authorize({ resource: 'goals', action: 'delete', scope: 'own' }),
  (req, res, next) => goalsController.delete(req, res, next)
);

// Progress tracking
router.post(
  '/:id/progress',
  authorize({ resource: 'goals', action: 'update', scope: 'own' }),
  (req, res, next) => goalsController.updateProgress(req, res, next)
);

router.get(
  '/:id/progress/history',
  authorize({ resource: 'goals', action: 'read', scope: 'own' }),
  (req, res, next) => goalsController.getProgressHistory(req, res, next)
);

// Goal alignment
router.post(
  '/:id/align',
  authorize({ resource: 'goals', action: 'update', scope: 'own' }),
  (req, res, next) => goalsController.alignGoals(req, res, next)
);

router.delete(
  '/:id/align/:toGoalId',
  authorize({ resource: 'goals', action: 'update', scope: 'own' }),
  (req, res, next) => goalsController.removeAlignment(req, res, next)
);

// Comments
router.post(
  '/:id/comments',
  authorize({ resource: 'goals', action: 'read', scope: 'own' }),
  (req, res, next) => goalsController.addComment(req, res, next)
);

router.get(
  '/:id/comments',
  authorize({ resource: 'goals', action: 'read', scope: 'own' }),
  (req, res, next) => goalsController.getComments(req, res, next)
);

export { router as goalsRoutes };
