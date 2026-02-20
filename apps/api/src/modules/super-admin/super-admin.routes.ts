import { Router } from 'express';
import { requireSuperAdmin } from './super-admin.middleware';
import { authRateLimiter } from '../../middleware';
import * as ctrl from './super-admin.controller';
import * as upgradeCtrl from '../upgrade-requests/upgrade-requests.controller';

const router = Router();

// --- Auth (no requireSuperAdmin on login/refresh/mfa) ---
router.post('/auth/login', authRateLimiter, ctrl.adminLogin);
router.post('/auth/refresh', ctrl.adminRefreshToken);
router.post('/auth/mfa/verify', ctrl.adminVerifyMfa);

// All routes below require super admin authentication
router.use(requireSuperAdmin);

router.post('/auth/logout', ctrl.adminLogout);

// --- Tenants ---
router.get('/tenants', ctrl.listTenants);
router.get('/tenants/:id', ctrl.getTenant);
router.post('/tenants', ctrl.createTenant);
router.put('/tenants/:id', ctrl.updateTenant);
router.delete('/tenants/:id', ctrl.deleteTenant);
router.post('/tenants/:id/suspend', ctrl.suspendTenant);
router.post('/tenants/:id/activate', ctrl.activateTenant);
router.get('/tenants/:id/metrics', ctrl.getTenantMetrics);
router.put('/tenants/:id/settings', ctrl.updateTenantSettings);
router.post('/tenants/:id/export', ctrl.exportTenantData);

// --- Designated Manager ---
router.get('/tenants/:id/designated-manager', ctrl.getDesignatedManager);
router.post('/tenants/:id/designated-manager', ctrl.assignDesignatedManager);

// --- Users (Cross-tenant) ---
router.get('/users', ctrl.listUsers);
router.post('/users', ctrl.createUser);
router.get('/users/:id', ctrl.getUser);
router.post('/users/:id/suspend', ctrl.suspendUser);
router.post('/users/:id/activate', ctrl.activateUser);
router.post('/users/:id/reset-password', ctrl.resetUserPassword);
router.post('/users/:id/disable-mfa', ctrl.disableUserMfa);

// --- System ---
router.get('/system/dashboard', ctrl.getDashboardStats);
router.get('/system/metrics', ctrl.getSystemMetrics);
router.get('/system/config', ctrl.getSystemConfig);
router.put('/system/config', ctrl.updateSystemConfig);
router.get('/system/health', ctrl.getSystemHealth);
router.post('/system/cache/clear', ctrl.clearCache);

// --- Audit ---
router.get('/audit', ctrl.listAuditLogs);
router.post('/audit/export', ctrl.exportAuditLogs);

// --- Billing ---
router.get('/billing', ctrl.listBilling);
router.get('/billing/revenue', ctrl.getRevenue);
router.put('/billing/tenants/:id/plan', ctrl.updateTenantPlan);
router.post('/billing/tenants/:id/invoices', ctrl.createInvoice);

// --- Security ---
router.get('/security/threats', ctrl.getSecurityThreats);
router.post('/security/ip/block', ctrl.blockIp);
router.post('/security/ip/unblock', ctrl.unblockIp);
router.get('/security/ip/blocked', ctrl.getBlockedIps);
router.get('/security/sessions', ctrl.getActiveSessions);
router.delete('/security/sessions/:id', ctrl.terminateSession);
router.delete('/security/sessions/user/:id', ctrl.terminateAllUserSessions);

// --- Upgrade Requests ---
router.get('/upgrade-requests', upgradeCtrl.listAll);
router.get('/upgrade-requests/pending-count', upgradeCtrl.getPendingCount);
router.post('/upgrade-requests/:id/approve', upgradeCtrl.approveRequest);
router.post('/upgrade-requests/:id/reject', upgradeCtrl.rejectRequest);

export { router as superAdminRoutes };
