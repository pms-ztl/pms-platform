import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authorize, requireRoles } from '../../middleware/authorize';
import { avatarUpload } from '../../middleware/upload';
import { usersController } from './users.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Static/named routes MUST be defined BEFORE /:id ──

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

// Org chart – any authenticated user can view
router.get(
  '/org-chart',
  authorize(
    { resource: 'users', action: 'read', scope: 'all' },
    { resource: 'users', action: 'read', scope: 'team' },
    { resource: 'users', action: 'read', scope: 'own' },
    { roles: ['MANAGER', 'Manager', 'EMPLOYEE', 'Employee', 'HR_ADMIN', 'HR Admin', 'HR_BP', 'HR Business Partner'] }
  ),
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

// License usage info
router.get(
  '/license/usage',
  (req, res, next) => usersController.getLicenseUsage(req, res, next)
);

// Subscription info for current tenant
router.get(
  '/subscription',
  (req, res, next) => usersController.getSubscriptionInfo(req, res, next)
);

// Employee breakdown by level and department (Admin only)
router.get(
  '/breakdown',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.getEmployeeBreakdown(req, res, next)
);

// AI Access Management (Admin only, or Manager if delegated)
router.get(
  '/ai-access/stats',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.getAiAccessStats(req, res, next)
);

router.put(
  '/ai-access/bulk',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.bulkToggleAiAccess(req, res, next)
);

router.put(
  '/ai-access/delegation',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.updateAiDelegation(req, res, next)
);

// Avatar upload for current user
router.post(
  '/me/avatar',
  avatarUpload,
  (req, res, next) => usersController.uploadAvatar(req, res, next)
);

// Set AI avatar for current user
router.post(
  '/me/ai-avatar',
  (req, res, next) => usersController.setAiAvatar(req, res, next)
);

// Designated manager assignment (Tenant Admin / HR Admin only)
router.put(
  '/designated-manager',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.assignDesignatedManager(req, res, next)
);

// Toggle Super Admin access to employee details (Tenant Admin only)
router.put(
  '/super-admin-access',
  requireRoles('Tenant Admin'),
  (req, res, next) => usersController.toggleSuperAdminAccess(req, res, next)
);

// Bulk role operations (HR Admin + Tenant Admin only)
router.post(
  '/bulk-assign-role',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.bulkAssignRole(req, res, next)
);

router.post(
  '/bulk-remove-role',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.bulkRemoveRole(req, res, next)
);

// ── Collection routes ──

// User management (Admin + Manager)
router.post(
  '/',
  requireRoles('HR Admin', 'Tenant Admin', 'Manager'),
  (req, res, next) => usersController.create(req, res, next)
);

// List users
router.get(
  '/',
  authorize({ resource: 'users', action: 'read', scope: 'all' }),
  (req, res, next) => usersController.list(req, res, next)
);

// ── Parameterized routes (/:id) ──

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
  requireRoles('HR Admin', 'Tenant Admin', 'Manager'),
  (req, res, next) => usersController.reactivate(req, res, next)
);

// Archive user (preserves data, frees license seat)
router.post(
  '/:id/archive',
  requireRoles('HR Admin', 'Tenant Admin', 'Manager'),
  (req, res, next) => usersController.archive(req, res, next)
);

// Resend set-password credentials to an employee
router.post(
  '/:id/resend-credentials',
  requireRoles('HR Admin', 'Tenant Admin', 'Manager'),
  (req, res, next) => usersController.resendCredentials(req, res, next)
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

// Role assignment history for a user
router.get(
  '/:id/role-history',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.getRoleHistory(req, res, next)
);

// Avatar upload for specific user (admin only)
router.post(
  '/:id/avatar',
  requireRoles('HR Admin', 'Tenant Admin'),
  avatarUpload,
  (req, res, next) => usersController.uploadAvatar(req, res, next)
);

// Set AI avatar for specific user (admin only)
router.post(
  '/:id/ai-avatar',
  requireRoles('HR Admin', 'Tenant Admin'),
  (req, res, next) => usersController.setAiAvatar(req, res, next)
);

// Toggle AI access for a specific user (Admin or Manager if delegated)
router.put(
  '/:id/ai-access',
  requireRoles('HR Admin', 'Tenant Admin', 'Manager'),
  (req, res, next) => usersController.toggleAiAccess(req, res, next)
);

export { router as usersRoutes };
