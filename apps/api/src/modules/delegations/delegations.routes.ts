import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireRoles } from '../../middleware/authorize';
import * as ctrl from './delegations.controller';

const router = Router();

router.use(authenticate);

// List all delegations (filtered by query params: status, type, userId)
router.get(
  '/',
  requireRoles('Tenant Admin', 'HR Admin', 'Manager'),
  ctrl.listDelegations as any
);

// Get a single delegation by ID
router.get(
  '/:id',
  requireRoles('Tenant Admin', 'HR Admin', 'Manager'),
  ctrl.getDelegation as any
);

// Create a new delegation
router.post(
  '/',
  requireRoles('Tenant Admin', 'HR Admin', 'Manager'),
  ctrl.createDelegation as any
);

// Approve a pending delegation
router.post(
  '/:id/approve',
  requireRoles('Tenant Admin', 'HR Admin'),
  ctrl.approveDelegation as any
);

// Reject a pending delegation
router.post(
  '/:id/reject',
  requireRoles('Tenant Admin', 'HR Admin'),
  ctrl.rejectDelegation as any
);

// Revoke an active delegation
router.post(
  '/:id/revoke',
  requireRoles('Tenant Admin', 'HR Admin'),
  ctrl.revokeDelegation as any
);

// Get audit trail for a delegation
router.get(
  '/:id/audit',
  requireRoles('Tenant Admin', 'HR Admin'),
  ctrl.getDelegationAudit as any
);

export { router as delegationsRoutes };
