import { Router } from 'express';
import { analyticsController } from './analytics.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Dashboard metrics (all authenticated users)
router.get('/dashboard', analyticsController.getDashboard);

// Performance distribution (all authenticated users)
router.get('/performance-distribution', analyticsController.getPerformanceDistribution);

// Goal trends (all authenticated users)
router.get('/goal-trends', analyticsController.getGoalTrends);

// Feedback trends (all authenticated users)
router.get('/feedback-trends', analyticsController.getFeedbackTrends);

// Team performance (HR admin only)
router.get(
  '/team-performance',
  authorize({ roles: ['HR_ADMIN', 'ADMIN'] }),
  analyticsController.getTeamPerformance
);

// Bias metrics (HR admin only)
router.get(
  '/bias-metrics',
  authorize({ roles: ['HR_ADMIN', 'ADMIN'] }),
  analyticsController.getBiasMetrics
);

// Review cycle stats
router.get('/cycle/:cycleId/stats', analyticsController.getCycleStats);

// Export data (HR admin only)
router.get(
  '/export/:dataType',
  authorize({ roles: ['HR_ADMIN', 'ADMIN'] }),
  analyticsController.exportData
);

export default router;
