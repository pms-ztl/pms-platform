// @ts-nocheck
import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../types';
import { careerService } from './career.service';

class CareerController {
  async getCareerPath(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user!.id;
      const data = await careerService.getCareerPath(req.tenantId!, userId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getGrowthRequirements(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await careerService.getGrowthRequirements(req.tenantId!, req.params.roleId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getRoles(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await careerService.getRoles(req.tenantId!);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }

  async getCareerGoals(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user!.id;
      const data = await careerService.getCareerGoals(req.tenantId!, userId);
      res.json({ success: true, data });
    } catch (error) { next(error); }
  }
}

export const careerController = new CareerController();
