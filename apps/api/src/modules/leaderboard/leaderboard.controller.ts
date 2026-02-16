import { Request, Response, NextFunction } from 'express';
import { leaderboardService } from './leaderboard.service';

/**
 * LeaderboardController
 *
 * Thin HTTP handler that delegates all business logic to LeaderboardService.
 * Responsible only for extracting request parameters and formatting responses.
 */
export class LeaderboardController {
  // ---------------------------------------------------------------------------
  // GET /leaderboard/performance?period=week|month|quarter|year
  // ---------------------------------------------------------------------------

  async getPerformanceLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const period = req.query.period as string | undefined;

      const data = await leaderboardService.getPerformanceLeaderboard(tenantId, period);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /leaderboard/goals?period=week|month|quarter|year
  // ---------------------------------------------------------------------------

  async getGoalsLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const period = req.query.period as string | undefined;

      const data = await leaderboardService.getGoalsLeaderboard(tenantId, period);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /leaderboard/recognition?period=week|month|quarter|year
  // ---------------------------------------------------------------------------

  async getRecognitionLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const period = req.query.period as string | undefined;

      const data = await leaderboardService.getRecognitionLeaderboard(tenantId, period);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /leaderboard/learning?period=week|month|quarter|year
  // ---------------------------------------------------------------------------

  async getLearningLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const period = req.query.period as string | undefined;

      const data = await leaderboardService.getLearningLeaderboard(tenantId, period);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /leaderboard/departments?period=week|month|quarter|year
  // ---------------------------------------------------------------------------

  async getDepartmentScores(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId } = req.user!;
      const period = req.query.period as string | undefined;

      const data = await leaderboardService.getDepartmentScores(tenantId, period);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ---------------------------------------------------------------------------
  // GET /leaderboard/my-stats?period=week|month|quarter|year
  // ---------------------------------------------------------------------------

  async getMyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, id: currentUserId } = req.user!;
      const period = req.query.period as string | undefined;

      const data = await leaderboardService.getMyStats(tenantId, currentUserId, period);

      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
