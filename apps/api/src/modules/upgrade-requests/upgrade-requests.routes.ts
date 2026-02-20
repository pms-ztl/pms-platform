import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import * as ctrl from './upgrade-requests.controller';

const router = Router();
router.use(authenticate);

// Tenant-side routes (Tenant Admin only)
router.get('/', requireRoles('Tenant Admin'), ctrl.listByTenant);
router.post('/', requireRoles('Tenant Admin'), ctrl.createRequest);
router.post('/:id/cancel', requireRoles('Tenant Admin'), ctrl.cancelRequest);

export { router as upgradeRequestsRoutes };
