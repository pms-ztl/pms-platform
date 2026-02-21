import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { complianceController } from './compliance.controller';
import type { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);

// Dashboard
router.get('/dashboard', authorize({ resource: 'compliance', action: 'read', scope: 'all' }), (req, res, next) => complianceController.getDashboard(req as AuthenticatedRequest, res, next));

// Policies
router.get('/policies', (req, res, next) => complianceController.listPolicies(req as AuthenticatedRequest, res, next));
router.post('/policies', authorize({ resource: 'compliance', action: 'create', scope: 'all' }), (req, res, next) => complianceController.createPolicy(req as AuthenticatedRequest, res, next));
router.put('/policies/:id', authorize({ resource: 'compliance', action: 'update', scope: 'all' }), (req, res, next) => complianceController.updatePolicy(req as AuthenticatedRequest, res, next));
router.delete('/policies/:id', authorize({ resource: 'compliance', action: 'delete', scope: 'all' }), (req, res, next) => complianceController.deletePolicy(req as AuthenticatedRequest, res, next));

// Assessments
router.get('/assessments', (req, res, next) => complianceController.listAssessments(req as AuthenticatedRequest, res, next));
router.post('/assessments', authorize({ resource: 'compliance', action: 'create', scope: 'all' }), (req, res, next) => complianceController.createAssessment(req as AuthenticatedRequest, res, next));
router.put('/assessments/:id', (req, res, next) => complianceController.updateAssessment(req as AuthenticatedRequest, res, next));

// Violations
router.get('/violations', authorize({ resource: 'compliance', action: 'read', scope: 'all' }), (req, res, next) => complianceController.listViolations(req as AuthenticatedRequest, res, next));
router.post('/violations', (req, res, next) => complianceController.createViolation(req as AuthenticatedRequest, res, next));
router.put('/violations/:id', authorize({ resource: 'compliance', action: 'update', scope: 'all' }), (req, res, next) => complianceController.updateViolation(req as AuthenticatedRequest, res, next));

// User compliance
router.get('/user/:userId', (req, res, next) => complianceController.getUserCompliance(req as AuthenticatedRequest, res, next));

// Reviews
router.get('/reviews', (req, res, next) => complianceController.listReviews(req as AuthenticatedRequest, res, next));
router.post('/reviews', (req, res, next) => complianceController.createReview(req as AuthenticatedRequest, res, next));
router.put('/reviews/:id', (req, res, next) => complianceController.updateReview(req as AuthenticatedRequest, res, next));
router.post('/reviews/:id/complete', (req, res, next) => complianceController.completeReview(req as AuthenticatedRequest, res, next));

// Deadlines
router.get('/deadlines', (req, res, next) => complianceController.listDeadlines(req as AuthenticatedRequest, res, next));

export { router as complianceRoutes };
