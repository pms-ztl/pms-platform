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

// List generated reports (must be before /:reportId)
router.get(
  '/',
  authorize({ resource: 'reports', action: 'read', scope: 'own' }),
  reportsController.listReports.bind(reportsController)
);

// List schedules (must be before /:reportId)
router.get(
  '/schedules',
  authorize({ resource: 'reports', action: 'read', scope: 'department' }),
  reportsController.listSchedules.bind(reportsController)
);

// Get schedule statistics (must be before /:reportId)
router.get(
  '/schedules/:scheduleId/stats',
  authorize({ resource: 'reports', action: 'read', scope: 'department' }),
  reportsController.getScheduleStats.bind(reportsController)
);

// Download report export file (must be before /:reportId)
router.get(
  '/:reportId/download',
  authorize({ resource: 'reports', action: 'read', scope: 'own' }),
  reportsController.downloadReport.bind(reportsController)
);

// Get report by ID (must be AFTER specific path routes)
router.get(
  '/:reportId',
  authorize({ resource: 'reports', action: 'read', scope: 'own' }),
  reportsController.getReport.bind(reportsController)
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

// (schedules GET and schedule stats routes moved above /:reportId)

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
