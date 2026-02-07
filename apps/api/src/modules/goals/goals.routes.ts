import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { goalsController } from './goals.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Goal CRUD
router.post(
  '/',
  authorize({ resource: 'goals', action: 'create', scope: 'own' }),
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
