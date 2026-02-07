import { Router } from 'express';

import { authenticate } from '../../middleware/authenticate';
import { authController } from './auth.controller';

const router = Router();

// Public routes
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/mfa/verify', (req, res, next) => authController.verifyMfa(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/password/forgot', (req, res, next) => authController.initiatePasswordReset(req, res, next));
router.post('/password/reset', (req, res, next) => authController.resetPassword(req, res, next));

// Protected routes
router.post('/logout', authenticate, (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getCurrentUser(req, res, next));
router.post('/password/change', authenticate, (req, res, next) => authController.changePassword(req, res, next));

// MFA management
router.post('/mfa/setup', authenticate, (req, res, next) => authController.setupMfa(req, res, next));
router.post('/mfa/setup/verify', authenticate, (req, res, next) => authController.verifyMfaSetup(req, res, next));
router.post('/mfa/disable', authenticate, (req, res, next) => authController.disableMfa(req, res, next));

export { router as authRoutes };
