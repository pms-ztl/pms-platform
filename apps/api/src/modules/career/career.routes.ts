import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { careerController } from './career.controller';

const router = Router();

router.use(authenticate);

router.get('/path/:userId', (req, res, next) => careerController.getCareerPath(req as any, res, next));
router.get('/growth-requirements/:roleId', (req, res, next) => careerController.getGrowthRequirements(req as any, res, next));
router.get('/roles', (req, res, next) => careerController.getRoles(req as any, res, next));
router.get('/goals/:userId', (req, res, next) => careerController.getCareerGoals(req as any, res, next));

export { router as careerRoutes };
