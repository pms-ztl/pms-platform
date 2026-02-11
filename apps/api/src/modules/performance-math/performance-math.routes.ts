import { Router } from 'express';
import { PerformanceMathController } from './performance-math.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const controller = new PerformanceMathController();

router.use(authenticate);

// GET /api/v1/performance-math/score/:userId - Get computed performance score for a user
router.get('/score/:userId', controller.getUserPerformanceScore.bind(controller));

// GET /api/v1/performance-math/goal-risk/:goalId - Get risk assessment for a goal
router.get('/goal-risk/:goalId', controller.getGoalRisk.bind(controller));

// GET /api/v1/performance-math/team/:managerId - Get team analytics for a manager
router.get('/team/:managerId', controller.getTeamAnalytics.bind(controller));

// POST /api/v1/performance-math/calibrate - Calibrate ratings for a review cycle
router.post('/calibrate', controller.calibrateReviewRatings.bind(controller));

// GET /api/v1/performance-math/goal-mapping/:goalId - Get mathematical task-to-goal mapping
router.get('/goal-mapping/:goalId', controller.getGoalTaskMapping.bind(controller));

// GET /api/v1/performance-math/cpis/:userId - Comprehensive Performance Intelligence Score
router.get('/cpis/:userId', controller.getCPIS.bind(controller));

export { router as performanceMathRoutes };
