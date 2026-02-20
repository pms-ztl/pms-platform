import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import * as ctrl from './policies.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Static/named routes MUST be defined BEFORE /:id ──

// List policies (Tenant Admin + HR Admin)
router.get(
  '/',
  requireRoles('Tenant Admin', 'HR Admin'),
  (req, res, next) => ctrl.listPolicies(req as any, res, next)
);

// Simulate policy evaluation (Tenant Admin + HR Admin)
router.post(
  '/simulate',
  requireRoles('Tenant Admin', 'HR Admin'),
  (req, res, next) => ctrl.simulatePolicy(req as any, res, next)
);

// Create policy (Tenant Admin only)
router.post(
  '/',
  requireRoles('Tenant Admin'),
  (req, res, next) => ctrl.createPolicy(req as any, res, next)
);

// ── Parameterized routes (/:id) ──

// Get single policy (Tenant Admin + HR Admin)
router.get(
  '/:id',
  requireRoles('Tenant Admin', 'HR Admin'),
  (req, res, next) => ctrl.getPolicy(req as any, res, next)
);

// Update policy (Tenant Admin only)
router.put(
  '/:id',
  requireRoles('Tenant Admin'),
  (req, res, next) => ctrl.updatePolicy(req as any, res, next)
);

// Activate policy (Tenant Admin only)
router.post(
  '/:id/activate',
  requireRoles('Tenant Admin'),
  (req, res, next) => ctrl.activatePolicy(req as any, res, next)
);

// Deactivate policy (Tenant Admin only)
router.post(
  '/:id/deactivate',
  requireRoles('Tenant Admin'),
  (req, res, next) => ctrl.deactivatePolicy(req as any, res, next)
);

// Delete policy (Tenant Admin only)
router.delete(
  '/:id',
  requireRoles('Tenant Admin'),
  (req, res, next) => ctrl.deletePolicy(req as any, res, next)
);

export { router as policiesRoutes };
