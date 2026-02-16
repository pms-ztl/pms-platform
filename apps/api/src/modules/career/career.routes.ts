import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { careerController } from './career.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

router.get('/path/:userId', (req, res, next) => careerController.getCareerPath(req as AuthenticatedRequest, res, next));
router.get('/growth-requirements/:roleId', (req, res, next) => careerController.getGrowthRequirements(req as AuthenticatedRequest, res, next));
router.get('/roles', (req, res, next) => careerController.getRoles(req as AuthenticatedRequest, res, next));
router.get('/goals/:userId', (req, res, next) => careerController.getCareerGoals(req as AuthenticatedRequest, res, next));

export { router as careerRoutes };
