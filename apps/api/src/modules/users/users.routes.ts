import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize, requireRoles } from '../../middleware/authorize';
import { avatarUpload } from '../../middleware/upload';
import { usersController } from './users.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List all available roles (for dropdowns)
router.get(
  '/roles',
  (req, res, next) => usersController.listRoles(req, res, next)
);

// List all departments (for dropdowns)
router.get(
  '/departments',
  (req, res, next) => usersController.listDepartments(req, res, next)
);

// User management (Admin only)
router.post(
  '/',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.create(req, res, next)
);

// List users
router.get(
  '/',
  authorize({ resource: 'users', action: 'read', scope: 'all' }),
  (req, res, next) => usersController.list(req, res, next)
);

// Org chart
router.get(
  '/org-chart',
  authorize({ resource: 'users', action: 'read', scope: 'all' }),
  (req, res, next) => usersController.getOrgChart(req, res, next)
);

// My direct reports
router.get(
  '/my-reports',
  (req, res, next) => usersController.getDirectReports(req, res, next)
);

// Team members for feedback/collaboration (no permissions required)
router.get(
  '/team-members',
  (req, res, next) => usersController.getTeamMembers(req, res, next)
);

// Get specific user
router.get(
  '/:id',
  authorize({ resource: 'users', action: 'read', scope: 'all' }),
  (req, res, next) => usersController.getById(req, res, next)
);

// Update user
router.put(
  '/:id',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.update(req, res, next)
);

// Deactivate user
router.post(
  '/:id/deactivate',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.deactivate(req, res, next)
);

// Reactivate user
router.post(
  '/:id/reactivate',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.reactivate(req, res, next)
);

// Delete user (permanent soft delete)
router.delete(
  '/:id',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.deleteUser(req, res, next)
);

// Get user's direct reports
router.get(
  '/:id/reports',
  authorize({ resource: 'users', action: 'read', scope: 'team' }),
  (req, res, next) => usersController.getDirectReports(req, res, next)
);

// Role management
router.post(
  '/:id/roles',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.assignRole(req, res, next)
);

router.delete(
  '/:id/roles/:roleId',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.removeRole(req, res, next)
);

// Avatar upload for current user
router.post(
  '/me/avatar',
  avatarUpload,
  (req, res, next) => usersController.uploadAvatar(req, res, next)
);

// Avatar upload for specific user (admin only)
router.post(
  '/:id/avatar',
  requireRoles('HR Admin', 'Tenant Admin'),
  avatarUpload,
  (req, res, next) => usersController.uploadAvatar(req, res, next)
);

// Set AI avatar for current user
router.post(
  '/me/ai-avatar',
  (req, res, next) => usersController.setAiAvatar(req, res, next)
);

// Set AI avatar for specific user (admin only)
router.post(
  '/:id/ai-avatar',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.setAiAvatar(req, res, next)
);

export { router as usersRoutes };
