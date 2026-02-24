import { Request, Response, NextFunction } from 'express';
import { performanceMathService } from './performance-math.service';

/**
 * PerformanceMathController
 *
 * Thin HTTP handler that validates input, delegates to PerformanceMathService,
 * and formats responses. All business logic and Prisma queries live in the service.
 */
export class PerformanceMathController {
  /**
   * GET /api/v1/performance-math/score/:userId
   *
   * Fetches a user's goals, reviews, and feedback from the database,
   * converts them into the PerformanceInputs format, and calls
   * calculatePerformanceScore to produce a mathematically derived result.
   */
  async getUserPerformanceScore(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { userId } = req.params;

      const data = await performanceMathService.getUserPerformanceScore(tenantId, userId);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/performance-math/goal-risk/:goalId
   *
   * Fetches goal progress history, due dates, and dependency information,
   * then calls assessGoalRisk to produce a mathematical risk assessment.
   */
  async getGoalRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { goalId } = req.params;

      const data = await performanceMathService.getGoalRisk(tenantId, goalId);

      if (!data) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Goal not found' },
        });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/performance-math/team/:managerId
   *
   * Fetches all direct reports' performance data for a manager,
   * then calls calculateTeamAnalytics for statistical team-level analysis.
   */
  async getTeamAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { managerId } = req.params;

      const data = await performanceMathService.getTeamAnalytics(tenantId, managerId);

      if (!data) {
        // Return empty team state instead of 404 — no direct reports is a valid state
        return res.json({
          success: true,
          data: {
            managerId,
            teamSize: 0,
            memberZScores: [],
            teamStats: null,
            metadata: { goalsAnalyzed: 0, reviewsAnalyzed: 0, historicalPeriodsUsed: 0 },
          },
        });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/performance-math/calibrate
   *
   * Fetches all ratings for a given review cycle and applies Z-score
   * normalization to remove per-reviewer bias.
   *
   * Body: { cycleId: string }
   */
  async calibrateReviewRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { cycleId } = req.body;

      if (!cycleId) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELD', message: 'cycleId is required in request body' },
        });
      }

      const result = await performanceMathService.calibrateReviewRatings(tenantId, cycleId);

      if ('notFound' in result) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Review cycle not found' },
        });
      }

      if ('noRatings' in result) {
        return res.status(400).json({
          success: false,
          error: { code: 'NO_RATINGS', message: 'No submitted ratings found for this cycle' },
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/performance-math/goal-mapping/:goalId
   *
   * Treats child goals as "tasks" under a parent goal and applies
   * the task-to-goal mathematical mapping engine to compute composite scores,
   * velocity, risk, and per-task contribution analysis.
   */
  async getGoalTaskMapping(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { goalId } = req.params;

      const result = await performanceMathService.getGoalTaskMapping(tenantId, goalId);

      if ('notFound' in result) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Goal not found' },
        });
      }

      if ('noChildren' in result) {
        // A goal with no sub-goals is a valid state — return empty data instead of an error
        return res.status(200).json({
          success: true,
          data: null,
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/performance-math/cpis/:userId
   *
   * Computes the Comprehensive Performance Intelligence Score (CPIS) for a user.
   * Aggregates data from goals, reviews, feedback, evidence, 1-on-1s, skills,
   * development plans, and recognitions into an 8-dimensional score with
   * ML fairness analysis.
   */
  async getCPIS(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const { userId } = req.params;

      const data = await performanceMathService.getCPIS(tenantId, userId);

      if (!data) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
