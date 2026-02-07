import { Router } from 'express';
import { reportsController } from './reports.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Report Generation Routes
 */

// Generate report on-demand
router.post(
  '/generate',
  authorize({ resource: 'reports', action: 'create', scope: 'own' }),
  reportsController.generateReport.bind(reportsController)
);

// Get report by ID
router.get(
  '/:reportId',
  authorize({ resource: 'reports', action: 'read', scope: 'own' }),
  reportsController.getReport.bind(reportsController)
);

// List generated reports
router.get(
  '/',
  authorize({ resource: 'reports', action: 'read', scope: 'own' }),
  reportsController.listReports.bind(reportsController)
);

/**
 * Report Scheduling Routes
 */

// Create schedule
router.post(
  '/schedules',
  authorize({ resource: 'reports', action: 'manage', scope: 'department' }),
  reportsController.scheduleReport.bind(reportsController)
);

// Update schedule
router.patch(
  '/schedules/:scheduleId',
  authorize({ resource: 'reports', action: 'manage', scope: 'department' }),
  reportsController.updateSchedule.bind(reportsController)
);

// Delete schedule
router.delete(
  '/schedules/:scheduleId',
  authorize({ resource: 'reports', action: 'manage', scope: 'department' }),
  reportsController.deleteSchedule.bind(reportsController)
);

// Pause schedule
router.post(
  '/schedules/:scheduleId/pause',
  authorize({ resource: 'reports', action: 'manage', scope: 'department' }),
  reportsController.pauseSchedule.bind(reportsController)
);

// Resume schedule
router.post(
  '/schedules/:scheduleId/resume',
  authorize({ resource: 'reports', action: 'manage', scope: 'department' }),
  reportsController.resumeSchedule.bind(reportsController)
);

// List schedules
router.get(
  '/schedules',
  authorize({ resource: 'reports', action: 'read', scope: 'department' }),
  reportsController.listSchedules.bind(reportsController)
);

// Get schedule statistics
router.get(
  '/schedules/:scheduleId/stats',
  authorize({ resource: 'reports', action: 'read', scope: 'department' }),
  reportsController.getScheduleStats.bind(reportsController)
);

/**
 * Job Status Routes
 */

// Get job status
router.get(
  '/jobs/:jobId',
  authorize({ resource: 'reports', action: 'read', scope: 'own' }),
  reportsController.getJobStatus.bind(reportsController)
);

/**
 * Cache Management Routes (Admin only)
 */

// Get cache statistics
router.get(
  '/cache/stats',
  authorize({ resource: 'reports', action: 'manage', scope: 'all' }),
  reportsController.getCacheStats.bind(reportsController)
);

// Invalidate cache
router.post(
  '/cache/invalidate',
  authorize({ resource: 'reports', action: 'manage', scope: 'all' }),
  reportsController.invalidateCache.bind(reportsController)
);

export default router;
