import { Router } from 'express';
import { LeaderboardController } from './leaderboard.controller';
import { authenticate } from '../../middleware/authenticate';

const router = Router();
const controller = new LeaderboardController();

router.use(authenticate);

// Index route — returns the performance leaderboard (most common use case)
router.get('/', controller.getPerformanceLeaderboard.bind(controller));

router.get('/performance', controller.getPerformanceLeaderboard.bind(controller));
router.get('/goals', controller.getGoalsLeaderboard.bind(controller));
router.get('/recognition', controller.getRecognitionLeaderboard.bind(controller));
router.get('/learning', controller.getLearningLeaderboard.bind(controller));
router.get('/departments', controller.getDepartmentScores.bind(controller));
router.get('/my-stats', controller.getMyStats.bind(controller));

export { router as leaderboardRoutes };
