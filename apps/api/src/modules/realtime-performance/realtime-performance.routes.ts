/**
 * Real-Time Performance Tracking Routes
 *
 * API routes for Features 1-8
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { realtimePerformanceController } from './realtime-performance.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==========================================================================
// Feature 1: Hourly Performance Tracker
// ==========================================================================

// GET /api/v1/realtime-performance/hourly - Get hourly metrics
router.get('/hourly', (req, res) => realtimePerformanceController.getHourlyMetrics(req, res));

// POST /api/v1/realtime-performance/hourly - Record hourly metrics
router.post('/hourly', (req, res) => realtimePerformanceController.recordHourlyMetrics(req, res));

// GET /api/v1/realtime-performance/snapshot - Get current performance snapshot
router.get('/snapshot', (req, res) => realtimePerformanceController.getCurrentSnapshot(req, res));

// ==========================================================================
// Feature 2: 24/7 Activity Monitor
// ==========================================================================

// POST /api/v1/realtime-performance/activity - Record activity event
router.post('/activity', (req, res) => realtimePerformanceController.recordActivity(req, res));

// GET /api/v1/realtime-performance/activity - Get activity stream
router.get('/activity', (req, res) => realtimePerformanceController.getActivityStream(req, res));

// GET /api/v1/realtime-performance/activity/summary - Get activity summary
router.get('/activity/summary', (req, res) => realtimePerformanceController.getActivitySummary(req, res));

// ==========================================================================
// Feature 3: Real-Time Goal Progress Dashboard
// ==========================================================================

// GET /api/v1/realtime-performance/goals/dashboard - Get goal progress dashboard
router.get('/goals/dashboard', (req, res) => realtimePerformanceController.getGoalDashboard(req, res));

// ==========================================================================
// Feature 4: Deadline Proximity Alert System
// ==========================================================================

// GET /api/v1/realtime-performance/deadlines/check - Check and generate deadline alerts
router.get('/deadlines/check', (req, res) => realtimePerformanceController.checkDeadlines(req, res));

// GET /api/v1/realtime-performance/deadlines/alerts - Get active deadline alerts
router.get('/deadlines/alerts', (req, res) => realtimePerformanceController.getDeadlineAlerts(req, res));

// POST /api/v1/realtime-performance/deadlines/alerts/:id/acknowledge - Acknowledge alert
router.post('/deadlines/alerts/:id/acknowledge', (req, res) => realtimePerformanceController.acknowledgeAlert(req, res));

// POST /api/v1/realtime-performance/deadlines/alerts/:id/snooze - Snooze alert
router.post('/deadlines/alerts/:id/snooze', (req, res) => realtimePerformanceController.snoozeAlert(req, res));

// ==========================================================================
// Feature 5: Live Workload Distribution Analyzer
// ==========================================================================

// GET /api/v1/realtime-performance/workload - Analyze workload
router.get('/workload', (req, res) => realtimePerformanceController.analyzeWorkload(req, res));

// GET /api/v1/realtime-performance/workload/team - Get team workload distribution
router.get('/workload/team', (req, res) => realtimePerformanceController.getTeamWorkload(req, res));

// ==========================================================================
// Feature 6: Instant Performance Anomaly Detector
// ==========================================================================

// GET /api/v1/realtime-performance/anomalies/detect - Detect anomalies
router.get('/anomalies/detect', (req, res) => realtimePerformanceController.detectAnomalies(req, res));

// ==========================================================================
// Feature 7: Real-Time Communication Sentiment Gauge
// ==========================================================================

// GET /api/v1/realtime-performance/sentiment - Analyze sentiment
router.get('/sentiment', (req, res) => realtimePerformanceController.analyzeSentiment(req, res));

// GET /api/v1/realtime-performance/sentiment/team - Get team morale
router.get('/sentiment/team', (req, res) => realtimePerformanceController.getTeamMorale(req, res));

// ==========================================================================
// Feature 8: Live Project Milestone Tracker
// ==========================================================================

// POST /api/v1/realtime-performance/milestones - Create milestone
router.post('/milestones', (req, res) => realtimePerformanceController.createMilestone(req, res));

// PATCH /api/v1/realtime-performance/milestones/:id - Update milestone
router.patch('/milestones/:id', (req, res) => realtimePerformanceController.updateMilestone(req, res));

// GET /api/v1/realtime-performance/milestones - Get milestones
router.get('/milestones', (req, res) => realtimePerformanceController.getMilestones(req, res));

// GET /api/v1/realtime-performance/milestones/timeline - Get milestone timeline
router.get('/milestones/timeline', (req, res) => realtimePerformanceController.getMilestoneTimeline(req, res));

// POST /api/v1/realtime-performance/milestones/detect - Auto-detect milestones
router.post('/milestones/detect', (req, res) => realtimePerformanceController.detectMilestones(req, res));

// ==========================================================================
// Feature 9: Activity Heatmap
// ==========================================================================

// GET /api/v1/realtime-performance/heatmap/individual - Get individual activity heatmap
router.get('/heatmap/individual', (req, res) => realtimePerformanceController.getActivityHeatmap(req, res));

// GET /api/v1/realtime-performance/heatmap/team - Get team activity heatmap
router.get('/heatmap/team', (req, res) => realtimePerformanceController.getTeamActivityHeatmap(req, res));

export default router;
