import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import { simulatorController } from './simulator.controller';

const router = Router();
router.use(authenticate);

// Only managers, HR admins, and tenant admins can run simulations
router.post(
  '/run',
  requireRoles('Manager', 'HR Admin', 'Tenant Admin', 'HR Business Partner'),
  simulatorController.runSimulation
);

export { router as simulatorRoutes };
