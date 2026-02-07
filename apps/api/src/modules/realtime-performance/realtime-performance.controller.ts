/**
 * Real-Time Performance Tracking Controller
 *
 * REST API endpoints for Features 1-8
 */

import { Request, Response } from 'express';
import { realtimePerformanceService } from './realtime-performance.service';

export class RealtimePerformanceController {
  // ==========================================================================
  // Feature 1: Hourly Performance Tracker
  // ==========================================================================

  /**
   * GET /api/v1/realtime-performance/hourly
   * Get hourly performance metrics
   */
  async getHourlyMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const { startTime, endTime, targetUserId } = req.query;

      const effectiveUserId = targetUserId as string || userId;

      // Parse dates
      const start = startTime ? new Date(startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endTime ? new Date(endTime as string) : new Date();

      const metrics = await realtimePerformanceService.getHourlyMetrics(
        tenantId,
        effectiveUserId,
        start,
        end
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/realtime-performance/hourly
   * Record hourly performance metrics
   */
  async recordHourlyMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const metrics = req.body;

      await realtimePerformanceService.recordHourlyMetrics({
        tenantId,
        userId: metrics.userId || userId,
        metricHour: new Date(metrics.metricHour || Date.now()),
        ...metrics,
      });

      res.json({
        success: true,
        message: 'Hourly metrics recorded',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/snapshot
   * Get current performance snapshot
   */
  async getCurrentSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const { targetUserId } = req.query;

      const effectiveUserId = targetUserId as string || userId;

      const snapshot = await realtimePerformanceService.getCurrentPerformanceSnapshot(
        tenantId,
        effectiveUserId
      );

      res.json({
        success: true,
        data: snapshot,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 2: 24/7 Activity Monitor
  // ==========================================================================

  /**
   * POST /api/v1/realtime-performance/activity
   * Record an activity event
   */
  async recordActivity(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const event = req.body;

      await realtimePerformanceService.recordActivityEvent({
        tenantId,
        userId: event.userId || userId,
        eventType: event.eventType,
        eventSubtype: event.eventSubtype,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
        durationSeconds: event.durationSeconds,
        isProductive: event.isProductive,
      });

      res.json({
        success: true,
        message: 'Activity recorded',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/activity
   * Get activity stream
   */
  async getActivityStream(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const { targetUserId, limit = '50', offset = '0' } = req.query;

      const effectiveUserId = targetUserId as string || userId;

      const activities = await realtimePerformanceService.getActivityStream(
        tenantId,
        effectiveUserId,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: activities,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/activity/summary
   * Get activity summary
   */
  async getActivitySummary(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const { targetUserId, startTime, endTime } = req.query;

      const effectiveUserId = targetUserId as string || userId;
      const start = startTime ? new Date(startTime as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
      const end = endTime ? new Date(endTime as string) : new Date();

      const summary = await realtimePerformanceService.getActivitySummary(
        tenantId,
        effectiveUserId,
        start,
        end
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 3: Real-Time Goal Progress Dashboard
  // ==========================================================================

  /**
   * GET /api/v1/realtime-performance/goals/dashboard
   * Get real-time goal progress dashboard
   */
  async getGoalDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId, roles } = req.user as any;
      const { includeTeamGoals } = req.query;

      const isManager = roles?.includes('MANAGER') || roles?.includes('ADMIN');

      const dashboard = await realtimePerformanceService.getGoalProgressDashboard(
        tenantId,
        userId,
        includeTeamGoals === 'true' && isManager
      );

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 4: Deadline Proximity Alert System
  // ==========================================================================

  /**
   * GET /api/v1/realtime-performance/deadlines/check
   * Check and generate deadline alerts
   */
  async checkDeadlines(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;  // FIXED: req.user has 'id', not 'userId'

      console.log('[DEADLINES] Checking deadlines for user:', userId);
      const alerts = await realtimePerformanceService.checkDeadlineAlerts(tenantId, userId);
      console.log('[DEADLINES] Check completed successfully, found:', alerts.length, 'alerts');

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error: any) {
      console.error('[DEADLINES ERROR] Full error:', error);
      console.error('[DEADLINES ERROR] Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/deadlines/alerts
   * Get active deadline alerts
   */
  async getDeadlineAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;

      const alerts = await realtimePerformanceService.getActiveDeadlineAlerts(tenantId, userId);

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/realtime-performance/deadlines/alerts/:id/acknowledge
   * Acknowledge a deadline alert
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId, id: userId } = req.user as any;

      await realtimePerformanceService.acknowledgeDeadlineAlert(tenantId, userId, id);

      res.json({
        success: true,
        message: 'Alert acknowledged',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/realtime-performance/deadlines/alerts/:id/snooze
   * Snooze a deadline alert
   */
  async snoozeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tenantId, id: userId } = req.user as any;
      const { hours } = req.body;

      await realtimePerformanceService.snoozeDeadlineAlert(tenantId, userId, id, hours);

      res.json({
        success: true,
        message: `Alert snoozed for ${hours} hours`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 5: Live Workload Distribution Analyzer
  // ==========================================================================

  /**
   * GET /api/v1/realtime-performance/workload
   * Analyze workload for current user
   */
  async analyzeWorkload(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;  // FIXED: req.user has 'id', not 'userId'
      const { targetUserId } = req.query;

      const effectiveUserId = targetUserId as string || userId;

      console.log('[WORKLOAD] Analyzing workload for user:', effectiveUserId);
      const analysis = await realtimePerformanceService.analyzeWorkload(tenantId, effectiveUserId);
      console.log('[WORKLOAD] Analysis completed successfully');

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error: any) {
      console.error('[WORKLOAD ERROR] Full error:', error);
      console.error('[WORKLOAD ERROR] Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/workload/team
   * Get team workload distribution
   */
  async getTeamWorkload(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;

      const distribution = await realtimePerformanceService.getTeamWorkloadDistribution(
        tenantId,
        userId
      );

      res.json({
        success: true,
        data: distribution,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 6: Instant Performance Anomaly Detector
  // ==========================================================================

  /**
   * GET /api/v1/realtime-performance/anomalies/detect
   * Detect anomalies for current user
   */
  async detectAnomalies(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const { targetUserId } = req.query;

      const effectiveUserId = targetUserId as string || userId;

      const anomalies = await realtimePerformanceService.detectAnomalies(
        tenantId,
        effectiveUserId
      );

      res.json({
        success: true,
        data: anomalies,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 7: Real-Time Communication Sentiment Gauge
  // ==========================================================================

  /**
   * GET /api/v1/realtime-performance/sentiment
   * Analyze sentiment for current user
   */
  async analyzeSentiment(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;  // FIXED: req.user has 'id', not 'userId'
      const { targetUserId, periodDays = '7' } = req.query;

      const effectiveUserId = targetUserId as string || userId;

      console.log('[SENTIMENT] Analyzing sentiment for user:', effectiveUserId);
      const analysis = await realtimePerformanceService.analyzeSentiment(
        tenantId,
        effectiveUserId,
        parseInt(periodDays as string)
      );
      console.log('[SENTIMENT] Analysis completed successfully');

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error: any) {
      console.error('[SENTIMENT ERROR] Full error:', error);
      console.error('[SENTIMENT ERROR] Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/sentiment/team
   * Get team morale snapshot
   */
  async getTeamMorale(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;

      const morale = await realtimePerformanceService.getTeamMorale(tenantId, userId);

      res.json({
        success: true,
        data: morale,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 8: Live Project Milestone Tracker
  // ==========================================================================

  /**
   * POST /api/v1/realtime-performance/milestones
   * Create a milestone
   */
  async createMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const data = req.body;

      const milestone = await realtimePerformanceService.createMilestone(tenantId, {
        goalId: data.goalId,
        teamId: data.teamId,
        title: data.title,
        description: data.description,
        milestoneType: data.milestoneType || 'checkpoint',
        plannedDate: new Date(data.plannedDate),
        ownerId: data.ownerId || userId,
        dependsOn: data.dependsOn,
      });

      res.status(201).json({
        success: true,
        data: milestone,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * PATCH /api/v1/realtime-performance/milestones/:id
   * Update milestone progress
   */
  async updateMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id: userId } = req.user as any;
      const { id } = req.params;
      const update = req.body;

      const result = await realtimePerformanceService.updateMilestoneProgress(
        id,
        {
          status: update.status,
          progressPercentage: update.progressPercentage,
          actualDate: update.actualDate ? new Date(update.actualDate) : undefined,
          notes: update.notes,
        },
        userId
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/milestones
   * Get milestones
   */
  async getMilestones(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user as any;
      const { goalId, teamId } = req.query;

      if (goalId) {
        const milestones = await realtimePerformanceService.getGoalMilestones(
          tenantId,
          goalId as string
        );

        res.json({
          success: true,
          data: milestones,
        });
      } else {
        const timeline = await realtimePerformanceService.getMilestoneTimeline(
          tenantId,
          goalId as string,
          teamId as string
        );

        res.json({
          success: true,
          data: timeline,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/milestones/timeline
   * Get milestone timeline
   */
  async getMilestoneTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user as any;
      const { goalId, teamId } = req.query;

      const timeline = await realtimePerformanceService.getMilestoneTimeline(
        tenantId,
        goalId as string,
        teamId as string
      );

      res.json({
        success: true,
        data: timeline,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/realtime-performance/milestones/detect
   * Auto-detect milestones for a goal
   */
  async detectMilestones(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.user as any;
      const { goalId } = req.body;

      const detected = await realtimePerformanceService.detectMilestones(tenantId, goalId);

      res.json({
        success: true,
        data: detected,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  // ==========================================================================
  // Feature 9: Activity Heatmap
  // ==========================================================================

  /**
   * GET /api/v1/realtime-performance/heatmap/individual
   * Get individual activity heatmap
   */
  async getActivityHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const { targetUserId, startDate, endDate } = req.query;

      const effectiveUserId = targetUserId as string || userId;

      // Default: last 365 days
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);

      const heatmap = await realtimePerformanceService.getActivityHeatmap(
        tenantId,
        effectiveUserId,
        start,
        end
      );

      res.json({
        success: true,
        data: heatmap,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/realtime-performance/heatmap/team
   * Get team activity heatmap (MANAGER+ roles only)
   */
  async getTeamActivityHeatmap(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId, id: userId } = req.user as any;
      const { startDate, endDate } = req.query;

      // Default: last 365 days
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);

      const heatmap = await realtimePerformanceService.getTeamActivityHeatmap(
        tenantId,
        userId,
        start,
        end
      );

      res.json({
        success: true,
        data: heatmap,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

export const realtimePerformanceController = new RealtimePerformanceController();
