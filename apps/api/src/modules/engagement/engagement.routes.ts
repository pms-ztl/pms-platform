import { Router } from 'express';
import { EngagementController } from './engagement.controller';
import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';

const router = Router();
const controller = new EngagementController();

// All routes require authentication
router.use(authenticate);

// All engagement routes require admin/HR/manager roles
router.use(requireRoles('SUPER_ADMIN', 'ADMIN', 'HR_ADMIN', 'TENANT_ADMIN', 'MANAGER'));

// GET /engagement/overview — Overall engagement stats
router.get('/overview', controller.getOverview.bind(controller));

// GET /engagement/dashboard — Alias for /overview (some frontend pages use this path)
router.get('/dashboard', controller.getOverview.bind(controller));

// GET /engagement/trends?months=6 — Historical engagement trend
router.get('/trends', controller.getTrends.bind(controller));

// GET /engagement/departments — Department-level engagement breakdown
router.get('/departments', controller.getDepartments.bind(controller));

// GET /engagement/at-risk?page=1&limit=20 — At-risk employees list
router.get('/at-risk', controller.getAtRisk.bind(controller));

// GET /engagement/events?limit=50&category=PARTICIPATION — Recent engagement events
router.get('/events', controller.getEvents.bind(controller));

export { router as engagementRoutes };
