import type { Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../types';
import { ValidationError } from '../../utils/errors';
import { simulatorService } from './simulator.service';

const runSimulationSchema = z.object({
  scenarioType: z.enum([
    'rating_change',
    'promotion',
    'career_paths',
    'team_restructure',
    'budget_allocation',
  ]),
  employeeId: z.string().uuid().optional(),
  teamId:     z.string().uuid().optional(),
  parameters: z.record(z.unknown()).default({}),
});

class SimulatorController {
  async runSimulation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = runSimulationSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid simulation input', { errors: parsed.error.format() });
      }

      const result = await simulatorService.runSimulation(req.tenantId!, parsed.data as any);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const simulatorController = new SimulatorController();
