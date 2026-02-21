import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { careerController } from './career.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// /me shortcuts — must be before /:userId to prevent "me" being passed as UUID to Prisma
router.get('/path/me', (req: any, res, next) => {
  req.params.userId = req.user!.id;
  return careerController.getCareerPath(req as AuthenticatedRequest, res, next);
});
router.get('/goals/me', (req: any, res, next) => {
  req.params.userId = req.user!.id;
  return careerController.getCareerGoals(req as AuthenticatedRequest, res, next);
});

router.get('/path/:userId', (req, res, next) => careerController.getCareerPath(req as AuthenticatedRequest, res, next));
router.get('/growth-requirements/:roleId', (req, res, next) => careerController.getGrowthRequirements(req as AuthenticatedRequest, res, next));
router.get('/roles', (req, res, next) => careerController.getRoles(req as AuthenticatedRequest, res, next));
router.get('/goals/:userId', (req, res, next) => careerController.getCareerGoals(req as AuthenticatedRequest, res, next));

export { router as careerRoutes };
