import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import { healthController } from './health.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);
router.use(requireRoles('SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'));

// GET /health — Latest organizational health metrics
router.get('/', (req, res, next) => healthController.getLatest(req as AuthenticatedRequest, res, next));

// GET /health/history — Historical trend (query: period, limit)
router.get('/history', (req, res, next) => healthController.getHistory(req as AuthenticatedRequest, res, next));

// GET /health/departments — Department breakdown from latest metrics
router.get('/departments', (req, res, next) => healthController.getDepartments(req as AuthenticatedRequest, res, next));

export { router as healthRoutes };
