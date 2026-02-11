import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { logger } from '../../utils/logger';

export class AnalyticsController {
  /**
   * GET /api/v1/analytics/dashboard
   * Get dashboard metrics
   */
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: userId, roles } = req.user!;

      const metrics = await analyticsService.getDashboardMetrics(tenantId, userId, roles);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/performance-distribution
   * Get performance rating distribution
   */
  async getPerformanceDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { cycleId } = req.query;

      const distribution = await analyticsService.getPerformanceDistribution(
        tenantId,
        cycleId as string | undefined
      );

      res.json({
        success: true,
        data: distribution,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/goal-trends
   * Get goal completion trends
   */
  async getGoalTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { months } = req.query;

      const trends = await analyticsService.getGoalCompletionTrends(
        tenantId,
        months ? parseInt(months as string) : 6
      );

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/feedback-trends
   * Get feedback trends
   */
  async getFeedbackTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { months } = req.query;

      const trends = await analyticsService.getFeedbackTrends(
        tenantId,
        months ? parseInt(months as string) : 6
      );

      res.json({
        success: true,
        data: trends,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/team-performance
   * Get team/department performance comparison
   */
  async getTeamPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, roles } = req.user!;

      // Only HR admins and admins can see org-wide team performance
      if (!roles.includes('HR_ADMIN') && !roles.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view team performance analytics',
          },
        });
      }

      const performance = await analyticsService.getTeamPerformance(tenantId);

      res.json({
        success: true,
        data: performance,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/bias-metrics
   * Get bias/fairness metrics (HR admin only)
   */
  async getBiasMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, roles } = req.user!;
      const { cycleId } = req.query;

      // Only HR admins can see bias metrics
      if (!roles.includes('HR_ADMIN') && !roles.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to view bias metrics',
          },
        });
      }

      const metrics = await analyticsService.getBiasMetrics(tenantId, cycleId as string | undefined);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/cycle/:cycleId/stats
   * Get review cycle statistics
   */
  async getCycleStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { cycleId } = req.params;

      const stats = await analyticsService.getCycleStats(tenantId, cycleId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/export/:dataType
   * Export analytics data as CSV
   */
  async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, roles } = req.user!;
      const { dataType } = req.params;

      // Only HR admins can export data
      if (!roles.includes('HR_ADMIN') && !roles.includes('ADMIN')) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to export data',
          },
        });
      }

      if (!['goals', 'reviews', 'feedback'].includes(dataType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_DATA_TYPE',
            message: 'Invalid data type. Must be goals, reviews, or feedback.',
          },
        });
      }

      const csv = await analyticsService.exportData(tenantId, dataType as 'goals' | 'reviews' | 'feedback');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${dataType}-export-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }
  // ============================================================================
  // HR Analytics Endpoints
  // ============================================================================

  /**
   * GET /api/v1/analytics/compensation
   * Compensation vs Performance analysis
   */
  async getCompensationAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;

      const data = await analyticsService.getCompensationAnalysis(tenantId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/bias
   * Bias detection analysis
   */
  async getBiasAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;

      const data = await analyticsService.getBiasAnalysis(tenantId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/analytics/normalization
   * Rating normalization analysis with z-scores
   */
  async getNormalizationAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;

      const data = await analyticsService.getNormalizationAnalysis(tenantId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
