import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { developmentController } from './development.controller';

const router = Router();

router.use(authenticate);

// Plans
router.post('/plans', (req, res, next) => developmentController.createPlan(req, res, next));
router.get('/plans', (req, res, next) => developmentController.listPlans(req, res, next));
router.get('/plans/team',
  authorize({ resource: 'development', action: 'read', scope: 'team' }),
  (req, res, next) => developmentController.getTeamPlans(req, res, next)
);
router.get('/plans/:id', (req, res, next) => developmentController.getPlanById(req, res, next));
router.put('/plans/:id', (req, res, next) => developmentController.updatePlan(req, res, next));
router.post('/plans/:id/approve',
  authorize({ resource: 'development', action: 'update', scope: 'team' }),
  (req, res, next) => developmentController.approvePlan(req, res, next)
);

// Activities
router.post('/plans/:id/activities', (req, res, next) => developmentController.addActivity(req, res, next));
router.put('/activities/:id', (req, res, next) => developmentController.updateActivity(req, res, next));

// Checkpoints
router.post('/plans/:id/checkpoints',
  authorize({ resource: 'development', action: 'update', scope: 'team' }),
  (req, res, next) => developmentController.addCheckpoint(req, res, next)
);
router.put('/checkpoints/:id/complete',
  authorize({ resource: 'development', action: 'update', scope: 'team' }),
  (req, res, next) => developmentController.completeCheckpoint(req, res, next)
);

export { router as developmentRoutes };
